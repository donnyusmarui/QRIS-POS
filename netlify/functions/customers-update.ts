import { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { customers } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { corsHeaders } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional()
});

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'PUT') {
    return new Response(JSON.stringify({ success: false, message: 'Method Not Allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    const user = await requirePermission(req, 'customers:manage');
    if (user instanceof Response) return user;

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return new Response(JSON.stringify({ success: false, message: 'Customer ID required' }), { status: 400, headers: corsHeaders });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    
    if (!parsed.success) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid input', error: parsed.error }), { status: 400, headers: corsHeaders });
    }

    const db = createDb();
    
    const [existing] = await db.select().from(customers).where(eq(customers.id, id));
    if (!existing) {
      return new Response(JSON.stringify({ success: false, message: 'Customer not found' }), { status: 404, headers: corsHeaders });
    }

    const updateData: any = { updatedAt: new Date().toISOString() };
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
    if (parsed.data.address !== undefined) updateData.address = parsed.data.address;

    const [updated] = await db.update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();

    return new Response(JSON.stringify({ success: true, data: updated }), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers: corsHeaders });
  }
};
