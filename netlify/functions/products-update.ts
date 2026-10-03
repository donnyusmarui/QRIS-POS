import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { products } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  sku: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  stock: z.number().min(0).optional(),
  category: z.string().optional(),
  imageUrl: z.string().url().optional()
});

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'PUT') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    await requirePermission(req, 'products:write');
  } catch (error: any) {
    return errorResponse(error.statusCode || 401, error.message || 'Unauthorized');
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return errorResponse(400, 'Product ID is required');
    }

    const body = await req.json();
    const parseResult = updateProductSchema.safeParse(body);
    
    if (!parseResult.success) {
      return errorResponse(400, 'Invalid input: ' + parseResult.error.message);
    }
    
    const db = createDb();
    
    const updateData = {
      ...parseResult.data,
      updatedAt: sql`(datetime('now'))`
    };
    
    try {
      const [updated] = await db.update(products)
        .set(updateData)
        .where(eq(products.id, id))
        .returning();
        
      if (!updated) {
        return errorResponse(404, 'Product not found');
      }
      
      return successResponse(updated, 'Product updated successfully');
    } catch (dbError: any) {
      if (dbError.message?.includes('UNIQUE constraint failed: products.sku') || dbError.code === 'SQLITE_CONSTRAINT') {
        return errorResponse(409, 'Product with this SKU already exists');
      }
      throw dbError;
    }
    
  } catch (error: any) {
    console.error('Error updating product:', error);
    return errorResponse(500, 'Internal Server Error');
  }
};
