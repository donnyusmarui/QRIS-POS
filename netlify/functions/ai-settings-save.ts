import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { aiSettings } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const saveSchema = z.object({
  provider: z.enum(['gemini', 'openai', 'anthropic', 'deepseek', 'groq', 'nvidia', 'custom_ollama', 'custom']),
  modelName: z.string().min(1, 'Nama model wajib diisi'),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0.4),
  systemPromptOverride: z.string().optional()
});

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
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

    const json = await req.json();
    const parsed = saveSchema.safeParse(json);
    if (!parsed.success) {
      return errorResponse(400, parsed.error.errors[0]?.message || 'Data tidak valid');
    }

    const { provider, modelName, apiKey, baseUrl, temperature, systemPromptOverride } = parsed.data;

    const db = createDb();

    // Check existing active setting
    const existing = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.isActive, true))
      .limit(1);

    let finalApiKey = (apiKey || '').trim();
    // If incoming apiKey is masked or empty, keep existing key
    if ((!finalApiKey || finalApiKey.includes('••••')) && existing.length > 0 && existing[0].apiKey) {
      finalApiKey = existing[0].apiKey;
    }

    const targetId = existing.length > 0 ? existing[0].id : 'ai_config_default';
    const now = new Date().toISOString();

    if (existing.length > 0) {
      await db
        .update(aiSettings)
        .set({
          provider,
          modelName,
          apiKey: finalApiKey,
          baseUrl: baseUrl || '',
          temperature,
          systemPromptOverride: systemPromptOverride || '',
          isActive: true,
          updatedAt: now
        })
        .where(eq(aiSettings.id, targetId));
    } else {
      await db.insert(aiSettings).values({
        id: targetId,
        provider,
        modelName,
        apiKey: finalApiKey,
        baseUrl: baseUrl || '',
        temperature,
        systemPromptOverride: systemPromptOverride || '',
        isActive: true,
        createdAt: now,
        updatedAt: now
      });
    }

    return successResponse(
      {
        id: targetId,
        provider,
        modelName,
        hasKey: Boolean(finalApiKey && finalApiKey.length > 0),
        temperature
      },
      'Pengaturan AI berhasil disimpan!'
    );
  } catch (err: any) {
    console.error('Error saving AI settings:', err);
    return errorResponse(500, err?.message || 'Gagal menyimpan pengaturan AI');
  }
};
