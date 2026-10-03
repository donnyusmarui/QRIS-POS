import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { chatbotWelcomeMessages, aiSettings } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const postSchema = z.object({
  action: z.enum(['create', 'update', 'delete', 'activate', 'generate_ai']),
  id: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  isActive: z.boolean().optional(),
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
      const list = await db
        .select()
        .from(chatbotWelcomeMessages)
        .orderBy(desc(chatbotWelcomeMessages.createdAt));
      return successResponse(list);
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const parseResult = postSchema.safeParse(body);
      if (!parseResult.success) {
        return errorResponse(400, 'Data permintaan tidak valid: ' + parseResult.error.message);
      }
      const { action, id, title, content, isActive } = parseResult.data;

      // ── 1. Create Welcome Message ──
      if (action === 'create') {
        if (!title || !content) {
          return errorResponse(400, 'Judul dan konten sapaan wajib diisi');
        }
        const newId = `wm_${crypto.randomUUID()}`;
        if (isActive) {
          await db.update(chatbotWelcomeMessages).set({ isActive: false, updatedAt: now });
        }
        await db.insert(chatbotWelcomeMessages).values({
          id: newId,
          title,
          content,
          isActive: isActive ?? false,
          createdAt: now,
          updatedAt: now,
        });
        return successResponse({ id: newId }, 'Sapaan baru berhasil ditambahkan');
      }

      // ── 2. Update Welcome Message ──
      if (action === 'update') {
        if (!id) return errorResponse(400, 'ID sapaan wajib disertakan');
        const patch: Record<string, any> = { updatedAt: now };
        if (title !== undefined) patch.title = title;
        if (content !== undefined) patch.content = content;
        if (isActive !== undefined) {
          patch.isActive = isActive;
          if (isActive) {
            await db.update(chatbotWelcomeMessages).set({ isActive: false, updatedAt: now });
          }
        }
        await db.update(chatbotWelcomeMessages).set(patch).where(eq(chatbotWelcomeMessages.id, id));
        return successResponse({ id }, 'Sapaan berhasil diperbarui');
      }

      // ── 3. Delete Welcome Message ──
      if (action === 'delete') {
        if (!id) return errorResponse(400, 'ID sapaan wajib disertakan');
        await db.delete(chatbotWelcomeMessages).where(eq(chatbotWelcomeMessages.id, id));
        // Jika tidak ada yang aktif, aktifkan yang pertama
        const remaining = await db.select().from(chatbotWelcomeMessages).limit(1);
        if (remaining.length > 0) {
          await db.update(chatbotWelcomeMessages).set({ isActive: true, updatedAt: now }).where(eq(chatbotWelcomeMessages.id, remaining[0].id));
        }
        return successResponse({ id }, 'Sapaan berhasil dihapus');
      }

      // ── 4. Activate Welcome Message ──
      if (action === 'activate') {
        if (!id) return errorResponse(400, 'ID sapaan wajib disertakan');
        await db.update(chatbotWelcomeMessages).set({ isActive: false, updatedAt: now });
        await db.update(chatbotWelcomeMessages).set({ isActive: true, updatedAt: now }).where(eq(chatbotWelcomeMessages.id, id));
        return successResponse({ id }, 'Sapaan aktif berhasil diperbarui');
      }

      // ── 5. Generate AI Welcome Message Suggestions ──
      if (action === 'generate_ai') {
        const activeAiList = await db.select().from(aiSettings).where(eq(aiSettings.isActive, true)).limit(1);
        const ai = activeAiList[0] || null;

        const prompt = `Anda adalah konsultan komunikasi senior apotek medika dan herbalis berizin BPOM.
Buatlah tepat 3 variasi pesan sapaan pembuka (Welcome Message) untuk chatbot apotek herbal online.
Kriteria:
1. Hangat, bersahabat, sopan, dan penuh empati layaknya teman peduli kesehatan.
2. Gunakan placeholder "{{name}}" untuk nama pelanggan (misal: "Halo Kak {{name}}, senang bertemu Anda!").
3. Mengajak pelanggan nyaman menceritakan keluhan kesehatan tanpa terkesan memaksa jualan di awal.
4. Jangan menulis format markdown aneh.

Format output WAJIB berupa JSON Array murni tanpa blok markdown atau tag lain:
[
  {
    "title": "Sapaan Hangat & Empatik",
    "content": "Halo Kak {{name}}, selamat datang di Apotek Herbal Medika! Bagaimana kabar kesehatan Anda hari ini? Jika ada keluhan yang mengganjal, jangan sungkan bercerita ya, kami siap mendengarkan."
  },
  {
    "title": "Sapaan Konsultatif Ringan",
    "content": "..."
  },
  {
    "title": "Sapaan Ramah Solutif",
    "content": "..."
  }
]`;

        let rawOutput: string | null = null;

        if (ai && ai.apiKey) {
          try {
            if (ai.provider === 'gemini') {
              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${ai.modelName}:generateContent?key=${ai.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(9000),
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: [{ text: prompt }] }],
                  generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
                })
              });
              if (res.ok) {
                const data = await res.json();
                rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
              }
            } else {
              let baseUrl = ai.baseUrl || 'https://api.openai.com/v1';
              if (ai.provider === 'deepseek') baseUrl = 'https://api.deepseek.com/v1';
              if (ai.provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1';
              if (ai.provider === 'nvidia') baseUrl = 'https://integrate.api.nvidia.com/v1';

              const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${ai.apiKey}`
                },
                signal: AbortSignal.timeout(9000),
                body: JSON.stringify({
                  model: ai.modelName,
                  messages: [{ role: 'user', content: prompt }],
                  temperature: 0.7,
                  max_tokens: 1000
                })
              });
              if (res.ok) {
                const data = await res.json();
                rawOutput = data.choices?.[0]?.message?.content || null;
              }
            }
          } catch (e) {
            console.warn('AI generator error, fallback to curated presets:', e);
          }
        }

        let suggestions: Array<{ title: string; content: string }> = [];
        if (rawOutput) {
          try {
            const cleanJson = rawOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              suggestions = parsed.slice(0, 3);
            }
          } catch (e) {
            console.warn('Failed to parse AI suggestions JSON:', e);
          }
        }

        if (suggestions.length === 0) {
          suggestions = [
            {
              title: 'Sapaan Hangat & Empatis',
              content: 'Halo Kak {{name}}, selamat datang di Apotek Herbal Medika! Senang sekali bisa menyapa Anda 🙏 Boleh ceritakan bagaimana kondisi kesehatan Anda hari ini? Kami siap mendengarkan dengan sepenuh hati.'
            },
            {
              title: 'Sapaan Apoteker Peduli',
              content: 'Selamat datang Kak {{name}}! Kesehatan keluarga adalah prioritas utama. Jika ada keluhan tengkuk kaku, nyeri sendi, tensi, atau lainnya yang sedang dirasakan, silakan konsultasikan di sini ya 🌿'
            },
            {
              title: 'Sapaan Ringkas & Solutif',
              content: 'Halo Kak {{name}}, apa kabar hari ini? Kami mendampingi ikhtiar sehat Anda dengan herbal resmi terdaftar BPOM. Ada yang bisa kami bantu seputar keluhan kesehatan Anda?'
            }
          ];
        }

        return successResponse(suggestions, 'Rekomendasi sapaan berhasil dibuat');
      }

      return errorResponse(400, 'Aksi tidak dikenali');
    }

    return errorResponse(405, 'Metode tidak didukung');
  } catch (err: any) {
    if (err?.statusCode === 401 || err?.statusCode === 403) {
      return errorResponse(err.statusCode, err.message);
    }
    console.error('Error in welcome-message-manage:', err);
    return errorResponse(500, err?.message || 'Terjadi kesalahan sistem');
  }
};
