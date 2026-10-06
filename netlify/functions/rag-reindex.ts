import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { products, productEmbeddings, aiSettings } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { computeEmbedding } from './_shared/vector-engine';
import { eq } from 'drizzle-orm';

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    await requirePermission(req, 'customers:manage');
    const db = createDb();
    const now = new Date().toISOString();

    // Ambil GEMINI API key jika ada di DB / ENV
    let geminiKey = process.env.GEMINI_API_KEY || '';
    try {
      const geminiRow = await db.select().from(aiSettings).where(eq(aiSettings.provider, 'gemini')).limit(1);
      if (geminiRow[0]?.apiKey) geminiKey = geminiRow[0].apiKey;
    } catch (e) {
      // Abaikan jika tabel kosong
    }

    const items = await db.select().from(products).where(eq(products.isActive, true));
    if (!items || items.length === 0) {
      return errorResponse(404, 'Tidak ada produk aktif untuk di-indeks');
    }

    let indexedCount = 0;
    let sampleDim = 768;
    let providerUsed = 'deterministic-768';

    for (const p of items) {
      // Chunk semantik bersih (tanpa harga/stok volatil dan tanpa hardcode herbal)
      // agar vektor embedding tetap valid secara permanen
      const textChunk = `[${p.sku}] ${p.name}
Kategori: ${p.category || 'Umum'}
Deskripsi & Manfaat: ${p.description || ''}`.trim();

      const { vector, provider } = await computeEmbedding(textChunk, geminiKey);
      sampleDim = vector.length;
      providerUsed = provider;

      const embeddingId = `emb_${p.id}`;

      // Hapus data lama jika ada lalu insert baru
      await db.delete(productEmbeddings).where(eq(productEmbeddings.productId, p.id));
      await db.insert(productEmbeddings).values({
        id: embeddingId,
        productId: p.id,
        textChunk,
        embeddingJson: JSON.stringify(vector),
        metadataJson: JSON.stringify({
          name: p.name,
          sku: p.sku,
          category: p.category || 'Umum',
          price: p.price,
          stock: p.stock
        }),
        createdAt: now,
        updatedAt: now
      });

      indexedCount++;
    }

    return successResponse({
      indexedCount,
      vectorDimensions: sampleDim,
      embeddingProvider: providerUsed,
      timestamp: now
    }, `Berhasil mengindeks ${indexedCount} produk ke Vector Knowledge Base`);
  } catch (err: any) {
    if (err?.statusCode) return errorResponse(err.statusCode, err.message || 'Unauthorized');
    console.error('Error in rag-reindex:', err);
    return errorResponse(500, err?.message || 'Gagal melakukan re-index vektor');
  }
};
