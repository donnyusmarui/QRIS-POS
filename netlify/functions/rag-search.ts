import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { productEmbeddings, products, aiSettings } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { computeEmbedding, cosineSimilarity, normalizeSkuOrText } from './_shared/vector-engine';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(1),
  topK: z.number().min(1).max(10).optional(),
  limit: z.number().min(1).max(10).optional(),
  threshold: z.number().min(0).max(1).optional().default(0.15),
  inStockOnly: z.boolean().optional().default(true)
});

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    const body = await req.json();
    const parsed = searchSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Query tidak boleh kosong');
    }
    const { query, threshold, inStockOnly } = parsed.data;
    const effectiveTopK = parsed.data.topK || parsed.data.limit || 3;

    const db = createDb();

    // Cek Gemini Key untuk semantic embedding
    let geminiKey = process.env.GEMINI_API_KEY || '';
    try {
      const geminiRow = await db.select().from(aiSettings).where(eq(aiSettings.provider, 'gemini')).limit(1);
      if (geminiRow[0]?.apiKey) geminiKey = geminiRow[0].apiKey;
    } catch (e) {
      // Ignored
    }

    // 1. Ambil data produk aktif langsung dari DB (Single Source of Truth)
    const activeProducts = await db.select().from(products).where(eq(products.isActive, true));
    if (!activeProducts || activeProducts.length === 0) {
      return successResponse({ results: [], totalIndexed: 0 }, 'Tidak ada produk aktif dalam katalog');
    }

    const productMap = new Map<string, any>();
    for (const p of activeProducts) {
      productMap.set(p.id, p);
    }

    // 2. Ambil semua embedding yang tersimpan
    const allEmbeddings = await db.select().from(productEmbeddings);
    if (!allEmbeddings || allEmbeddings.length === 0) {
      return successResponse({ results: [], totalIndexed: 0 }, 'Vector knowledge base belum diindeks');
    }

    // 3. Hitung query vector
    const { vector: queryVec } = await computeEmbedding(query, geminiKey);

    // 4. Persiapan pencarian leksikal & SKU
    const normQuery = normalizeSkuOrText(query);
    const queryTokens = query.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 2);

    const scoredItems: any[] = [];

    for (const item of allEmbeddings) {
      const liveProduct = productMap.get(item.productId);
      // Hard guard: jika produk sudah non-aktif di master data, abaikan
      if (!liveProduct) continue;

      // Filter stok: jika inStockOnly aktif dan stok <= 0, abaikan
      if (inStockOnly && Number(liveProduct.stock) <= 0) continue;

      let vecItem: number[] = [];
      try {
        vecItem = JSON.parse(item.embeddingJson);
      } catch (e) {
        vecItem = [];
      }

      // A. Skor Vektor Semantik (Cosine Similarity)
      const vectorScore = cosineSimilarity(queryVec, vecItem);

      // B. Skor Leksikal & SKU Matcher
      let lexicalBonus = 0;
      let isExactSku = false;
      const normSku = normalizeSkuOrText(liveProduct.sku);
      const prodNameLower = (liveProduct.name || '').toLowerCase();
      const prodDescLower = (liveProduct.description || '').toLowerCase();

      // 1. Cek kecocokan SKU eksak atau parsial
      if (normSku && normQuery) {
        if (normSku === normQuery || normQuery.includes(normSku)) {
          isExactSku = true;
          lexicalBonus += 0.6;
        } else if (normSku.includes(normQuery) && normQuery.length >= 3) {
          lexicalBonus += 0.35;
        }
      }

      // 2. Cek kecocokan nama produk
      if (prodNameLower.includes(query.toLowerCase())) {
        lexicalBonus += 0.3;
      }

      // 3. Cek overlap token
      let tokenMatches = 0;
      for (const token of queryTokens) {
        if (prodNameLower.includes(token)) tokenMatches += 1;
        else if (prodDescLower.includes(token)) tokenMatches += 0.5;
      }
      if (queryTokens.length > 0) {
        lexicalBonus += Math.min(0.3, (tokenMatches / queryTokens.length) * 0.3);
      }

      // C. Kombinasi Skor Hibrida
      let finalScore = (vectorScore * 0.55) + (Math.min(1.0, lexicalBonus) * 0.45);
      if (isExactSku) {
        finalScore = Math.max(finalScore, 0.95);
      }
      finalScore = Number(Math.min(1.0, Math.max(0, finalScore)).toFixed(4));

      if (finalScore >= threshold) {
        scoredItems.push({
          id: item.id,
          productId: item.productId,
          textChunk: item.textChunk,
          metadata: {
            name: liveProduct.name,
            sku: liveProduct.sku,
            category: liveProduct.category,
            price: liveProduct.price,
            stock: liveProduct.stock
          },
          score: finalScore,
          vectorScore: Number(vectorScore.toFixed(4)),
          product: liveProduct
        });
      }
    }

    // 5. Urutkan berdasarkan finalScore tertinggi dan ambil Top-K
    const results = scoredItems
      .sort((a, b) => b.score - a.score)
      .slice(0, effectiveTopK);

    return successResponse({
      query,
      results,
      totalIndexed: allEmbeddings.length,
      filteredActiveCount: activeProducts.length
    });
  } catch (err: any) {
    console.error('Error in rag-search:', err);
    return errorResponse(500, err?.message || 'Gagal mencari vektor semantik');
  }
};
