import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { aiSettings } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { desc } from 'drizzle-orm';

function maskApiKey(key: string | null | undefined): string {
  if (!key || key.trim() === '') return '';
  const t = key.trim();
  if (t.length <= 8) return '********';
  return `${t.slice(0, 4)}••••••••${t.slice(-4)}`;
}

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'GET') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    await requirePermission(req, 'settings:manage');

    const db = createDb();
    const rows = await db.select().from(aiSettings).orderBy(desc(aiSettings.updatedAt));

    // API key tidak pernah dikirim utuh ke frontend
    const models = rows.map((r: any) => ({
      id: r.id,
      provider: r.provider,
      modelName: r.modelName,
      maskedApiKey: maskApiKey(r.apiKey),
      hasKey: Boolean(r.apiKey && r.apiKey.trim().length > 0),
      baseUrl: r.baseUrl || '',
      temperature: Number(r.temperature) || 0.4,
      systemPromptOverride: r.systemPromptOverride || '',
      isActive: Boolean(r.isActive),
      updatedAt: r.updatedAt
    }));

    return successResponse(models);
  } catch (err: any) {
    if (err?.statusCode) return errorResponse(err.statusCode, err.message || 'Unauthorized');
    console.error('Error listing AI models:', err);
    return errorResponse(500, err?.message || 'Gagal memuat daftar model AI');
  }
};
