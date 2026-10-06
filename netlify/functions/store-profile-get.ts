import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { storeProfile } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { eq } from 'drizzle-orm';

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'GET') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    const db = createDb();
    const rows = await db
      .select()
      .from(storeProfile)
      .where(eq(storeProfile.id, 'default'))
      .limit(1);

    if (!rows || rows.length === 0) {
      return successResponse({
        id: 'default',
        businessCategory: 'retail',
        storeName: 'Toko Retail POS',
        tagline: 'Pusat Belanja Kebutuhan Harian Lengkap & Terjangkau',
        aiPersonaTitle: 'Asisten Toko Cerdas',
        terminology: null,
        updatedAt: new Date().toISOString()
      });
    }

    const row = rows[0];
    let terminology = null;
    if (row.terminologyJson) {
      try {
        terminology = typeof row.terminologyJson === 'string'
          ? JSON.parse(row.terminologyJson)
          : row.terminologyJson;
      } catch {
        terminology = null;
      }
    }

    return successResponse({
      id: row.id,
      businessCategory: row.businessCategory,
      storeName: row.storeName,
      tagline: row.tagline || '',
      aiPersonaTitle: row.aiPersonaTitle || '',
      terminology,
      updatedAt: row.updatedAt
    });
  } catch (err: any) {
    console.error('Error in store-profile-get:', err);
    return errorResponse(500, err?.message || 'Gagal memuat profil toko');
  }
};
