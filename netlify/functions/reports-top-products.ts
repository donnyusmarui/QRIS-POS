import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { transactionItems, transactions, products } from '../../db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { requirePermission } from './_shared/rbac';
import { corsHeaders, successResponse, errorResponse } from './_shared/response';

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(), status: 204 });
  }

  if (req.method !== 'GET') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    await requirePermission(req, 'reports:view');
  } catch (error: any) {
    return errorResponse(error.statusCode || 401, error.message || 'Unauthorized');
  }

  try {
    const db = createDb();

    const topProducts = await db.select({
      productId: transactionItems.productId,
      productName: products.name,
      totalQty: sql<number>`SUM(${transactionItems.quantity})`,
      totalRevenue: sql<number>`SUM(${transactionItems.subtotal})`,
    })
    .from(transactionItems)
    .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
    .innerJoin(products, eq(transactionItems.productId, products.id))
    .where(eq(transactions.status, 'paid'))
    .groupBy(transactionItems.productId, products.name)
    .orderBy(desc(sql<number>`SUM(${transactionItems.quantity})`))
    .limit(10);

    return successResponse(topProducts);
  } catch (error: any) {
    console.error('reports-top-products error:', error);
    return errorResponse(500, error.message || 'Internal Server Error');
  }
};
