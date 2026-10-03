import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { transactions } from '../../db/schema';
import { eq, sql, and } from 'drizzle-orm';
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
    const url = new URL(req.url);
    const daysParam = url.searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const db = createDb();

    const chartData = await db.select({
      date: sql<string>`date(${transactions.createdAt})`,
      revenue: sql<number>`SUM(${transactions.totalAmount})`,
      transactions: sql<number>`COUNT(${transactions.id})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.status, 'paid'),
        sql`date(${transactions.createdAt}) >= ${startDateStr}`
      )
    )
    .groupBy(sql`date(${transactions.createdAt})`)
    .orderBy(sql`date(${transactions.createdAt})`);

    return successResponse(chartData);
  } catch (error: any) {
    console.error('reports-sales-chart error:', error);
    return errorResponse(500, error.message || 'Internal Server Error');
  }
};
