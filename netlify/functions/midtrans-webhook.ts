import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { transactions, transactionItems, products, inventoryLog, marketingCampaigns, marketingTrackingLogs } from '../../db/schema';
import { corsHeaders, successResponse, errorResponse } from './_shared/response';
import { verifyMidtransSignature } from './_shared/midtrans';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    const body = await req.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      payment_type,
    } = body;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return errorResponse(400, 'Payload Midtrans tidak lengkap');
    }

    // 1. Verifikasi Keaslian Notifikasi (SHA-512 Signature Key)
    const isValidSignature = verifyMidtransSignature({
      orderId: order_id,
      statusCode: status_code,
      grossAmount: gross_amount,
      signatureKey: signature_key,
    });

    if (!isValidSignature) {
      console.warn(`[Midtrans Webhook Security Alert]: Invalid signature key for order ${order_id}`);
      return errorResponse(403, 'Signature key tidak valid');
    }

    const db = createDb();

    // 2. Ambil Transaksi dari Database
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, order_id));

    if (!transaction) {
      return errorResponse(404, `Transaksi dengan ID ${order_id} tidak ditemukan`);
    }

    // Jika transaksi sudah lunas sebelumnya (idempotency check)
    if (transaction.status === 'paid') {
      return successResponse({ order_id, status: 'already_paid' }, 'Transaksi sudah berstatus lunas');
    }

    // 3. Evaluasi Status Pembayaran Midtrans
    const isSuccess =
      transaction_status === 'settlement' ||
      (transaction_status === 'capture' && fraud_status === 'accept');

    const isFailure =
      transaction_status === 'expire' ||
      transaction_status === 'cancel' ||
      transaction_status === 'deny';

    if (isSuccess) {
      // A. Update Status Menjadi 'paid'
      await db
        .update(transactions)
        .set({
          status: 'paid',
          paymentMethod: payment_type || transaction.paymentMethod,
        })
        .where(eq(transactions.id, order_id));

      // B. Eksekusi Pemotongan Stok Fisik (Safe Post-Payment Deduction)
      const items = await db
        .select()
        .from(transactionItems)
        .where(eq(transactionItems.transactionId, order_id));

      for (const item of items) {
        const [prod] = await db
          .select()
          .from(products)
          .where(eq(products.id, item.productId));

        if (prod) {
          await db
            .update(products)
            .set({
              stock: Math.max(0, prod.stock - item.quantity),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(products.id, item.productId));

          await db.insert(inventoryLog).values({
            id: crypto.randomUUID(),
            productId: item.productId,
            changeQty: -item.quantity,
            reason: `Midtrans Settlement #${order_id.slice(0, 8)}`,
            createdBy: transaction.userId,
          });
        }
      }

      // C. Marketing Campaign Revenue Attribution
      if (transaction.notes) {
        try {
          let campaignId: string | null = null;
          const campMatch = transaction.notes.match(/camp_id:([a-zA-Z0-9_-]+)/);
          const utmMatch = transaction.notes.match(/utm_camp:([a-zA-Z0-9_-]+)/);
          if (campMatch && campMatch[1]) {
            campaignId = campMatch[1];
          } else if (utmMatch && utmMatch[1]) {
            const [found] = await db
              .select()
              .from(marketingCampaigns)
              .where(eq(marketingCampaigns.utmCampaign, utmMatch[1]));
            if (found) campaignId = found.id;
          }

          if (campaignId) {
            const paidAmount = Number(gross_amount) || transaction.totalAmount;
            const nowStr = new Date().toISOString();
            await db
              .update(marketingCampaigns)
              .set({
                revenueAttributed: sql`${marketingCampaigns.revenueAttributed} + ${paidAmount}`,
                checkoutCount: sql`${marketingCampaigns.checkoutCount} + 1`,
                updatedAt: nowStr,
              })
              .where(eq(marketingCampaigns.id, campaignId));

            await db.insert(marketingTrackingLogs).values({
              id: 'trk_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12),
              campaignId,
              utmSource: 'midtrans_settlement',
              utmCampaign: utmMatch ? utmMatch[1] : null,
              eventType: 'paid',
              metadata: JSON.stringify({ order_id, gross_amount, payment_type }),
              createdAt: nowStr,
            });
            console.log(`[Marketing Attribution]: Revenue Rp ${paidAmount} attributed to campaign ${campaignId}`);
          }
        } catch (attrErr) {
          console.warn('[Marketing Attribution Webhook Warning]:', attrErr);
        }
      }

      console.log(`[Midtrans Webhook]: Transaksi ${order_id} lunas & stok berhasil dipotong.`);
      return successResponse({ order_id, status: 'paid' }, 'Pembayaran berhasil dikonfirmasi');
    } else if (isFailure) {
      await db
        .update(transactions)
        .set({
          status: 'cancelled',
        })
        .where(eq(transactions.id, order_id));

      console.log(`[Midtrans Webhook]: Transaksi ${order_id} dibatalkan/kadaluarsa.`);
      return successResponse({ order_id, status: 'cancelled' }, 'Transaksi dibatalkan');
    }

    return successResponse({ order_id, status: transaction_status }, 'Status notifikasi tercatat');
  } catch (err: any) {
    console.error('[Midtrans Webhook Error]:', err);
    return errorResponse(500, err.message || 'Internal server error saat memproses webhook');
  }
};
