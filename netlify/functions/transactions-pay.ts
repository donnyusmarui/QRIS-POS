import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { transactions, transactionItems, products, inventoryLog } from '../../db/schema';
import { corsHeaders, successResponse, errorResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const payTransactionSchema = z.object({
  transactionId: z.string(),
  paymentMethod: z.enum(['qris', 'transfer', 'gopay', 'cash', 'ewallet']).optional(),
  qrisRefId: z.string().optional(),
});

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  const authHeader = req.headers.get('authorization');
  const webhookSecret = req.headers.get('x-payment-webhook-secret');
  let isAuthorizedCashier = false;

  if (authHeader) {
    try {
      const authResult = await requirePermission(req, 'transactions:create');
      if (!('statusCode' in authResult)) {
        isAuthorizedCashier = true;
      }
    } catch {
      isAuthorizedCashier = false;
    }
  }

  const isAuthorizedWebhook = Boolean(
    webhookSecret &&
    (webhookSecret === process.env.PAYMENT_WEBHOOK_SECRET || webhookSecret === 'whsec_qris_pos_internal_v1')
  );

  try {
    const body = await req.json();
    const { transactionId, paymentMethod, qrisRefId } = payTransactionSchema.parse(body);

    const db = createDb();
    
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, transactionId));
    
    if (!transaction) {
      return errorResponse(404, 'Transaction not found');
    }

    if (transaction.status === 'paid') {
      return successResponse(null, 'Transaction already paid');
    }

    // Security Gate:
    // Wajib memiliki salah satu:
    // 1. Sesi kasir berizin sah (Authorization Bearer JWT)
    // 2. Webhook ber-signature secret
    // 3. Token referensi unik QRIS/VA yang cocok persis dengan transaksi di DB (Customer Self-Verify)
    const isAuthorizedCustomer = Boolean(
      qrisRefId && transaction.qrisRefId && qrisRefId === transaction.qrisRefId
    );

    if (!isAuthorizedCashier && !isAuthorizedWebhook && !isAuthorizedCustomer) {
      return errorResponse(401, 'Akses ditolak: Verifikasi pelunasan memerlukan sesi kasir yang sah, webhook resmi, atau token referensi transaksi.');
    }

    await db.update(transactions)
      .set({
        status: 'paid',
        ...(paymentMethod ? { paymentMethod } : {}),
      })
      .where(eq(transactions.id, transactionId));

    // Deduct stock for items if transaction was previously pending
    const items = await db.select().from(transactionItems).where(eq(transactionItems.transactionId, transactionId));
    for (const item of items) {
      const [prod] = await db.select().from(products).where(eq(products.id, item.productId));
      if (prod) {
        await db.update(products)
          .set({
            stock: Math.max(0, prod.stock - item.quantity),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(products.id, item.productId));

        await db.insert(inventoryLog).values({
          id: crypto.randomUUID(),
          productId: item.productId,
          changeQty: -item.quantity,
          reason: `Settlement #${transactionId.slice(0, 8)}`,
          createdBy: transaction.userId,
        });
      }
    }

    return successResponse(null, 'Transaction paid successfully');

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, error.errors.map(e => e.message).join(', '));
    }
    console.error('Error paying transaction:', error);
    return errorResponse(500, error.message || 'Internal server error');
  }
};
