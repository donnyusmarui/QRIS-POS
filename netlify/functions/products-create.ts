import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { products } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(1),
  price: z.number().positive(),
  stock: z.number().min(0),
  category: z.string().optional(),
  imageUrl: z.string().url().optional()
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
    const parseResult = createProductSchema.safeParse(body);
    
    if (!parseResult.success) {
      return errorResponse(400, 'Invalid input: ' + parseResult.error.message);
    }
    
    const data = parseResult.data;
    const db = createDb();
    
    const id = crypto.randomUUID();
    
    const newProduct = {
      id,
      name: data.name,
      sku: data.sku,
      price: data.price,
      stock: data.stock,
      category: data.category,
      imageUrl: data.imageUrl,
    };
    
    try {
      const [inserted] = await db.insert(products).values(newProduct).returning();
      return successResponse(inserted, 'Product created successfully');
    } catch (dbError: any) {
      if (dbError.message?.includes('UNIQUE constraint failed: products.sku') || dbError.code === 'SQLITE_CONSTRAINT') {
        return errorResponse(409, 'Product with this SKU already exists');
      }
      throw dbError;
    }
    
  } catch (error: any) {
    console.error('Error creating product:', error);
    return errorResponse(500, 'Internal Server Error');
  }
};
