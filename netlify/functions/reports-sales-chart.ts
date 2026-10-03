import { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { transactions } from '../../db/schema';
import { eq, sql, and } from 'drizzle-orm';
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

    const url = new URL(req.url);
    const daysParam = url.searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 7;

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
        sql`date(${transactions.createdAt}) >= date('now', '-' || ${days} || ' days')`
      )
    )
    .groupBy(sql`date(${transactions.createdAt})`)
    .orderBy(sql`date(${transactions.createdAt})`);

    return new Response(JSON.stringify({
      success: true,
      data: chartData
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('reports-sales-chart error:', error);
    return new Response(JSON.stringify({ success: false, message: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
