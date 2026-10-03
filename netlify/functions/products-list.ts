import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { products } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { eq, like, desc, and, count, or } from 'drizzle-orm';

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'GET') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    await requirePermission(req, 'products:read');
  } catch (error: any) {
    return errorResponse(error.statusCode || 401, error.message || 'Unauthorized');
  }

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const search = url.searchParams.get('search');
    const category = url.searchParams.get('category');
    const showInactive = url.searchParams.get('showInactive') === 'true';

    const db = createDb();
    const conditions = [];

    if (!showInactive) {
      conditions.push(eq(products.isActive, true));
    }
    if (search) {
      conditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.sku, `%${search}%`)
        )
      );
    }
    if (category) {
      conditions.push(eq(products.category, category));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (page - 1) * pageSize;

    const [totalResult] = await db.select({ count: count() }).from(products).where(whereClause);
    const total = totalResult.count;

    const items = await db.select()
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.createdAt))
      .limit(pageSize)
      .offset(offset);

    return new Response(
      JSON.stringify({
        success: true,
        data: items,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
    );

  } catch (error: any) {
    console.error('Error listing products:', error);
    return errorResponse(500, 'Internal Server Error');
  }
};
