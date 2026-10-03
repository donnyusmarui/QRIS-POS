import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { aiSettings } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { eq } from 'drizzle-orm';

// DELETE ?id=xxx → hapus model. Jika yang dihapus sedang aktif,
// model lain (terbaru) otomatis diaktifkan agar chatbot tetap punya konfigurasi.
export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'DELETE') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    await requirePermission(req, 'settings:manage');

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return errorResponse(400, 'Parameter id wajib diisi');

    const db = createDb();
    const rows = await db.select().from(aiSettings).where(eq(aiSettings.id, id)).limit(1);
    if (rows.length === 0) return errorResponse(404, 'Model tidak ditemukan');

    await db.delete(aiSettings).where(eq(aiSettings.id, id));

    if (rows[0].isActive) {
      const rest = await db.select().from(aiSettings);
      if (rest.length > 0) {
        await db
          .update(aiSettings)
          .set({ isActive: true, updatedAt: new Date().toISOString() })
          .where(eq(aiSettings.id, rest[0].id));
      }
    }

    return successResponse({ id }, 'Model berhasil dihapus');
  } catch (err: any) {
    if (err?.statusCode) return errorResponse(err.statusCode, err.message || 'Unauthorized');
    console.error('Error deleting AI model:', err);
    return errorResponse(500, err?.message || 'Gagal menghapus model AI');
  }
};
