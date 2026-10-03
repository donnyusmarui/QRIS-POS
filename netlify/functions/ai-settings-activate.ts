import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { aiSettings } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { eq } from 'drizzle-orm';

// POST { id } → jadikan model ini satu-satunya yang aktif.
export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    await requirePermission(req, 'settings:manage');

    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) return errorResponse(400, 'Parameter id wajib diisi');

    const db = createDb();
    const rows = await db.select().from(aiSettings).where(eq(aiSettings.id, id)).limit(1);
    if (rows.length === 0) return errorResponse(404, 'Model tidak ditemukan');

    const now = new Date().toISOString();
    await db.update(aiSettings).set({ isActive: false, updatedAt: now });
    await db.update(aiSettings).set({ isActive: true, updatedAt: now }).where(eq(aiSettings.id, id));

    return successResponse({ id }, 'Model aktif berhasil diganti');
  } catch (err: any) {
    if (err?.statusCode) return errorResponse(err.statusCode, err.message || 'Unauthorized');
    console.error('Error activating AI model:', err);
    return errorResponse(500, err?.message || 'Gagal mengaktifkan model AI');
  }
};
