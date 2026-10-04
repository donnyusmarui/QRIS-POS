import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { chatbotConfig } from '../../db/schema';
import { corsHeaders, successResponse } from './_shared/response';
import { eq } from 'drizzle-orm';

const DEFAULT_CONFIG = {
  id: 'default',
  pharmacistName: 'Apt. Siti Rahma, S.Farm',
  pharmacistTitle: 'Apoteker Pendamping Klinis',
  pharmacistAvatarUrl: 'https://images.unsplash.com/photo-1594824813583-1e5f8f9e7c5b?auto=format&fit=crop&w=400&q=80',
  pharmacistStatusText: 'Online • Siap Mendengarkan',
  leadNudgeEnabled: true,
  leadNudgeTriggerMode: 'message_count',
  leadNudgeMessageCount: 3,
  leadNudgeTimeMinutes: 2,
  leadNudgeCooldownMinutes: 10,
  widgetButtonText: 'Konsultasi Apoteker',
  widgetPosition: 'bottom_right',
  widgetOffsetY: 90,
  widgetOffsetX: 24,
};

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const url = new URL(req.url);
    const configType = url.searchParams.get('type') || url.searchParams.get('id');
    const db = createDb();

    // ── Handle Pengaturan Chatbot Produk Terpusat ──
    if (configType === 'product_chat') {
      const rows = await db
        .select()
        .from(chatbotConfig)
        .where(eq(chatbotConfig.id, 'product_chat'))
        .limit(1);

      if (!rows || rows.length === 0) {
        return successResponse({
          id: 'product_chat',
          masterEnabled: true,
          defaultButtonText: 'Tanya Apoteker',
          productGreetingTemplate: 'Halo! Ada yang ingin Anda konsultasikan seputar khasiat, aturan minum, atau pantangan dari {product_name}?',
          productSystemPrompt: 'Saat memberikan edukasi produk herbal, selalu jelaskan aturan pakai, waktu konsumsi terbaik (sebelum/sesudah makan), pantangan makanan terkait penyakit, dan tegaskan bahwa herbal merupakan terapi pendamping komplementer (pasien tidak boleh menghentikan resep obat dokter secara mendadak).'
        });
      }

      const row = rows[0];
      return successResponse({
        id: 'product_chat',
        masterEnabled: row.leadNudgeEnabled !== undefined ? Boolean(row.leadNudgeEnabled) : true,
        defaultButtonText: row.pharmacistName || 'Tanya Apoteker',
        productGreetingTemplate: row.pharmacistTitle || 'Halo! Ada yang ingin Anda konsultasikan seputar khasiat, aturan minum, atau pantangan dari {product_name}?',
        productSystemPrompt: row.pharmacistStatusText || 'Saat memberikan edukasi produk herbal, selalu jelaskan aturan pakai, waktu konsumsi terbaik (sebelum/sesudah makan), pantangan makanan terkait penyakit, dan tegaskan bahwa herbal merupakan terapi pendamping komplementer (pasien tidak boleh menghentikan resep obat dokter secara mendadak).'
      });
    }

    const rows = await db
      .select()
      .from(chatbotConfig)
      .where(eq(chatbotConfig.id, 'default'))
      .limit(1);

    if (!rows || rows.length === 0) {
      return successResponse(DEFAULT_CONFIG);
    }

    const row = rows[0];
    return successResponse({
      id: row.id,
      pharmacistName: row.pharmacistName || DEFAULT_CONFIG.pharmacistName,
      pharmacistTitle: row.pharmacistTitle || DEFAULT_CONFIG.pharmacistTitle,
      pharmacistAvatarUrl: row.pharmacistAvatarUrl || DEFAULT_CONFIG.pharmacistAvatarUrl,
      pharmacistStatusText: row.pharmacistStatusText || DEFAULT_CONFIG.pharmacistStatusText,
      leadNudgeEnabled: row.leadNudgeEnabled !== undefined ? Boolean(row.leadNudgeEnabled) : true,
      leadNudgeTriggerMode: row.leadNudgeTriggerMode || 'message_count',
      leadNudgeMessageCount: Number(row.leadNudgeMessageCount ?? 3),
      leadNudgeTimeMinutes: Number(row.leadNudgeTimeMinutes ?? 2),
      leadNudgeCooldownMinutes: Number(row.leadNudgeCooldownMinutes ?? 10),
      widgetButtonText: row.widgetButtonText || DEFAULT_CONFIG.widgetButtonText,
      widgetPosition: row.widgetPosition || DEFAULT_CONFIG.widgetPosition,
      widgetOffsetY: Number(row.widgetOffsetY ?? DEFAULT_CONFIG.widgetOffsetY),
      widgetOffsetX: Number(row.widgetOffsetX ?? DEFAULT_CONFIG.widgetOffsetX),
    });
  } catch (err: any) {
    console.error('Error fetching chatbot config:', err);
    return successResponse(DEFAULT_CONFIG);
  }
};
