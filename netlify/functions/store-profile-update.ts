import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { storeProfile } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateSchema = z.object({
  businessCategory: z.string().min(1, 'Kategori bisnis wajib diisi'),
  storeName: z.string().min(1, 'Nama toko wajib diisi').max(80, 'Nama toko maksimal 80 karakter'),
  tagline: z.string().max(160, 'Tagline maksimal 160 karakter').optional().default(''),
  aiPersonaTitle: z.string().max(60, 'Gelar persona AI maksimal 60 karakter').optional().default(''),
  terminology: z.record(z.any()).optional()
});

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'PUT' && req.method !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    const authResult = await requirePermission(req, 'settings:manage');
    if ('statusCode' in authResult) {
      return new Response(JSON.stringify({ success: false, error: authResult.message }), {
        status: authResult.statusCode,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, parsed.error.issues[0]?.message || 'Data tidak valid');
    }

    const { businessCategory, storeName, tagline, aiPersonaTitle, terminology } = parsed.data;
    const now = new Date().toISOString();
    const terminologyJson = terminology ? JSON.stringify(terminology) : null;

    const db = createDb();

    // Cek apakah baris 'default' sudah ada
    const existing = await db
      .select()
      .from(storeProfile)
      .where(eq(storeProfile.id, 'default'))
      .limit(1);

    if (existing && existing.length > 0) {
      await db
        .update(storeProfile)
        .set({
          businessCategory,
          storeName,
          tagline: tagline || '',
          aiPersonaTitle: aiPersonaTitle || '',
          terminologyJson,
          updatedAt: now
        })
        .where(eq(storeProfile.id, 'default'));
    } else {
      await db.insert(storeProfile).values({
        id: 'default',
        businessCategory,
        storeName,
        tagline: tagline || '',
        aiPersonaTitle: aiPersonaTitle || '',
        terminologyJson,
        updatedAt: now
      });
    }

    return successResponse({
      id: 'default',
      businessCategory,
      storeName,
      tagline,
      aiPersonaTitle,
      terminology,
      updatedAt: now
    }, 'Profil toko berhasil diperbarui di server');
  } catch (err: any) {
    if (err?.statusCode) return errorResponse(err.statusCode, err.message || 'Unauthorized');
    console.error('Error in store-profile-update:', err);
    return errorResponse(500, err?.message || 'Gagal menyimpan profil toko');
  }
};
