import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { transactions, products, customers } from '../../db/schema';
import { sql } from 'drizzle-orm';
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

    const [stats] = await db.select({
      totalRevenue: sql<number>`SUM(CASE WHEN ${transactions.status} = 'paid' THEN ${transactions.totalAmount} ELSE 0 END)`,
      totalTransactions: sql<number>`SUM(CASE WHEN ${transactions.status} = 'paid' THEN 1 ELSE 0 END)`,
      todayRevenue: sql<number>`SUM(CASE WHEN ${transactions.status} = 'paid' AND date(${transactions.createdAt}) = CURRENT_DATE THEN ${transactions.totalAmount} ELSE 0 END)`,
      todayTransactions: sql<number>`SUM(CASE WHEN ${transactions.status} = 'paid' AND date(${transactions.createdAt}) = CURRENT_DATE THEN 1 ELSE 0 END)`,
    }).from(transactions);

    const [productsCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(products);
    const [customersCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(customers);

    return successResponse({
      totalRevenue: stats?.totalRevenue || 0,
      totalTransactions: stats?.totalTransactions || 0,
      totalProducts: productsCount?.count || 0,
      totalCustomers: customersCount?.count || 0,
      todayRevenue: stats?.todayRevenue || 0,
      todayTransactions: stats?.todayTransactions || 0,
    });
  } catch (error: any) {
    console.error('reports-summary error:', error);
    return errorResponse(500, error.message || 'Internal Server Error');
  }
};
