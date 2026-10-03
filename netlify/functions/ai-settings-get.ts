import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { aiSettings } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { eq, desc } from 'drizzle-orm';

function maskApiKey(key: string | null | undefined): string {
  if (!key || key.trim() === '') return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '********';
  return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`;
}

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'GET') {
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

    const db = createDb();
    const rows = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.isActive, true))
      .limit(1);

    const setting = rows[0] || null;

    if (!setting) {
      return successResponse({
        id: 'default',
        provider: 'gemini',
        modelName: 'gemini-2.0-flash',
        maskedApiKey: '',
        hasKey: false,
        baseUrl: '',
        temperature: 0.4,
        systemPromptOverride: '',
        isActive: true
      });
    }

    return successResponse({
      id: setting.id,
      provider: setting.provider,
      modelName: setting.modelName,
      maskedApiKey: maskApiKey(setting.apiKey),
      hasKey: Boolean(setting.apiKey && setting.apiKey.trim().length > 0),
      baseUrl: setting.baseUrl || '',
      temperature: Number(setting.temperature) || 0.4,
      systemPromptOverride: setting.systemPromptOverride || '',
      isActive: setting.isActive,
      updatedAt: setting.updatedAt
    });
  } catch (err: any) {
    if (err?.statusCode) {
      return errorResponse(err.statusCode, err.message || 'Unauthorized');
    }
    console.error('Error fetching AI settings:', err);
    return errorResponse(500, err?.message || 'Gagal memuat pengaturan AI');
  }
};
