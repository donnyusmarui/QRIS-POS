import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { productEmbeddings, products, aiSettings } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { computeEmbedding, cosineSimilarity } from './_shared/vector-engine';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(1),
  topK: z.number().min(1).max(10).optional().default(3),
  threshold: z.number().min(0).max(1).optional().default(0.2)
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
    const { query, topK, threshold } = parsed.data;

    const db = createDb();

    // Cek Gemini Key
    let geminiKey = process.env.GEMINI_API_KEY || '';
    try {
      const geminiRow = await db.select().from(aiSettings).where(eq(aiSettings.provider, 'gemini')).limit(1);
      if (geminiRow[0]?.apiKey) geminiKey = geminiRow[0].apiKey;
    } catch (e) {
      // Ignored
    }

    const allEmbeddings = await db.select().from(productEmbeddings);
    if (!allEmbeddings || allEmbeddings.length === 0) {
      return successResponse({ results: [], totalIndexed: 0 }, 'Vector knowledge base belum diindeks');
    }

    const { vector: queryVec } = await computeEmbedding(query, geminiKey);

    const scored = allEmbeddings.map((item) => {
      let vecItem: number[] = [];
      try {
        vecItem = JSON.parse(item.embeddingJson);
      } catch (e) {
        vecItem = [];
      }
      const score = cosineSimilarity(queryVec, vecItem);
      return {
        id: item.id,
        productId: item.productId,
        textChunk: item.textChunk,
        metadata: item.metadataJson ? JSON.parse(item.metadataJson) : null,
        score: Number(score.toFixed(4))
      };
    });

    const filtered = scored
      .filter((s) => s.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    // Ambil detail produk asli dari database
    const productIds = filtered.map((f) => f.productId);
    let fullProducts: any[] = [];
    if (productIds.length > 0) {
      fullProducts = await db.select().from(products).where(inArray(products.id, productIds));
    }

    const results = filtered.map((f) => {
      const prod = fullProducts.find((p) => p.id === f.productId);
      return {
        ...f,
        product: prod || null
      };
    });

    return successResponse({
      query,
      results,
      totalIndexed: allEmbeddings.length
    });
  } catch (err: any) {
    console.error('Error in rag-search:', err);
    return errorResponse(500, err?.message || 'Gagal mencari vektor semantik');
  }
};
