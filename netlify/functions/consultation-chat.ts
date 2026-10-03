import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { products, aiSettings, chatSessions, chatMessages } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { eq, asc } from 'drizzle-orm';

interface ChatRequest {
  sessionId?: string;
  message?: string;
  action?: 'resume_ai';
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string | null;
  description: string | null;
}

type Turn = { role: 'user' | 'assistant'; content: string };

interface AiConfig {
  provider: string;
  modelName: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
  systemPromptOverride: string;
}

// Dipakai hanya bila database sesaat tidak terjangkau.
const FALLBACK_KNOWLEDGE: ProductItem[] = [
  { id: 'prod_herb_01', name: 'Sido Muncul Bawang Putih (Garlic)', sku: 'HERB-KOL-001', price: 95000, stock: 45, category: 'Kolesterol & Jantung', imageUrl: null, description: '[POM TR 092303861] Ekstrak bawang putih untuk membantu menurunkan kolesterol LDL dan trigliserida. 2x sehari 1 kapsul sesudah makan.' },
  { id: 'prod_herb_07', name: 'Sido Muncul Ginkgo Biloba Memory', sku: 'HERB-KOA-001', price: 120000, stock: 40, category: 'Darah Kental & Sirkulasi', imageUrl: null, description: '[POM TR 092303841] Ekstrak Ginkgo Biloba untuk melancarkan sirkulasi perifer. 2x sehari 1 kapsul sesudah makan.' },
  { id: 'prod_herb_13', name: 'Uric-Herba HerbaMed', sku: 'HERB-URI-001', price: 85000, stock: 50, category: 'Asam Urat & Sendi', imageUrl: null, description: '[POM TR 153385761] Sidaguri dan tempuyung untuk membantu menurunkan asam urat. 3x sehari 2 kapsul sebelum makan.' },
  { id: 'prod_herb_19', name: 'Glucodex HerbaMed', sku: 'HERB-DIA-001', price: 85000, stock: 45, category: 'Diabetes & Gula Darah', imageUrl: null, description: '[POM TR 153385741] Sambiloto dan biji duwet untuk membantu menjaga gula darah. 3x sehari 2 kapsul sebelum makan.' },
  { id: 'prod_herb_25', name: 'Tensicap HerbaMed', sku: 'HERB-TEN-001', price: 85000, stock: 40, category: 'Hipertensi & Tensi Darah', imageUrl: null, description: '[POM TR 153385721] Seledri dan pegagan untuk membantu menjaga tekanan darah. 3x sehari 2 kapsul sebelum makan.' },
];

// ─── Sistem prompt ───────────────────────────────────────
const BASE_SYSTEM_PROMPT = `Anda adalah asisten kesehatan yang ramah di apotek herbal online (seluruh produk berizin BPOM). Bicaralah dalam Bahasa Indonesia yang hangat, sopan, dan santai seperti teman yang peduli. Jawaban singkat: maksimal 3-4 kalimat per giliran.

ATURAN PERCAKAPAN (WAJIB):
1. Di awal percakapan: sapa dan tanyakan kabar atau keluhan pelanggan. JANGAN menyebut produk, harga, daftar penyakit, atau klaim BPOM di awal.
2. Gali dulu keluhan: ajukan SATU atau DUA pertanyaan per giliran (sejak kapan, seberapa sering, pola makan, obat yang rutin diminum, hasil cek lab, usia, hamil/menyusui). Tanggapi jawaban pelanggan dengan empati sebelum bertanya lagi. Jangan seperti interogasi.
3. JANGAN merekomendasikan produk sebelum (a) data cukup: keluhan + durasi + kondisi/obat yang sedang dikonsumsi, DAN (b) pelanggan setuju. Bila data sudah cukup, tawarkan dulu, misalnya: "Boleh saya berikan rekomendasi herbal yang sesuai?" lalu tunggu jawaban setuju.
4. Setelah pelanggan setuju: rekomendasikan maksimal 3 produk DARI KATALOG saja, beri alasan singkat, aturan pakai, dan hal yang perlu diperhatikan. Akhiri jawaban dengan tag [[RECOMMEND:SKU1,SKU2]] memakai SKU persis dari katalog. Tag ini TIDAK BOLEH muncul sebelum pelanggan setuju.
5. Anda bukan dokter: jangan mendiagnosis atau menjanjikan kesembuhan. Sarankan ke dokter bila gejala berat atau berlanjut.
6. Serahkan ke admin manusia dengan menulis tag [[HANDOFF:alasan singkat]] bila: gejala darurat (nyeri dada, sesak napas, pingsan, lumpuh sebelah, bicara pelo), pelanggan hamil/menyusui atau untuk anak, interaksi dengan obat resep yang rumit, pertanyaan di luar katalog atau di luar topik kesehatan, komplain/pesanan/pembayaran, pelanggan meminta bicara dengan manusia, atau Anda tidak yakin. Beritahu pelanggan dengan ramah bahwa admin akan membantu.
7. Jangan menulis tag lain selain [[RECOMMEND:...]] dan [[HANDOFF:...]]. Jangan memakai heading markdown; **tebal** boleh seperlunya.`;

// ─── Helper umum ─────────────────────────────────────────
const nowIso = () => new Date().toISOString();

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function parseTags(raw: string): { text: string; recommendSkus: string[]; handoff: string | null } {
  let recommendSkus: string[] = [];
  let handoff: string | null = null;

  const rec = raw.match(/\[\[RECOMMEND:([^\]]*)\]\]/i);
  if (rec) {
    recommendSkus = rec[1].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  }
  const hand = raw.match(/\[\[HANDOFF(?::([^\]]*))?\]\]/i);
  if (hand) handoff = (hand[1] || 'Diminta AI').trim();

  const text = raw
    .replace(/\[\[RECOMMEND:[^\]]*\]\]/gi, '')
    .replace(/\[\[HANDOFF(?::[^\]]*)?\]\]/gi, '')
    .trim();
  return { text, recommendSkus, handoff };
}

function buildCatalog(items: ProductItem[]): string {
  return items
    .map((p) => {
      const desc = (p.description || '').replace(/\s+/g, ' ').slice(0, 220);
      return `- [${p.sku}] ${p.name} | ${p.category} | Rp ${p.price.toLocaleString('id-ID')} | stok ${p.stock} | ${desc}`;
    })
    .join('\n');
}

// ─── Panggilan ke berbagai provider AI ───────────────────
async function callMultiModelAI(config: AiConfig, system: string, turns: Turn[]): Promise<string | null> {
  const { provider, modelName, apiKey, baseUrl, temperature } = config;
  if (!apiKey || apiKey.trim() === '') return null;

  const temp = Math.max(0, Math.min(1, temperature || 0.4));
  // Semua provider butuh giliran pertama = user
  const convo = [...turns];
  while (convo.length > 0 && convo[0].role !== 'user') convo.shift();
  if (convo.length === 0) return null;

  try {
    if (provider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: convo.map((t) => ({ role: t.role === 'user' ? 'user' : 'model', parts: [{ text: t.content }] })),
          generationConfig: { temperature: temp, maxOutputTokens: 700 }
        })
      });
      if (!res.ok) {
        console.warn(`Gemini HTTP ${res.status}:`, (await res.text()).slice(0, 300));
        return null;
      }
      const json = await res.json();
      const out = json.candidates?.[0]?.content?.parts?.[0]?.text;
      return out ? stripThinking(out) : null;
    }

    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: modelName, system, max_tokens: 700, temperature: temp, messages: convo })
      });
      if (!res.ok) {
        console.warn(`Anthropic HTTP ${res.status}:`, (await res.text()).slice(0, 300));
        return null;
      }
      const json = await res.json();
      const out = json.content?.[0]?.text;
      return out ? stripThinking(out) : null;
    }

    // OpenAI-compatible: openai, deepseek, groq, nvidia, custom, custom_ollama
    if (['openai', 'deepseek', 'groq', 'nvidia', 'custom', 'custom_ollama'].includes(provider)) {
      let defaultBase = 'https://api.openai.com/v1';
      if (provider === 'deepseek') defaultBase = 'https://api.deepseek.com/v1';
      if (provider === 'groq') defaultBase = 'https://api.groq.com/openai/v1';
      if (provider === 'nvidia') defaultBase = 'https://integrate.api.nvidia.com/v1';
      if (provider === 'custom_ollama') defaultBase = 'http://localhost:11434/v1';
      const finalBase = baseUrl && baseUrl.trim() !== '' ? baseUrl.trim().replace(/\/$/, '') : defaultBase;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const res = await fetch(`${finalBase}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelName,
          temperature: temp,
          messages: [{ role: 'system', content: system }, ...convo],
          max_tokens: 700
        })
      });
      if (!res.ok) {
        console.warn(`${provider} HTTP ${res.status}:`, (await res.text()).slice(0, 300));
        return null;
      }
      const json = await res.json();
      const out = json.choices?.[0]?.message?.content;
      return out ? stripThinking(out) : null;
    }
  } catch (apiErr) {
    console.warn(`External AI API call to ${provider} failed, falling back to heuristic engine:`, apiErr);
  }
  return null;
}

// ─── Deteksi serah-terima ke admin ───────────────────────
const EMERGENCY_RE = /(nyeri dada|sesak( napas| nafas)?|pingsan|lumpuh|bicara pelo|mulut mencong|serangan jantung|muntah darah|darurat|ingin bunuh)/i;
const HUMAN_RE = /(\badmin\b|manusia|petugas|operator|\bcs\b|customer service|apoteker|bicara (dengan|sama)|hubungi saya|telepon|komplain|refund|pesanan saya|status pesanan|pembayaran saya|sudah transfer)/i;
const SPECIAL_RE = /(hamil|menyusui|\bbayi\b|\banak (saya|umur|usia))/i;

function detectHandoff(query: string): { reason: string; emergency: boolean } | null {
  if (EMERGENCY_RE.test(query)) return { reason: 'Gejala darurat disebutkan pelanggan', emergency: true };
  if (HUMAN_RE.test(query)) return { reason: 'Pelanggan meminta berbicara dengan admin / urusan pesanan', emergency: false };
  if (SPECIAL_RE.test(query)) return { reason: 'Kondisi khusus (hamil/menyusui/anak) perlu pertimbangan admin', emergency: false };
  return null;
}

// ─── Mesin heuristik (fallback tanpa API key / API gagal) ─
interface Cluster {
  categoryName: string;
  keywords: string[];
  empathy: string;
  q1: string;
  q2: string;
}

const CLUSTERS: Record<string, Cluster> = {
  kolesterol: {
    categoryName: 'Kolesterol & Jantung',
    keywords: ['kolesterol', 'trigliserida', 'ldl', 'lemak darah', 'tengkuk', 'leher tegang', 'leher pegal', 'leher kaku', 'santan', 'gorengan', 'daging merah', 'jeroan', 'kambing'],
    empathy: 'Wah, tengkuk yang kaku dan berat memang bikin tidak nyaman ya 😔',
    q1: 'Boleh tahu, sudah berapa lama keluhan ini dirasakan, dan seberapa sering muncul?',
    q2: 'Apakah Anda pernah cek kolesterol di lab, atau sedang rutin minum obat dari dokter?'
  },
  darahKental: {
    categoryName: 'Darah Kental & Sirkulasi',
    keywords: ['darah kental', 'kesemutan', 'kebas', 'baal', 'ujung jari dingin', 'kaki dingin', 'tangan dingin', 'sirkulasi', 'kram betis', 'kram kaki'],
    empathy: 'Kesemutan dan jari yang dingin itu memang mengganggu aktivitas ya 😔',
    q1: 'Sudah berapa lama dirasakan, dan biasanya muncul di waktu tertentu (misalnya pagi atau setelah duduk lama)?',
    q2: 'Apakah Anda sedang minum obat pengencer darah atau punya riwayat tekanan darah/gula darah tinggi?'
  },
  asamUrat: {
    categoryName: 'Asam Urat & Sendi',
    keywords: ['asam urat', 'urat', 'purin', 'emping', 'sendi', 'nyeri sendi', 'bengkak', 'jempol', 'lutut', 'linu', 'ngilu', 'rematik', 'gout'],
    empathy: 'Nyeri dan bengkak di sendi pasti sangat menyiksa ya 😔',
    q1: 'Sendi bagian mana yang paling sakit, dan sejak kapan mulai terasa?',
    q2: 'Pernah cek kadar asam urat? Dan apakah sedang minum obat dari dokter saat ini?'
  },
  diabetes: {
    categoryName: 'Diabetes & Gula Darah',
    keywords: ['diabetes', 'gula darah', 'glukosa', 'kencing manis', 'sering haus', 'haus terus', 'sering kencing', 'cepat lelah', 'lemas', 'insulin', 'hba1c'],
    empathy: 'Mudah lelah dan sering haus memang bikin tidak bertenaga ya 😔',
    q1: 'Sejak kapan gejalanya terasa, dan apakah gula darah Anda pernah diperiksa?',
    q2: 'Apakah sedang rutin minum obat diabetes atau suntik insulin dari dokter?'
  },
  hipertensi: {
    categoryName: 'Hipertensi & Tensi Darah',
    keywords: ['hipertensi', 'tensi', 'darah tinggi', 'tekanan darah', 'pusing', 'kepala berdenyut', 'migrain', 'pundak berat', 'berdebar'],
    empathy: 'Pusing dan tensi yang tinggi itu pasti bikin cemas ya 😔',
    q1: 'Kira-kira berapa angka tensi terakhir Anda, dan sudah berapa lama keluhan ini?',
    q2: 'Apakah Anda sedang rutin minum obat tekanan darah dari dokter?'
  }
};

const AFFIRM_RE = /\b(ya|iya|iyaa|boleh|oke|ok|okay|silakan|silahkan|mau|setuju|lanjut|baik|tentu|yuk|siap)\b/i;
const NEGATE_RE = /\b(tidak|nggak|gak|ga|jangan|belum|nanti|enggak)\b/i;

function detectCluster(text: string): Cluster | null {
  const lower = text.toLowerCase();
  let best: Cluster | null = null;
  let bestScore = 0;
  for (const c of Object.values(CLUSTERS)) {
    let score = 0;
    for (const kw of c.keywords) if (lower.includes(kw)) score += kw.includes(' ') ? 3 : 1.5;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

function pickProducts(items: ProductItem[], cluster: Cluster, convoText: string): ProductItem[] {
  const lower = convoText.toLowerCase();
  return items
    .filter((p) => (p.category || '').toLowerCase().includes(cluster.categoryName.toLowerCase()))
    .map((p) => {
      let score = 0;
      const hay = `${p.name} ${p.description || ''}`.toLowerCase();
      cluster.keywords.forEach((kw) => {
        if (lower.includes(kw) && hay.includes(kw)) score += 2;
      });
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.p);
}

function formatRecommendation(list: ProductItem[]): string {
  const lines = list
    .map((p, i) => `**${i + 1}. ${p.name}** — Rp ${p.price.toLocaleString('id-ID')}\n${(p.description || '').replace(/\s+/g, ' ').slice(0, 200)}`)
    .join('\n\n');
  return `Terima kasih sudah berkenan 😊 Berdasarkan cerita Anda, ini herbal berizin BPOM yang menurut saya paling sesuai:\n\n${lines}\n\nHerbal ini pendukung gaya hidup sehat, bukan pengganti obat dokter. Kalau ada yang ingin ditanyakan lagi, atau mau dibantu admin, kabari saya ya 🌿`;
}

interface HeuristicResult {
  reply: string;
  stage: string;
  recommended: ProductItem[];
}

function heuristicReply(stage: string, query: string, customerText: string, items: ProductItem[]): HeuristicResult {
  const stepMatch = /^gathering:(\d+)$/.exec(stage);
  const step = stepMatch ? Number(stepMatch[1]) : 0;
  const cluster = detectCluster(customerText);

  // Pelanggan sudah ditanya izin rekomendasi
  if (stage === 'consent_asked') {
    if (NEGATE_RE.test(query) && !AFFIRM_RE.test(query)) {
      return { reply: 'Baik, tidak apa-apa 😊 Silakan lanjut bercerita kalau masih ada yang ingin disampaikan. Saya di sini untuk mendengarkan.', stage: 'gathering:2', recommended: [] };
    }
    if (AFFIRM_RE.test(query) && cluster) {
      const list = pickProducts(items, cluster, customerText);
      if (list.length > 0) return { reply: formatRecommendation(list), stage: 'recommended', recommended: list };
    }
    return { reply: 'Terima kasih infonya 🙏 Jadi, boleh saya berikan rekomendasi herbal yang sesuai dengan kondisi Anda?', stage: 'consent_asked', recommended: [] };
  }

  // Topik baru setelah rekomendasi → ulangi dari awal untuk topik itu
  if (stage === 'recommended') {
    const fresh = detectCluster(query);
    if (!fresh) {
      return { reply: 'Senang bisa membantu 😊 Kalau ada hal lain yang ingin ditanyakan, atau ingin dibantu langsung oleh admin kami, silakan sampaikan saja ya.', stage: 'recommended', recommended: [] };
    }
    return { reply: `${fresh.empathy}\n\n${fresh.q1}`, stage: 'gathering:1', recommended: [] };
  }

  // Belum ada keluhan yang jelas
  if (!cluster) {
    const reply =
      step === 0
        ? 'Halo, senang bertemu Anda! 😊 Bagaimana kabarnya hari ini?\n\nBoleh ceritakan apa yang sedang Anda rasakan atau ingin Anda konsultasikan? Santai saja, saya siap mendengarkan.'
        : 'Terima kasih sudah bercerita 🙏 Supaya saya bisa memahami lebih baik, boleh dijelaskan lebih detail keluhannya — bagian tubuh mana yang terasa tidak nyaman dan sejak kapan?';
    return { reply, stage: step === 0 ? 'greeting' : stage, recommended: [] };
  }

  // Menggali informasi bertahap
  const next = step + 1;
  if (next === 1) return { reply: `${cluster.empathy}\n\n${cluster.q1}`, stage: 'gathering:1', recommended: [] };
  if (next === 2) return { reply: `Terima kasih sudah menjelaskan 🙏\n\n${cluster.q2}`, stage: 'gathering:2', recommended: [] };
  return {
    reply: 'Terima kasih, informasinya sangat membantu 🙏 Saya sudah punya gambaran kondisi Anda.\n\nBoleh saya berikan rekomendasi herbal berizin BPOM yang sesuai?',
    stage: 'consent_asked',
    recommended: []
  };
}

// ─── Handler ─────────────────────────────────────────────
const HANDOFF_REPLY =
  'Baik, saya teruskan percakapan ini ke tim admin kami ya 🙏 Mohon tunggu sebentar — Anda tetap bisa menulis di sini, pesan Anda akan langsung terbaca oleh admin.';
const EMERGENCY_REPLY =
  'Mohon maaf mendengarnya 🙏 Gejala yang Anda sebutkan bisa jadi serius. Segera hubungi layanan darurat (112/119) atau datang ke IGD terdekat — jangan menunggu herbal.\n\nSaya juga sudah meneruskan percakapan ini ke admin kami agar bisa menindaklanjuti.';

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    const body: ChatRequest = await req.json();
    const query = (body.message || '').trim();
    const db = createDb();

    // ── 1. Sesi ──
    let session: any = null;
    if (body.sessionId) {
      const rows = await db.select().from(chatSessions).where(eq(chatSessions.id, body.sessionId)).limit(1);
      session = rows[0] || null;
    }
    if (!session) {
      const t = nowIso();
      session = { id: `chat_${crypto.randomUUID()}`, status: 'ai', stage: 'greeting', handoffReason: null, createdAt: t, updatedAt: t };
      await db.insert(chatSessions).values(session);
    }

    const saveMessage = async (sender: 'customer' | 'bot' | 'admin', content: string, prods?: ProductItem[]) => {
      await db.insert(chatMessages).values({
        id: `msg_${crypto.randomUUID()}`,
        sessionId: session.id,
        sender,
        content,
        productsJson: prods && prods.length > 0 ? JSON.stringify(prods) : null,
        createdAt: nowIso()
      });
    };
    const updateSession = async (patch: Record<string, unknown>) => {
      await db.update(chatSessions).set({ ...patch, updatedAt: nowIso() }).where(eq(chatSessions.id, session.id));
      session = { ...session, ...patch };
    };

    // ── 2. Pelanggan memilih kembali ke asisten AI ──
    if (body.action === 'resume_ai') {
      const reply = 'Baik, saya kembali mendampingi Anda ya 😊 Silakan lanjutkan ceritanya.';
      await updateSession({ status: 'ai' });
      await saveMessage('bot', reply);
      return successResponse({ sessionId: session.id, status: 'ai', reply, recommendedProducts: [] });
    }

    if (!query) return errorResponse(400, 'Pesan tidak boleh kosong');

    await saveMessage('customer', query);

    // ── 3. Sedang ditangani admin: simpan saja, jangan dijawab bot ──
    if (session.status === 'waiting_admin' || session.status === 'admin') {
      await updateSession({});
      return successResponse({ sessionId: session.id, status: session.status, reply: null, handoff: true, recommendedProducts: [] });
    }

    // ── 4. Pemicu serah-terima berbasis aturan ──
    const rule = detectHandoff(query);
    if (rule) {
      const reply = rule.emergency ? EMERGENCY_REPLY : HANDOFF_REPLY;
      await updateSession({ status: 'waiting_admin', handoffReason: rule.reason });
      await saveMessage('bot', reply);
      return successResponse({ sessionId: session.id, status: 'waiting_admin', reply, handoff: true, recommendedProducts: [] });
    }

    // ── 5. Data pendukung: katalog, konfigurasi AI, riwayat ──
    let catalog: ProductItem[] = [];
    let aiConfig: AiConfig = {
      provider: 'gemini',
      modelName: 'gemini-2.0-flash',
      apiKey: process.env.GEMINI_API_KEY || '',
      baseUrl: '',
      temperature: 0.4,
      systemPromptOverride: ''
    };
    try {
      const [items, aiRows] = await Promise.all([
        db.select().from(products).where(eq(products.isActive, true)),
        db.select().from(aiSettings).where(eq(aiSettings.isActive, true)).limit(1)
      ]);
      catalog = items
        .map((p: any) => ({
          id: p.id, name: p.name, sku: p.sku, price: Number(p.price), stock: Number(p.stock),
          category: p.category, imageUrl: p.imageUrl, description: p.description
        }))
        .filter((p: ProductItem) => p.stock > 0);
      if (aiRows && aiRows.length > 0) {
        aiConfig = {
          provider: aiRows[0].provider || 'gemini',
          modelName: aiRows[0].modelName || 'gemini-2.0-flash',
          apiKey: aiRows[0].apiKey || process.env.GEMINI_API_KEY || '',
          baseUrl: aiRows[0].baseUrl || '',
          temperature: Number(aiRows[0].temperature) || 0.4,
          systemPromptOverride: aiRows[0].systemPromptOverride || ''
        };
      }
    } catch (dbErr) {
      console.warn('Database fetch warning, using fallback knowledge base:', dbErr);
    }
    if (catalog.length === 0) catalog = FALLBACK_KNOWLEDGE;

    const history: any[] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, session.id))
      .orderBy(asc(chatMessages.createdAt));
    const turns: Turn[] = history.slice(-16).map((m: any) => ({
      role: m.sender === 'customer' ? 'user' : 'assistant',
      content: m.content
    }));
    const customerText = history.filter((m: any) => m.sender === 'customer').map((m: any) => m.content).join(' \n ');

    // ── 6. Jawaban: AI dulu, heuristik sebagai cadangan ──
    let replyText = '';
    let recommended: ProductItem[] = [];
    let nextStage: string = session.stage;
    let handoffReason: string | null = null;
    let usedFallback = false;

    const system =
      `${BASE_SYSTEM_PROMPT}` +
      (aiConfig.systemPromptOverride.trim() ? `\n\nINSTRUKSI TAMBAHAN DARI ADMIN:\n${aiConfig.systemPromptOverride.trim()}` : '') +
      `\n\nKATALOG PRODUK (satu-satunya sumber rekomendasi):\n${buildCatalog(catalog)}`;

    const aiRaw = await callMultiModelAI(aiConfig, system, turns);

    if (aiRaw) {
      const parsed = parseTags(aiRaw);
      replyText = parsed.text;
      handoffReason = parsed.handoff;
      if (parsed.recommendSkus.length > 0 && !handoffReason) {
        recommended = parsed.recommendSkus
          .map((sku) => catalog.find((p) => p.sku.toUpperCase() === sku))
          .filter(Boolean)
          .slice(0, 3) as ProductItem[];
        if (recommended.length > 0) nextStage = 'recommended';
      }
      if (nextStage === 'greeting') nextStage = 'gathering:1';
    }

    if (!replyText) {
      usedFallback = true;
      const h = heuristicReply(session.stage, query, customerText, catalog);
      replyText = h.reply;
      recommended = h.recommended;
      nextStage = h.stage;
    }

    if (handoffReason) {
      await updateSession({ status: 'waiting_admin', handoffReason, stage: nextStage });
    } else {
      await updateSession({ stage: nextStage });
    }
    await saveMessage('bot', replyText, recommended);

    return successResponse({
      sessionId: session.id,
      status: session.status,
      stage: nextStage,
      reply: replyText,
      handoff: Boolean(handoffReason),
      recommendedProducts: recommended,
      activeProvider: aiConfig.provider,
      activeModel: aiConfig.modelName,
      usedFallback
    });
  } catch (err: any) {
    console.error('Error in consultation-chat handler:', err);
    return errorResponse(500, err?.message || 'Terjadi kesalahan sistem konsultasi');
  }
};
