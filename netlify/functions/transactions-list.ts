import { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { transactions, transactionItems } from '../../db/schema';
import { corsHeaders, successResponse, errorResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { eq, desc, and, count } from 'drizzle-orm';

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify(errorResponse('Method Not Allowed')), { status: 405, headers: corsHeaders });
  }

  const authResult = await requirePermission(req, 'transactions:create');
  if (!authResult.success) {
    return new Response(JSON.stringify(errorResponse(authResult.error || 'Unauthorized')), { status: authResult.status || 401, headers: corsHeaders });
  }

  const user = authResult.user;
  
  // Check if user has read_all
  const readAllAuth = await requirePermission(req, 'transactions:read_all');
  const hasReadAll = readAllAuth.success;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const statusParam = url.searchParams.get('status');

    const offset = (page - 1) * pageSize;
    const db = createDb();

    let whereClause = undefined;
    
    if (!hasReadAll) {
      whereClause = eq(transactions.userId, user.id);
    }
    
    if (statusParam) {
      const statusCondition = eq(transactions.status, statusParam);
      whereClause = whereClause ? and(whereClause, statusCondition) : statusCondition;
    }

    const [totalResult] = await db.select({ count: count() }).from(transactions).where(whereClause);
    const total = totalResult.count;
    const totalPages = Math.ceil(total / pageSize);

    const txs = await db.select()
      .from(transactions)
      .where(whereClause)
      .orderBy(desc(transactions.createdAt))
      .limit(pageSize)
      .offset(offset);

    // Fetch items for these transactions
    const result = [];
    for (const tx of txs) {
      const items = await db.select().from(transactionItems).where(eq(transactionItems.transactionId, tx.id));
      result.push({ ...tx, items });
    }

    return new Response(JSON.stringify({
      success: true,
      data: result,
      pagination: { page, pageSize, total, totalPages }
    }), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Error listing transactions:', error);
    return new Response(JSON.stringify(errorResponse('Internal server error')), { status: 500, headers: corsHeaders });
  }
};
