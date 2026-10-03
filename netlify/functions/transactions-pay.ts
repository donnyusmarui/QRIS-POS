import { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { transactions } from '../../db/schema';
import { corsHeaders, successResponse, errorResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

const payTransactionSchema = z.object({
  transactionId: z.string()
});

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify(errorResponse('Method Not Allowed')), { status: 405, headers: corsHeaders });
  }

  const authResult = await requirePermission(req, 'transactions:create');
  if (!authResult.success) {
    return new Response(JSON.stringify(errorResponse(authResult.error || 'Unauthorized')), { status: authResult.status || 401, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { transactionId } = payTransactionSchema.parse(body);

    const db = createDb();
    
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, transactionId));
    
    if (!transaction) {
      return new Response(JSON.stringify(errorResponse('Transaction not found')), { status: 404, headers: corsHeaders });
    }

    if (transaction.status === 'paid') {
      return new Response(JSON.stringify(successResponse(null, 'Transaction already paid')), { status: 200, headers: corsHeaders });
    }

    await db.update(transactions)
      .set({ status: 'paid', updatedAt: new Date() })
      .where(eq(transactions.id, transactionId));

    return new Response(JSON.stringify({
      success: true,
      message: 'Transaction paid successfully'
    }), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(errorResponse('Validation error', error.errors)), { status: 400, headers: corsHeaders });
    }
    console.error('Error paying transaction:', error);
    return new Response(JSON.stringify(errorResponse('Internal server error')), { status: 500, headers: corsHeaders });
  }
};
