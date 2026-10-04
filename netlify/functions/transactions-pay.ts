import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { transactions } from '../../db/schema';
import { corsHeaders, successResponse, errorResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

const payTransactionSchema = z.object({
  transactionId: z.string(),
  paymentMethod: z.enum(['qris', 'transfer', 'gopay', 'cash']).optional(),
});

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  if (req.headers.get('authorization')) {
    try {
      await requirePermission(req, 'transactions:create');
    } catch {
      // Optional: ignore for customer self-pay
    }
  }

  try {
    const body = await req.json();
    const { transactionId, paymentMethod } = payTransactionSchema.parse(body);

    const db = createDb();
    
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, transactionId));
    
    if (!transaction) {
      return errorResponse(404, 'Transaction not found');
    }

    if (transaction.status === 'paid') {
      return successResponse(null, 'Transaction already paid');
    }

    await db.update(transactions)
      .set({
        status: 'paid',
        ...(paymentMethod ? { paymentMethod } : {}),
      })
      .where(eq(transactions.id, transactionId));

    return successResponse(null, 'Transaction paid successfully');

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, error.errors.map(e => e.message).join(', '));
    }
    console.error('Error paying transaction:', error);
    return errorResponse(500, error.message || 'Internal server error');
  }
};
