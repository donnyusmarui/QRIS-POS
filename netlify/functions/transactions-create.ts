import { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { transactions, transactionItems, products, inventoryLog } from '../../db/schema';
import { corsHeaders, successResponse, errorResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const createTransactionSchema = z.object({
  customerId: z.string().optional(),
  paymentMethod: z.enum(['cash', 'qris', 'transfer', 'gopay', 'ewallet']),
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
    const qrisRefId = ['qris', 'gopay', 'ewallet'].includes(validatedData.paymentMethod)
      ? `QRIS-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
      : (validatedData.paymentMethod === 'transfer' ? `VA-${Date.now().toString().slice(-8)}` : null);

    // Save transaction
    await db.insert(transactions).values({
      id: transactionId,
      userId: user.id,
      customerId: validatedData.customerId || null,
      totalAmount,
      paymentMethod: validatedData.paymentMethod,
      status,
      qrisRefId,
      notes: validatedData.notes || null,
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

      // Fetch current product to update stock
      const [product] = await db.select().from(products).where(eq(products.id, item.productId));
      if (product) {
        await db.update(products)
          .set({ stock: product.stock - item.quantity, updatedAt: new Date().toISOString() })
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

    return successResponse({
      transactionId,
      status,
      totalAmount,
      qrisRefId,
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
