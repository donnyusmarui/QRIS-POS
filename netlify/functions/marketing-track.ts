import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { marketingCampaigns, marketingTrackingLogs } from '../../db/schema';
import { corsHeaders, successResponse, errorResponse } from './_shared/response';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

const trackSchema = z.object({
  eventType: z.enum(['scan', 'chat_engagement', 'add_to_cart', 'checkout']),
  campaignId: z.string().optional().nullable(),
  utmSource: z.string().optional().nullable(),
  utmMedium: z.string().optional().nullable(),
  utmCampaign: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    const body = await req.json();
    const data = trackSchema.parse(body);

    const db = createDb();
    let campaign: any = null;

    // 1. Temukan kampanye berdasarkan ID atau kombinasi UTM
    if (data.campaignId) {
      const [found] = await db
        .select()
        .from(marketingCampaigns)
        .where(eq(marketingCampaigns.id, data.campaignId));
      campaign = found;
    } else if (data.utmCampaign) {
      const conditions = [eq(marketingCampaigns.utmCampaign, data.utmCampaign)];
      if (data.utmSource) {
        conditions.push(eq(marketingCampaigns.utmSource, data.utmSource.toLowerCase()));
      }
      const [found] = await db
        .select()
        .from(marketingCampaigns)
        .where(and(...conditions));
      campaign = found;
    }

    const campaignId = campaign ? campaign.id : data.campaignId || null;
    const utmSource = data.utmSource || campaign?.utmSource || 'direct';
    const utmMedium = data.utmMedium || campaign?.utmMedium || null;
    const utmCampaign = data.utmCampaign || campaign?.utmCampaign || null;
    const now = new Date().toISOString();

    // 2. Increment metrik pada tabel kampanye jika ditemukan
    if (campaignId) {
      if (data.eventType === 'scan') {
        await db
          .update(marketingCampaigns)
          .set({
            scanCount: sql`${marketingCampaigns.scanCount} + 1`,
            updatedAt: now,
          })
          .where(eq(marketingCampaigns.id, campaignId));
      } else if (data.eventType === 'chat_engagement') {
        await db
          .update(marketingCampaigns)
          .set({
            chatEngagementCount: sql`${marketingCampaigns.chatEngagementCount} + 1`,
            updatedAt: now,
          })
          .where(eq(marketingCampaigns.id, campaignId));
      } else if (data.eventType === 'add_to_cart') {
        await db
          .update(marketingCampaigns)
          .set({
            cartCount: sql`${marketingCampaigns.cartCount} + 1`,
            updatedAt: now,
          })
          .where(eq(marketingCampaigns.id, campaignId));
      } else if (data.eventType === 'checkout') {
        await db
          .update(marketingCampaigns)
          .set({
            checkoutCount: sql`${marketingCampaigns.checkoutCount} + 1`,
            updatedAt: now,
          })
          .where(eq(marketingCampaigns.id, campaignId));
      }
    }

    // 3. Simpan log peristiwa individual ke marketing_tracking_logs
    const logId = 'trk_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    await db.insert(marketingTrackingLogs).values({
      id: logId,
      campaignId,
      utmSource,
      utmMedium,
      utmCampaign,
      productId: data.productId || campaign?.targetProductId || null,
      eventType: data.eventType,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      createdAt: now,
    });

    return successResponse(
      {
        logged: true,
        campaign: campaign
          ? {
              id: campaign.id,
              name: campaign.name,
              channel: campaign.channel,
              bannerMessage: campaign.bannerMessage,
              customGreeting: campaign.customGreeting,
              promoCode: campaign.promoCode,
              targetProductId: campaign.targetProductId,
            }
          : null,
      },
      'Tracking event berhasil dicatat'
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, error.errors.map((e) => e.message).join(', '));
    }
    console.error('[Marketing Track Error]:', error);
    return errorResponse(500, error.message || 'Gagal memproses tracking');
  }
};
