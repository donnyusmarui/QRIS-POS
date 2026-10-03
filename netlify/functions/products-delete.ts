import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { products } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { eq, sql } from 'drizzle-orm';

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'DELETE') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    await requirePermission(req, 'products:delete');
  } catch (error: any) {
    return errorResponse(error.statusCode || 401, error.message || 'Unauthorized');
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return errorResponse(400, 'Product ID is required');
    }

    const db = createDb();
    
    const [updated] = await db.update(products)
      .set({ 
        isActive: false, 
        updatedAt: sql`(datetime('now'))` 
      })
      .where(eq(products.id, id))
      .returning();
      
    if (!updated) {
      return errorResponse(404, 'Product not found');
    }
    
    return successResponse(null, 'Product deleted successfully');
    
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return errorResponse(500, 'Internal Server Error');
  }
};
