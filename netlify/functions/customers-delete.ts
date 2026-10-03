import { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { customers } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { corsHeaders } from './_shared/response';
import { requirePermission } from './_shared/rbac';

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'DELETE') {
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

    const db = createDb();
    
    const [existing] = await db.select().from(customers).where(eq(customers.id, id));
    if (!existing) {
      return new Response(JSON.stringify({ success: false, message: 'Customer not found' }), { status: 404, headers: corsHeaders });
    }

    await db.delete(customers).where(eq(customers.id, id));

    return new Response(JSON.stringify({ success: true, message: 'Customer deleted successfully' }), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers: corsHeaders });
  }
};
