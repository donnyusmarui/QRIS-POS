import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { chatSessions, chatMessages } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { eq, asc } from 'drizzle-orm';

// Publik (tanpa login): widget pelanggan memanggil ini untuk menerima balasan admin
// dan memulihkan riwayat. sessionId berupa UUID acak sebagai kunci akses.
// GET ?sessionId=xxx[&after=ISO]
export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'GET') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    const params = new URL(req.url).searchParams;
    const sessionId = params.get('sessionId');
    const after = params.get('after');
    if (!sessionId) return errorResponse(400, 'sessionId wajib diisi');

    const db = createDb();
    const sessions = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).limit(1);
    if (sessions.length === 0) return errorResponse(404, 'Sesi tidak ditemukan');

    const rows: any[] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt));

    const messages = rows
      .filter((m) => !after || m.createdAt > after)
      .map((m) => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        products: m.productsJson ? JSON.parse(m.productsJson) : [],
        createdAt: m.createdAt
      }));

    return successResponse({ status: sessions[0].status, messages });
  } catch (err: any) {
    console.error('Error in chat-poll:', err);
    return errorResponse(500, err?.message || 'Gagal memuat percakapan');
  }
};
