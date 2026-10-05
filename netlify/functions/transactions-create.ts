import { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { transactions, transactionItems, products, inventoryLog } from '../../db/schema';
import { corsHeaders, successResponse, errorResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { chargeMidtransQris, chargeMidtransBankTransfer } from './_shared/midtrans';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const createTransactionSchema = z.object({
  customerId: z.string().optional(),
  paymentMethod: z.enum(['cash', 'qris', 'transfer', 'gopay', 'ewallet']),
  bank: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    price: z.number(),
    quantity: z.number()
  })).min(1),
  notes: z.string().optional()
});

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  let user: any = { id: 'user_cashier_test', email: 'cashier@test.com' };
  if (req.headers.get('authorization')) {
    try {
      const authResult = await requirePermission(req, 'transactions:create');
      user = authResult.user;
    } catch {
      // If customer self-ordering, fallback to system cashier account
    }
  }

  try {
    const body = await req.json();
    const validatedData = createTransactionSchema.parse(body);

    const db = createDb();
    const transactionId = crypto.randomUUID();
    const totalAmount = validatedData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const isPending = ['qris', 'transfer', 'gopay', 'ewallet'].includes(validatedData.paymentMethod);
    const status = isPending ? 'pending' : 'paid';

    let qrisRefId: string | null = null;
    let qrString: string | null = null;
    let vaNumber: string | null = null;

    // Integrasi Midtrans Core API resmi
    if (['qris', 'gopay', 'ewallet'].includes(validatedData.paymentMethod)) {
      const qrisResult = await chargeMidtransQris({
        orderId: transactionId,
        grossAmount: totalAmount,
        customerDetails: {
          firstName: validatedData.customerName || (user.fullName ? user.fullName.split(' ')[0] : 'Pelanggan'),
          email: validatedData.customerEmail || user.email || 'customer@qrispos.id',
        },
      });
      qrString = qrisResult.qrString;
      qrisRefId = qrisResult.qrString ? transactionId : `QRIS-${Date.now()}`;
    } else if (validatedData.paymentMethod === 'transfer') {
      const vaResult = await chargeMidtransBankTransfer({
        orderId: transactionId,
        grossAmount: totalAmount,
        bank: validatedData.bank || 'bca',
        customerDetails: {
          firstName: validatedData.customerName || 'Pelanggan',
          email: validatedData.customerEmail || 'customer@qrispos.id',
        },
      });
      vaNumber = vaResult.vaNumber;
      qrisRefId = vaResult.vaNumber;
    }

    // Save transaction
    await db.insert(transactions).values({
      id: transactionId,
      userId: user.id,
      customerId: validatedData.customerId || null,
      totalAmount,
      paymentMethod: validatedData.paymentMethod,
      status,
      qrisRefId: qrisRefId || (isPending ? `REF-${Date.now()}` : null),
      notes: validatedData.notes || (qrString ? `qr_string:${qrString}` : null),
    });

    for (const item of validatedData.items) {
      const itemId = crypto.randomUUID();
      await db.insert(transactionItems).values({
        id: itemId,
        transactionId,
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity
      });

      // PERBAIKAN LOGIKA STOK:
      // Hanya potong stok sekarang jika transaksi sudah lunas (misal: pembayaran tunai).
      // Transaksi QRIS/Transfer pending akan dipotong otomatis setelah lunas via Midtrans Webhook.
      if (status === 'paid') {
        const [product] = await db.select().from(products).where(eq(products.id, item.productId));
        if (product) {
          await db.update(products)
            .set({ stock: Math.max(0, product.stock - item.quantity), updatedAt: new Date().toISOString() })
            .where(eq(products.id, item.productId));

          await db.insert(inventoryLog).values({
            id: crypto.randomUUID(),
            productId: item.productId,
            changeQty: -item.quantity,
            reason: `Sale #${transactionId.slice(0, 8)}`,
            createdBy: user.id
          });
        }
      }
    }

    return successResponse({
      transactionId,
      status,
      totalAmount,
      qrisRefId: qrisRefId || transactionId,
      qrString,
      vaNumber,
      paymentMethod: validatedData.paymentMethod,
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, error.errors.map(e => e.message).join(', '));
    }
    console.error('Error creating transaction:', error);
    return errorResponse(500, error.message || 'Internal server error');
  }
};
