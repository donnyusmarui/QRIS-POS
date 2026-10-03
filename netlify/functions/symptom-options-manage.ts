import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { chatbotSymptomOptions } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { extractAuthUser } from './_shared/auth-middleware';
import { eq, asc } from 'drizzle-orm';

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // Auth check
  try {
    const user = await extractAuthUser(req);
    const hasAdminOrSettings = user.roles.some((r: any) =>
      r.name === 'admin' || (r.permissions && (r.permissions.includes('settings:manage') || r.permissions.includes('all')))
    );
    if (!hasAdminOrSettings) {
      return errorResponse(403, 'Akses ditolak: Memerlukan izin admin');
    }
  } catch (err: any) {
    return errorResponse(401, 'Unauthorized: ' + (err?.message || 'Token tidak valid'));
  }

  const db = createDb();

  // GET: List all symptoms (including inactive)
  if (req.method === 'GET') {
    try {
      const rows = await db
        .select()
        .from(chatbotSymptomOptions)
        .orderBy(asc(chatbotSymptomOptions.orderIndex));

      const list = rows.map((r: any) => {
        let followUpParsed = [];
        if (r.followUpOptions) {
          try {
            followUpParsed = typeof r.followUpOptions === 'string' ? JSON.parse(r.followUpOptions) : r.followUpOptions;
          } catch {
            followUpParsed = [];
          }
        }
        return {
          id: r.id,
          label: r.label,
          category: r.category,
          orderIndex: r.orderIndex,
          isActive: Boolean(r.isActive),
          followUpQuestion: r.followUpQuestion || '',
          followUpOptions: followUpParsed,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      });

      return successResponse(list);
    } catch (err: any) {
      return errorResponse(500, err?.message || 'Gagal memuat daftar opsi gejala');
    }
  }

  // POST: Create or Update symptom option
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const id = body.id || `sym_${Date.now()}`;
      const label = body.label?.trim();
      if (!label) {
        return errorResponse(400, 'Label gejala wajib diisi');
      }
      const category = body.category || 'umum';
      const orderIndex = Number(body.orderIndex ?? 0);
      const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
      const followUpQuestion = body.followUpQuestion?.trim() || null;
      const followUpOptions = body.followUpOptions ? JSON.stringify(body.followUpOptions) : null;
      const now = new Date().toISOString();

      // Check if exists
      const existing = await db
        .select()
        .from(chatbotSymptomOptions)
        .where(eq(chatbotSymptomOptions.id, id))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(chatbotSymptomOptions)
          .set({
            label,
            category,
            orderIndex,
            isActive,
            followUpQuestion,
            followUpOptions,
            updatedAt: now,
          })
          .where(eq(chatbotSymptomOptions.id, id));

        return successResponse({ id, label, category, orderIndex, isActive }, 'Opsi gejala berhasil diperbarui');
      } else {
        await db.insert(chatbotSymptomOptions).values({
          id,
          label,
          category,
          orderIndex,
          isActive,
          followUpQuestion,
          followUpOptions,
          createdAt: now,
          updatedAt: now,
        });

        return successResponse({ id, label, category, orderIndex, isActive }, 'Opsi gejala berhasil ditambahkan');
      }
    } catch (err: any) {
      return errorResponse(500, err?.message || 'Gagal menyimpan opsi gejala');
    }
  }

  // DELETE: Delete symptom option
  if (req.method === 'DELETE') {
    try {
      const url = new URL(req.url);
      let id = url.searchParams.get('id');
      if (!id) {
        try {
          const body = await req.json();
          id = body?.id;
        } catch {}
      }
      if (!id) {
        return errorResponse(400, 'ID opsi gejala wajib disertakan');
      }

      await db
        .delete(chatbotSymptomOptions)
        .where(eq(chatbotSymptomOptions.id, id));

      return successResponse({ id }, 'Opsi gejala berhasil dihapus');
    } catch (err: any) {
      return errorResponse(500, err?.message || 'Gagal menghapus opsi gejala');
    }
  }

  return errorResponse(405, 'Metode HTTP tidak diizinkan');
};
