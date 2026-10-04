import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { products } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const batchItemSchema = z.object({
  name: z.string().min(2, 'Nama produk minimal 2 karakter'),
  sku: z.string().min(1, 'SKU wajib diisi'),
  price: z.number().positive('Harga harus berupa angka positif'),
  stock: z.number().min(0, 'Stok minimal 0'),
  category: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const batchUploadSchema = z.object({
  items: z.array(batchItemSchema).min(1, 'Minimal 1 produk untuk diimpor'),
});

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    await requirePermission(req, 'products:write');
  } catch (error: any) {
    return errorResponse(error.statusCode || 401, error.message || 'Unauthorized');
  }

  try {
    const body = await req.json();
    const parseResult = batchUploadSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(400, 'Validasi gagal: ' + parseResult.error.errors.map(e => e.message).join(', '));
    }

    const { items } = parseResult.data;
    const db = createDb();
    const now = new Date().toISOString();

    let insertedCount = 0;
    let updatedCount = 0;
    const errors: Array<{ sku: string; error: string }> = [];

    for (const item of items) {
      try {
        const skuTrimmed = item.sku.trim().toUpperCase();
        const existing = await db
          .select()
          .from(products)
          .where(eq(products.sku, skuTrimmed))
          .limit(1);

        if (existing.length > 0) {
          // Update existing product
          await db
            .update(products)
            .set({
              name: item.name.trim(),
              price: item.price,
              stock: item.stock,
              category: item.category?.trim() || null,
              imageUrl: item.imageUrl?.trim() || null,
              description: item.description?.trim() || null,
              isActive: true,
              updatedAt: now,
            })
            .where(eq(products.id, existing[0].id));
          updatedCount++;
        } else {
          // Insert new product
          await db.insert(products).values({
            id: crypto.randomUUID(),
            name: item.name.trim(),
            sku: skuTrimmed,
            price: item.price,
            stock: item.stock,
            category: item.category?.trim() || null,
            imageUrl: item.imageUrl?.trim() || null,
            description: item.description?.trim() || null,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
          insertedCount++;
        }
      } catch (err: any) {
        errors.push({ sku: item.sku, error: err.message || 'Gagal menyimpan baris' });
      }
    }

    return successResponse({
      total: items.length,
      insertedCount,
      updatedCount,
      errorCount: errors.length,
      errors: errors.slice(0, 10), // Limit error preview to first 10
    }, `Berhasil memproses ${insertedCount + updatedCount} produk (${insertedCount} baru, ${updatedCount} diperbarui)`);

  } catch (error: any) {
    console.error('Error batch uploading products:', error);
    return errorResponse(500, error.message || 'Internal Server Error');
  }
};
