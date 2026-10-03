import { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { products, inventoryLog } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { corsHeaders } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { z } from 'zod';
import crypto from 'crypto';

const schema = z.object({
  productId: z.string(),
  changeQty: z.number().int().refine(val => val !== 0, { message: "changeQty cannot be 0" }),
  reason: z.string().min(2)
});

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method Not Allowed' }), { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const user = await requirePermission(req, 'inventory:manage');
    if (user instanceof Response) return user;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    
    if (!parsed.success) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid input', error: parsed.error }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const { productId, changeQty, reason } = parsed.data;
    const db = createDb();

    const [product] = await db.select().from(products).where(eq(products.id, productId));
    if (!product) {
      return new Response(JSON.stringify({ success: false, message: 'Product not found' }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const newStock = product.stock + changeQty;
    if (newStock < 0) {
      return new Response(JSON.stringify({ success: false, message: 'Stok tidak boleh bernilai negatif' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    await db.update(products)
      .set({ stock: newStock, updatedAt: new Date().toISOString() })
      .where(eq(products.id, productId));

    await db.insert(inventoryLog).values({
      id: crypto.randomUUID(),
      productId,
      changeQty,
      reason,
      createdBy: user.id
    });

    return new Response(JSON.stringify({ 
      success: true, 
      data: { productId, newStock, changeQty } 
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
