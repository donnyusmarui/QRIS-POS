import { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { customers } from '../../db/schema';
import { desc, like, or, count } from 'drizzle-orm';
import { corsHeaders } from './_shared/response';
import { requirePermission } from './_shared/rbac';

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ success: false, message: 'Method Not Allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    const user = await requirePermission(req, 'customers:manage');
    if (user instanceof Response) return user;

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const search = url.searchParams.get('search');

    const db = createDb();
    
    let baseQuery = db.select().from(customers);
    let conditions = undefined;

    if (search) {
      conditions = or(
        like(customers.name, `%${search}%`),
        like(customers.phone, `%${search}%`),
        like(customers.email, `%${search}%`)
      );
    }
    
    if (conditions) {
      baseQuery = baseQuery.where(conditions) as any;
    }

    const data = await baseQuery
      .orderBy(desc(customers.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    let countQuery = db.select({ value: count() }).from(customers);
    if (conditions) {
      countQuery = countQuery.where(conditions) as any;
    }
    const [totalRes] = await countQuery;
    const total = totalRes.value;

    return new Response(JSON.stringify({ 
      success: true, 
      data, 
      pagination: { 
        page, 
        pageSize, 
        total, 
        totalPages: Math.ceil(total / pageSize) 
      } 
    }), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers: corsHeaders });
  }
};
