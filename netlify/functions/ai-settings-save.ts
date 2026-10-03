import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { aiSettings } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const saveSchema = z.object({
  id: z.string().optional(), // kosong = tambah model baru, terisi = edit
  provider: z.enum(['gemini', 'openai', 'anthropic', 'deepseek', 'groq', 'nvidia', 'custom_ollama', 'custom']),
  modelName: z.string().min(1, 'Nama model wajib diisi'),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0.4),
  systemPromptOverride: z.string().optional(),
  activate: z.boolean().optional() // paksa jadikan model aktif
});

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    await requirePermission(req, 'settings:manage');

    const json = await req.json();
    const parsed = saveSchema.safeParse(json);
    if (!parsed.success) {
      return errorResponse(400, parsed.error.errors[0]?.message || 'Data tidak valid');
    }

    const { id, provider, modelName, apiKey, baseUrl, temperature, systemPromptOverride, activate } = parsed.data;
    const db = createDb();
    const now = new Date().toISOString();

    let finalApiKey = (apiKey || '').trim();
    const keyIsMasked = finalApiKey.includes('••••');

    // ── EDIT model yang sudah ada ──
    if (id) {
      const rows = await db.select().from(aiSettings).where(eq(aiSettings.id, id)).limit(1);
      if (rows.length === 0) return errorResponse(404, 'Model tidak ditemukan');
      // Key kosong / masked → pertahankan key lama
      if ((!finalApiKey || keyIsMasked) && rows[0].apiKey) finalApiKey = rows[0].apiKey;

      if (activate) {
        await db.update(aiSettings).set({ isActive: false, updatedAt: now });
      }
      await db
        .update(aiSettings)
        .set({
          provider,
          modelName,
          apiKey: finalApiKey,
          baseUrl: baseUrl || '',
          temperature,
          systemPromptOverride: systemPromptOverride || '',
          ...(activate ? { isActive: true } : {}),
          updatedAt: now
        })
        .where(eq(aiSettings.id, id));

      return successResult(id, provider, modelName, finalApiKey, temperature, 'Model berhasil diperbarui!');
    }

    // ── TAMBAH model baru ──
    if (keyIsMasked) finalApiKey = '';
    const existing = await db.select().from(aiSettings);
    const shouldActivate = activate ?? existing.length === 0;
    if (shouldActivate) {
      await db.update(aiSettings).set({ isActive: false, updatedAt: now });
    }

    const newId = `ai_${crypto.randomUUID()}`;
    await db.insert(aiSettings).values({
      id: newId,
      provider,
      modelName,
      apiKey: finalApiKey,
      baseUrl: baseUrl || '',
      temperature,
      systemPromptOverride: systemPromptOverride || '',
      isActive: shouldActivate,
      createdAt: now,
      updatedAt: now
    });

    return successResult(newId, provider, modelName, finalApiKey, temperature, 'Model baru berhasil ditambahkan!');
  } catch (err: any) {
    if (err?.statusCode) {
      return errorResponse(err.statusCode, err.message || 'Unauthorized');
    }
    console.error('Error saving AI settings:', err);
    return errorResponse(500, err?.message || 'Gagal menyimpan pengaturan AI');
  }
};

function successResult(
  id: string,
  provider: string,
  modelName: string,
  apiKey: string,
  temperature: number,
  message: string
) {
  return successResponse(
    { id, provider, modelName, hasKey: apiKey.length > 0, temperature },
    message
  );
}
