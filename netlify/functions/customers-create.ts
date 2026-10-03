import { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { customers } from '../../db/schema';
import { corsHeaders } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { z } from 'zod';
import crypto from 'crypto';

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional()
});

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method Not Allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    const user = await requirePermission(req, 'customers:manage');
    if (user instanceof Response) return user;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    
    if (!parsed.success) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid input', error: parsed.error }), { status: 400, headers: corsHeaders });
    }

    const db = createDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const [newCustomer] = await db.insert(customers).values({
      id,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      createdAt: now,
      updatedAt: now
    }).returning();

    return new Response(JSON.stringify({ success: true, data: newCustomer }), { status: 201, headers: corsHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers: corsHeaders });
  }
};
