import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { chatSessions, chatMessages } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { eq, asc, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';

const postSchema = z.object({
  sessionId: z.string().min(1),
  action: z.enum([
    'reply',
    'return_to_ai',
    'close',
    'update_lead',
    'update_notes',
    'toggle_archive',
    'delete'
  ]),
  message: z.string().optional(),
  leadStatus: z.enum(['hot_lead', 'general_inquiry', 'waiting_admin', 'archived']).optional(),
  adminNotes: z.string().optional(),
  isArchived: z.boolean().optional(),
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
      const url = new URL(req.url);
      const id = url.searchParams.get('id');

      // ── 1. Detail Sesi Tunggal ──
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

      // ── 2. Daftar Sesi dengan Filter Tanggal, Jam, Status, dan Pencarian ──
      const filterDate = url.searchParams.get('date'); // YYYY-MM-DD
      const filterMonth = url.searchParams.get('month'); // YYYY-MM
      const filterTimeSlot = url.searchParams.get('timeSlot'); // morning (06-12), afternoon (12-18), evening (18-24), night (00-06)
      const filterLeadStatus = url.searchParams.get('leadStatus'); // hot_lead, general_inquiry, etc.
      const filterArchived = url.searchParams.get('archived'); // 'true' | 'false' | 'all'
      const search = (url.searchParams.get('search') || '').trim().toLowerCase();

      const allSessions: any[] = await db
        .select()
        .from(chatSessions)
        .orderBy(desc(chatSessions.updatedAt))
        .limit(100);

      const lastMap = new Map<string, any>();
      if (allSessions.length > 0) {
        const msgs: any[] = await db
          .select()
          .from(chatMessages)
          .where(inArray(chatMessages.sessionId, allSessions.map((s) => s.id)))
          .orderBy(asc(chatMessages.createdAt));
        for (const m of msgs) lastMap.set(m.sessionId, m);
      }

      const filtered = allSessions.filter((s) => {
        // Filter Arsip: default tampilkan non-arsip jika filterArchived kosong
        if (filterArchived === 'true' && !s.isArchived) return false;
        if (filterArchived === 'false' && s.isArchived) return false;
        if (!filterArchived && s.isArchived) return false;

        // Filter Lead Status
        if (filterLeadStatus && filterLeadStatus !== 'all' && s.leadStatus !== filterLeadStatus) {
          return false;
        }

        // Filter Tanggal
        if (filterDate) {
          const sessionDate = (s.createdAt || '').slice(0, 10);
          if (sessionDate !== filterDate) return false;
        }

        // Filter Bulan
        if (filterMonth) {
          const sessionMonth = (s.createdAt || '').slice(0, 7);
          if (sessionMonth !== filterMonth) return false;
        }

        // Filter Jam (Slot Waktu)
        if (filterTimeSlot && filterTimeSlot !== 'all') {
          const dt = new Date(s.createdAt);
          const hour = dt.getHours(); // 0 - 23
          if (filterTimeSlot === 'morning' && (hour < 6 || hour >= 12)) return false;
          if (filterTimeSlot === 'afternoon' && (hour < 12 || hour >= 18)) return false;
          if (filterTimeSlot === 'evening' && (hour < 18 || hour >= 24)) return false;
          if (filterTimeSlot === 'night' && (hour < 0 || hour >= 6)) return false;
        }

        // Pencarian Teks
        if (search) {
          const name = (s.customerName || '').toLowerCase();
          const phone = (s.customerPhone || '').toLowerCase();
          const reason = (s.handoffReason || '').toLowerCase();
          const lastText = (lastMap.get(s.id)?.content || '').toLowerCase();
          if (!name.includes(search) && !phone.includes(search) && !reason.includes(search) && !lastText.includes(search)) {
            return false;
          }
        }

        return true;
      });

      const list = filtered.map((s) => ({
        id: s.id,
        status: s.status,
        stage: s.stage,
        handoffReason: s.handoffReason,
        customerName: s.customerName || 'Tamu Apotek',
        customerPhone: s.customerPhone || null,
        leadStatus: s.leadStatus || 'general_inquiry',
        adminNotes: s.adminNotes || '',
        isArchived: Boolean(s.isArchived),
        symptoms: s.symptomsJson ? JSON.parse(s.symptomsJson) : [],
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        lastMessage: lastMap.get(s.id)?.content?.slice(0, 140) || '',
        lastSender: lastMap.get(s.id)?.sender || ''
      }));

      return successResponse(list);
    }

    if (req.method === 'POST') {
      const parsed = postSchema.safeParse(await req.json());
      if (!parsed.success) return errorResponse(400, parsed.error.errors[0]?.message || 'Data tidak valid');
      const { sessionId, action, message, leadStatus, adminNotes, isArchived } = parsed.data;

      const s = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).limit(1);
      if (s.length === 0) return errorResponse(404, 'Sesi tidak ditemukan');

      // ── 1. Balas Langsung ke Pelanggan ──
      if (action === 'reply') {
        const text = (message || '').trim();
        if (!text) return errorResponse(400, 'Pesan balasan tidak boleh kosong');
        await db.insert(chatMessages).values({
          id: `msg_${crypto.randomUUID()}`,
          sessionId,
          sender: 'admin',
          content: text,
          productsJson: null,
          createdAt: now
        });
        await db.update(chatSessions).set({ status: 'admin', updatedAt: now }).where(eq(chatSessions.id, sessionId));
        return successResponse({ sessionId, action: 'reply' }, 'Pesan balasan terkirim');
      }

      // ── 2. Kembalikan Percakapan ke AI ──
      if (action === 'return_to_ai') {
        await db.insert(chatMessages).values({
          id: `msg_${crypto.randomUUID()}`,
          sessionId,
          sender: 'bot',
          content: 'Terima kasih sudah menunggu 🙏 Saya kembali mendampingi Anda ya. Silakan lanjutkan ceritanya.',
          productsJson: null,
          createdAt: now
        });
        await db.update(chatSessions).set({ status: 'ai', updatedAt: now }).where(eq(chatSessions.id, sessionId));
        return successResponse({ sessionId, action: 'return_to_ai' }, 'Sesi diserahkan kembali ke AI');
      }

      // ── 3. Tutup Sesi ──
      if (action === 'close') {
        await db.update(chatSessions).set({ status: 'closed', updatedAt: now }).where(eq(chatSessions.id, sessionId));
        return successResponse({ sessionId, action: 'close' }, 'Sesi ditutup');
      }

      // ── 4. Update Lead Status (CRM Grouping) ──
      if (action === 'update_lead') {
        if (!leadStatus) return errorResponse(400, 'Status prospek wajib dipilih');
        await db.update(chatSessions).set({ leadStatus, updatedAt: now }).where(eq(chatSessions.id, sessionId));
        return successResponse({ sessionId, leadStatus }, 'Status prospek diperbarui');
      }

      // ── 5. Update Catatan Admin ──
      if (action === 'update_notes') {
        await db.update(chatSessions).set({ adminNotes: adminNotes || '', updatedAt: now }).where(eq(chatSessions.id, sessionId));
        return successResponse({ sessionId, adminNotes }, 'Catatan admin disimpan');
      }

      // ── 6. Arsipkan / Buka Arsip Sesi ──
      if (action === 'toggle_archive') {
        const nextArchived = isArchived !== undefined ? isArchived : !s[0].isArchived;
        await db.update(chatSessions).set({ isArchived: nextArchived, updatedAt: now }).where(eq(chatSessions.id, sessionId));
        return successResponse({ sessionId, isArchived: nextArchived }, nextArchived ? 'Sesi diarsipkan' : 'Sesi diaktifkan kembali');
      }

      // ── 7. Hapus Sesi ──
      if (action === 'delete') {
        await db.delete(chatSessions).where(eq(chatSessions.id, sessionId));
        return successResponse({ sessionId }, 'Sesi percakapan berhasil dihapus');
      }

      return errorResponse(400, 'Aksi tidak dikenali');
    }

    return errorResponse(405, 'Method Not Allowed');
  } catch (err: any) {
    if (err?.statusCode) return errorResponse(err.statusCode, err.message || 'Unauthorized');
    console.error('Error in chat-admin:', err);
    return errorResponse(500, err?.message || 'Gagal memproses inbox chat');
  }
};
