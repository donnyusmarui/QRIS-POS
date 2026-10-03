import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { transactions, transactionItems } from '../../db/schema';
import { corsHeaders, errorResponse } from './_shared/response';
import { requirePermission, hasPermission } from './_shared/rbac';
import { eq, desc, and, count } from 'drizzle-orm';

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'GET') {
    return errorResponse(405, 'Method Not Allowed');
  }

  let user: any;
  try {
    const authResult = await requirePermission(req, 'transactions:create');
    user = authResult.user;
  } catch (error: any) {
    return errorResponse(error.statusCode || 401, error.message || 'Unauthorized');
  }

  const hasReadAll = hasPermission(user.roles, 'transactions:read_all');

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const statusParam = url.searchParams.get('status');

    const offset = (page - 1) * pageSize;
    const db = createDb();

    const conditions: any[] = [];
    if (!hasReadAll) {
      conditions.push(eq(transactions.userId, user.id));
    }
    if (statusParam && (statusParam === 'pending' || statusParam === 'paid' || statusParam === 'voided')) {
      conditions.push(eq(transactions.status, statusParam));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [totalRes] = await db
      .select({ count: count() })
      .from(transactions)
      .where(whereClause);
      
    const total = totalRes ? totalRes.count : 0;
    const totalPages = Math.ceil(total / pageSize);

    const txs = await db
      .select()
      .from(transactions)
      .where(whereClause)
      .orderBy(desc(transactions.createdAt))
      .limit(pageSize)
      .offset(offset);

    const result = [];
    for (const tx of txs) {
      const items = await db.select().from(transactionItems).where(eq(transactionItems.transactionId, tx.id));
      result.push({ ...tx, items });
    }

    return new Response(JSON.stringify({
      success: true,
      data: result,
      pagination: { page, pageSize, total, totalPages }
    }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });

  } catch (error: any) {
    console.error('Error listing transactions:', error);
    return errorResponse(500, error.message || 'Internal server error');
  }
};
