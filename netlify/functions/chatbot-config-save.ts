import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { chatbotConfig } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { extractAuthUser } from './_shared/auth-middleware';
import { eq } from 'drizzle-orm';

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Metode HTTP tidak diizinkan');
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

  try {
    const body = await req.json();
    const db = createDb();
    const now = new Date().toISOString();

    const pharmacistName = body.pharmacistName?.trim() || 'Apt. Siti Rahma, S.Farm';
    const pharmacistTitle = body.pharmacistTitle?.trim() || 'Apoteker Pendamping Klinis';
    const pharmacistAvatarUrl = body.pharmacistAvatarUrl?.trim() || null;
    const pharmacistStatusText = body.pharmacistStatusText?.trim() || 'Online • Siap Mendengarkan';
    const leadNudgeEnabled = body.leadNudgeEnabled !== undefined ? Boolean(body.leadNudgeEnabled) : true;
    const leadNudgeTriggerMode = body.leadNudgeTriggerMode || 'message_count';
    const leadNudgeMessageCount = Number(body.leadNudgeMessageCount ?? 3);
    const leadNudgeTimeMinutes = Number(body.leadNudgeTimeMinutes ?? 2);
    const leadNudgeCooldownMinutes = Number(body.leadNudgeCooldownMinutes ?? 10);
    const widgetButtonText = body.widgetButtonText?.trim() || 'Konsultasi Apoteker';
    const widgetPosition = body.widgetPosition === 'bottom_left' ? 'bottom_left' : 'bottom_right';
    const widgetOffsetY = Math.max(10, Math.min(300, Number(body.widgetOffsetY ?? 90)));
    const widgetOffsetX = Math.max(10, Math.min(200, Number(body.widgetOffsetX ?? 24)));

    const existing = await db
      .select()
      .from(chatbotConfig)
      .where(eq(chatbotConfig.id, 'default'))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(chatbotConfig)
        .set({
          pharmacistName,
          pharmacistTitle,
          pharmacistAvatarUrl,
          pharmacistStatusText,
          leadNudgeEnabled,
          leadNudgeTriggerMode,
          leadNudgeMessageCount,
          leadNudgeTimeMinutes,
          leadNudgeCooldownMinutes,
          widgetButtonText,
          widgetPosition,
          widgetOffsetY,
          widgetOffsetX,
          updatedAt: now,
        })
        .where(eq(chatbotConfig.id, 'default'));
    } else {
      await db.insert(chatbotConfig).values({
        id: 'default',
        pharmacistName,
        pharmacistTitle,
        pharmacistAvatarUrl,
        pharmacistStatusText,
        leadNudgeEnabled,
        leadNudgeTriggerMode,
        leadNudgeMessageCount,
        leadNudgeTimeMinutes,
        leadNudgeCooldownMinutes,
        widgetButtonText,
        widgetPosition,
        widgetOffsetY,
        widgetOffsetX,
        createdAt: now,
        updatedAt: now,
      });
    }

    return successResponse(
      {
        pharmacistName,
        pharmacistTitle,
        pharmacistAvatarUrl,
        pharmacistStatusText,
        leadNudgeEnabled,
        leadNudgeTriggerMode,
        leadNudgeMessageCount,
        leadNudgeTimeMinutes,
        leadNudgeCooldownMinutes,
        widgetButtonText,
        widgetPosition,
        widgetOffsetY,
        widgetOffsetX,
      },
      'Pengaturan Persona Apoteker & Tampilan Widget berhasil disimpan'
    );
  } catch (err: any) {
    console.error('Error saving chatbot config:', err);
    return errorResponse(500, err?.message || 'Gagal menyimpan pengaturan chatbot');
  }
};
