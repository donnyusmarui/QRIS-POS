import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { chatSessions, chatMessages } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { eq, asc, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';

// Inbox admin untuk human-in-the-loop. Izin 'customers:manage' dipakai karena
// admin, manajer, dan kasir sama-sama melayani pelanggan.
//   GET            → daftar sesi (terbaru + pesan terakhir)
//   GET ?id=xxx    → detail sesi + seluruh pesan
//   POST           → { sessionId, action: reply | return_to_ai | close, message? }
const postSchema = z.object({
  sessionId: z.string().min(1),
  action: z.enum(['reply', 'return_to_ai', 'close']),
  message: z.string().optional()
});

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    await requirePermission(req, 'customers:manage');
    const db = createDb();
    const now = new Date().toISOString();

    if (req.method === 'GET') {
      const id = new URL(req.url).searchParams.get('id');

      if (id) {
        const s = await db.select().from(chatSessions).where(eq(chatSessions.id, id)).limit(1);
        if (s.length === 0) return errorResponse(404, 'Sesi tidak ditemukan');
        const rows: any[] = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.sessionId, id))
          .orderBy(asc(chatMessages.createdAt));
        return successResponse({
          session: s[0],
          messages: rows.map((m) => ({
            id: m.id,
            sender: m.sender,
            content: m.content,
            products: m.productsJson ? JSON.parse(m.productsJson) : [],
            createdAt: m.createdAt
          }))
        });
      }

      const sessions: any[] = await db.select().from(chatSessions).orderBy(desc(chatSessions.updatedAt)).limit(50);
      const last = new Map<string, any>();
      if (sessions.length > 0) {
        const msgs: any[] = await db
          .select()
          .from(chatMessages)
          .where(inArray(chatMessages.sessionId, sessions.map((s) => s.id)))
          .orderBy(asc(chatMessages.createdAt));
        for (const m of msgs) last.set(m.sessionId, m); // terakhir menimpa → pesan terbaru
      }

      const list = sessions.map((s) => ({
        id: s.id,
        status: s.status,
        handoffReason: s.handoffReason,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        lastMessage: last.get(s.id)?.content?.slice(0, 120) || '',
        lastSender: last.get(s.id)?.sender || ''
      }));
      return successResponse(list);
    }

    if (req.method === 'POST') {
      const parsed = postSchema.safeParse(await req.json());
      if (!parsed.success) return errorResponse(400, parsed.error.errors[0]?.message || 'Data tidak valid');
      const { sessionId, action, message } = parsed.data;

      const s = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).limit(1);
      if (s.length === 0) return errorResponse(404, 'Sesi tidak ditemukan');

      const addMessage = (sender: string, content: string) =>
        db.insert(chatMessages).values({
          id: `msg_${crypto.randomUUID()}`,
          sessionId,
          sender,
          content,
          productsJson: null,
          createdAt: new Date().toISOString()
        });

      if (action === 'reply') {
        const text = (message || '').trim();
        if (!text) return errorResponse(400, 'Pesan tidak boleh kosong');
        await addMessage('admin', text);
        await db.update(chatSessions).set({ status: 'admin', updatedAt: now }).where(eq(chatSessions.id, sessionId));
      } else if (action === 'return_to_ai') {
        await addMessage('bot', 'Terima kasih sudah menunggu 🙏 Saya kembali mendampingi Anda ya. Silakan lanjutkan ceritanya.');
        await db.update(chatSessions).set({ status: 'ai', updatedAt: now }).where(eq(chatSessions.id, sessionId));
      } else {
        await db.update(chatSessions).set({ status: 'closed', updatedAt: now }).where(eq(chatSessions.id, sessionId));
      }

      return successResponse({ sessionId, action });
    }

    return errorResponse(405, 'Method Not Allowed');
  } catch (err: any) {
    if (err?.statusCode) return errorResponse(err.statusCode, err.message || 'Unauthorized');
    console.error('Error in chat-admin:', err);
    return errorResponse(500, err?.message || 'Gagal memproses inbox chat');
  }
};
