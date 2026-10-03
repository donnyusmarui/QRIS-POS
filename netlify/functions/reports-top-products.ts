import { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { transactionItems, transactions, products } from '../../db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { requirePermission } from './_shared/rbac';
import { corsHeaders } from './_shared/response';

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ success: false, message: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const authError = await requirePermission(req, 'reports:view');
    if (authError) return authError;

    const db = createDb();

    const topProducts = await db.select({
      productId: transactionItems.productId,
      productName: products.name,
      totalQuantity: sql<number>`SUM(${transactionItems.quantity})`,
      totalRevenue: sql<number>`SUM(${transactionItems.subtotal})`,
    })
    .from(transactionItems)
    .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
    .innerJoin(products, eq(transactionItems.productId, products.id))
    .where(eq(transactions.status, 'paid'))
    .groupBy(transactionItems.productId, products.name)
    .orderBy(desc(sql<number>`SUM(${transactionItems.quantity})`))
    .limit(10);

    return new Response(JSON.stringify({
      success: true,
      data: topProducts
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('reports-top-products error:', error);
    return new Response(JSON.stringify({ success: false, message: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
