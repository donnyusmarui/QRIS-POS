import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { marketingCampaigns } from '../../db/schema';
import { corsHeaders, successResponse, errorResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { eq, desc, and, like, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

const campaignSchema = z.object({
  name: z.string().min(2, 'Nama kampanye minimal 2 karakter'),
  channel: z.enum(['tiktok', 'instagram', 'youtube', 'whatsapp', 'google', 'facebook', 'linkedin', 'offline', 'other']),
  utmSource: z.string().min(1, 'utm_source wajib diisi'),
  utmMedium: z.string().optional().nullable(),
  utmCampaign: z.string().optional().nullable(),
  utmContent: z.string().optional().nullable(),
  promoCode: z.string().optional().nullable(),
  targetType: z.enum(['portal', 'product']).default('portal'),
  targetProductId: z.string().optional().nullable(),
  customGreeting: z.string().optional().nullable(),
  bannerMessage: z.string().optional().nullable(),
});

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // Auth Guard: Admin / Kasir yang memiliki akses katalog produk
  try {
    await requirePermission(req, 'products:read');
  } catch (err: any) {
    return errorResponse(err.statusCode || 401, err.message || 'Unauthorized');
  }

  const db = createDb();
  const url = new URL(req.url);

  try {
    // ── GET: Ambil daftar kampanye & filter ──
    if (req.method === 'GET') {
      const channel = url.searchParams.get('channel');
      const search = url.searchParams.get('search');

      const conditions: any[] = [];
      if (channel && channel !== 'all') {
        conditions.push(eq(marketingCampaigns.channel, channel));
      }
      if (search) {
        conditions.push(
          or(
            like(marketingCampaigns.name, `%${search}%`),
            like(marketingCampaigns.utmCampaign, `%${search}%`),
            like(marketingCampaigns.utmSource, `%${search}%`)
          )
        );
      }

      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
      const list = await db
        .select()
        .from(marketingCampaigns)
        .where(whereClause || undefined)
        .orderBy(desc(marketingCampaigns.createdAt));

      // Hitung agregasi KPI
      const totalScans = list.reduce((acc, c) => acc + (c.scanCount || 0), 0);
      const totalChats = list.reduce((acc, c) => acc + (c.chatEngagementCount || 0), 0);
      const totalCarts = list.reduce((acc, c) => acc + (c.cartCount || 0), 0);
      const totalCheckouts = list.reduce((acc, c) => acc + (c.checkoutCount || 0), 0);
      const totalRevenue = list.reduce((acc, c) => acc + (c.revenueAttributed || 0), 0);

      return successResponse({
        campaigns: list,
        summary: {
          totalCampaigns: list.length,
          totalScans,
          totalChats,
          totalCarts,
          totalCheckouts,
          totalRevenue,
        },
      });
    }

    // ── POST: Buat kampanye QR baru ──
    if (req.method === 'POST') {
      const body = await req.json();
      const parsed = campaignSchema.parse(body);

      const id = 'camp_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const now = new Date().toISOString();

      const newCampaign = {
        id,
        name: parsed.name,
        channel: parsed.channel,
        utmSource: parsed.utmSource.toLowerCase().trim(),
        utmMedium: parsed.utmMedium ? parsed.utmMedium.trim() : null,
        utmCampaign: parsed.utmCampaign ? parsed.utmCampaign.trim() : null,
        utmContent: parsed.utmContent ? parsed.utmContent.trim() : null,
        promoCode: parsed.promoCode ? parsed.promoCode.toUpperCase().trim() : null,
        targetType: parsed.targetType,
        targetProductId: parsed.targetProductId || null,
        customGreeting: parsed.customGreeting || null,
        bannerMessage: parsed.bannerMessage || null,
        scanCount: 0,
        chatEngagementCount: 0,
        cartCount: 0,
        checkoutCount: 0,
        revenueAttributed: 0,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(marketingCampaigns).values(newCampaign);
      return successResponse(newCampaign, 'Kampanye pemasaran & QR berhasil dibuat');
    }

    // ── PUT: Perbarui / Re-generate kampanye ──
    if (req.method === 'PUT') {
      const id = url.searchParams.get('id');
      if (!id) return errorResponse(400, 'ID kampanye wajib disertakan');

      const body = await req.json();
      const parsed = campaignSchema.partial().parse(body);

      const now = new Date().toISOString();
      await db
        .update(marketingCampaigns)
        .set({
          ...parsed,
          updatedAt: now,
        })
        .where(eq(marketingCampaigns.id, id));

      const [updated] = await db
        .select()
        .from(marketingCampaigns)
        .where(eq(marketingCampaigns.id, id));

      return successResponse(updated, 'Kampanye berhasil diperbarui');
    }

    // ── DELETE: Hapus kampanye ──
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) return errorResponse(400, 'ID kampanye wajib disertakan');

      await db.delete(marketingCampaigns).where(eq(marketingCampaigns.id, id));
      return successResponse(null, 'Kampanye berhasil dihapus');
    }

    return errorResponse(405, 'Method Not Allowed');
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, error.errors.map((e) => e.message).join(', '));
    }
    console.error('Error handling marketing campaign:', error);
    return errorResponse(500, error.message || 'Internal server error');
  }
};
