import { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { inventoryLog, products, users } from '../../db/schema';
import { eq, desc, and, count } from 'drizzle-orm';
import { corsHeaders } from './_shared/response';
import { requirePermission } from './_shared/rbac';

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ success: false, message: 'Method Not Allowed' }), { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const user = await requirePermission(req, 'inventory:manage');
    if (user instanceof Response) return user;

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const productId = url.searchParams.get('productId');

    const db = createDb();
    
    let baseQuery = db.select({
      id: inventoryLog.id,
      productId: inventoryLog.productId,
      changeQty: inventoryLog.changeQty,
      reason: inventoryLog.reason,
      createdAt: inventoryLog.createdAt,
      createdBy: inventoryLog.createdBy,
      productName: products.name,
      userFullName: users.fullName
    })
    .from(inventoryLog)
    .leftJoin(products, eq(inventoryLog.productId, products.id))
    .leftJoin(users, eq(inventoryLog.createdBy, users.id));

    let conditions = productId ? eq(inventoryLog.productId, productId) : undefined;
    
    if (conditions) {
        baseQuery = baseQuery.where(conditions) as any;
    }

    const data = await baseQuery
      .orderBy(desc(inventoryLog.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    let countQuery = db.select({ value: count() }).from(inventoryLog);
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
