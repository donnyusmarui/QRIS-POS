import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { products, aiSettings, chatSessions, chatMessages, chatbotConfig, storeProfile } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { normalizeSkuOrText } from './_shared/vector-engine';
import { eq, asc } from 'drizzle-orm';

interface ChatRequest {
  sessionId?: string;
  message?: string;
  action?: 'resume_ai';
  customerName?: string;
  customerPhone?: string;
  symptoms?: string[];
  source?: 'rag_main' | 'product';
  productId?: string;
  productName?: string;
  productSku?: string;
  productCategory?: string;
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
const BASE_SYSTEM_PROMPT = `Anda adalah Apoteker Pendamping Klinis berlisensi di Apotek Herbal Medika (seluruh produk berizin resmi BPOM RI). Bicaralah dalam Bahasa Indonesia yang hangat, empatik, santun, dan profesional layaknya apoteker yang mendampingi pasien secara langsung. Jawaban ringkas dan nyaman dibaca: maksimal 3-5 kalimat per giliran.

GUARDRAILS DOMAIN KESEHATAN (MUTLAK & STRIKTIF):
- Jika pengguna menanyakan topik DI LUAR kesehatan manusia, gaya hidup sehat, atau farmasi herbal (contoh: coding/pemrograman, politik/pemilu, perbaikan mesin/kendaraan, resep masakan non-herbal, tugas sekolah, matematika, lelucon, dll.):
  Anda WAJIB MENOLAK DENGAN SANTUN menggunakan template berikut:
  "Mohon maaf, saya dirancang khusus untuk mendampingi konsultasi kesehatan herbal dan pola hidup sehat keluarga. Boleh ceritakan apakah ada keluhan fisik atau kondisi kesehatan yang sedang Anda rasakan?"
  JANGAN PERNAH melayani atau menjawab obrolan non-kesehatan tersebut.

PROTOKOL ANTI-INTEROGASI & 3-TURN WARM ASSESSMENT ENGINE:
1. JANGAN PERNAH membuat pasien merasa diinterogasi dengan rentetan pertanyaan beruntun yang kaku.
2. Setiap kali pasien menceritakan keluhan:
   - SELALU berikan validasi empati hangat terlebih dahulu.
   - Sertakan sedikit edukasi medis ringan / penjelasan fisiologis sederhana mengapa gejala tersebut bisa muncul (misal: leher kaku di pagi hari kerap berkaitan dengan sirkulasi darah yang kurang lancar atau ketegangan otot leher).
   - Berikan tips gaya hidup praktis (misal: hidrasi air hangat, kompres hangat, kurangi makanan bersantan/jeroan).
   - Ajukan HANYA SATU pertanyaan lanjutan ramah dan mengalir alami.
3. ATURAN REKOMENDASI PRODUK (SANGAT KETAT):
   - Turn 1 & Turn 2: DILARANG KERAS menyebutkan merk atau nama produk herbal katalog apapun! Fokus pada mendengarkan dan edukasi.
   - Turn 3 (Setelah informasi cukup): Buat rangkuman singkat dari keluhan pasien, lalu MINTA IZIN DENGAN SOPAN:
     "Melihat kondisi Kakak, kami memiliki rekomendasi ramuan herbal alami berizin resmi BPOM yang cocok untuk membantu keluhan tersebut. Boleh saya bagikan rekomendasi dan aturan minumnya?"
   - Turn 4+ / Pasien Menyatakan Setuju (misal: "ya", "boleh", "silakan"): BARU berikan maksimal 2-3 rekomendasi produk DARI KATALOG dengan aturan pakai jelas, dan akhiri pesan dengan tag [[RECOMMEND:SKU1,SKU2]].
4. Anda bukan dokter spesialis: jangan mendiagnosis penyakit kronis atau menjanjikan kesembuhan instan 100%.
5. Serahkan ke admin apoteker manusia dengan tag [[HANDOFF:alasan singkat]] bila: gejala darurat mengancam nyawa (nyeri dada tembus punggung, sesak napas berat, pingsan, lumpuh separuh badan), pasien hamil/menyusui, atau pasien meminta berbicara langsung dengan manusia.`;

// ─── Helper umum ─────────────────────────────────────────
const nowIso = () => new Date().toISOString();

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function parseTags(raw: string, userAllowsRecommendation: boolean = false, catalog: ProductItem[] = []): { text: string; recommendSkus: string[]; handoff: string | null } {
  let recommendSkus: string[] = [];
  let handoff: string | null = null;

  const rec = raw.match(/\[\[RECOMMEND:([^\]]*)\]\]/i);
  if (rec) {
    recommendSkus = rec[1].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  } else if (userAllowsRecommendation && catalog.length > 0) {
    // Fallback umum: cocokkan teks balasan dengan SKU apa pun yang benar-benar ada di katalog aktif
    const normRaw = normalizeSkuOrText(raw);
    for (const p of catalog) {
      const normSku = normalizeSkuOrText(p.sku);
      if (normSku && normRaw.includes(normSku)) {
        recommendSkus.push(p.sku.toUpperCase());
      }
    }
    recommendSkus = Array.from(new Set(recommendSkus));
  }
  const hand = raw.match(/\[\[HANDOFF(?::([^\]]*))?\]\]/i);
  if (hand) handoff = (hand[1] || 'Diminta AI').trim();

  const text = raw
    .replace(/\[\[RECOMMEND:[^\]]*\]\]/gi, '')
    .replace(/\[\[HANDOFF(?::[^\]]*)?\]\]/gi, '')
    .trim();
  return { text, recommendSkus, handoff };
}

function findQueriedProduct(query: string, items: ProductItem[]): ProductItem | null {
  if (!query) return null;
  const normQuery = normalizeSkuOrText(query);
  if (!normQuery) return null;

  // 1. Cek kecocokan SKU eksak atau parsial (misal: HERB-DIA-001 atau HERBDIA001)
  for (const p of items) {
    const normSku = normalizeSkuOrText(p.sku);
    if (normSku && (normQuery === normSku || normQuery.includes(normSku))) {
      return p;
    }
  }

  // 2. Cek nama produk langsung
  const lower = query.toLowerCase();
  for (const p of items) {
    if (p.name && lower.includes(p.name.toLowerCase())) {
      return p;
    }
  }
  return null;
}

// ─── Smart Context Retrieval: Hanya suntikkan Top-3 produk relevan & stok > 0 ───
function selectTopRelevantProducts(
  query: string,
  customerText: string,
  catalog: ProductItem[],
  queriedProduct?: ProductItem | null,
  topK = 3
): ProductItem[] {
  // Hanya ambil produk dengan stok aktif > 0
  const available = catalog.filter((p) => Number(p.stock) > 0);
  if (available.length === 0) return [];

  const results: ProductItem[] = [];

  // Jika pasien menanyakan produk spesifik yang stoknya ada, prioritaskan di posisi pertama
  if (queriedProduct && Number(queriedProduct.stock) > 0) {
    results.push(queriedProduct);
  }

  const combinedQuery = `${query} ${customerText}`.toLowerCase();
  const queryTokens = combinedQuery.split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
  const normCombined = normalizeSkuOrText(combinedQuery);

  const scored = available
    .filter((p) => !results.some((r) => r.id === p.id))
    .map((p) => {
      let score = 0;
      const normSku = normalizeSkuOrText(p.sku);
      const prodName = (p.name || '').toLowerCase();
      const prodDesc = (p.description || '').toLowerCase();
      const prodCat = (p.category || '').toLowerCase();

      // Skor SKU
      if (normSku && normCombined.includes(normSku)) score += 10;
      // Skor Nama
      if (combinedQuery.includes(prodName)) score += 6;
      // Skor Kategori
      if (prodCat && combinedQuery.includes(prodCat)) score += 3;

      // Skor Token / Gejala
      for (const token of queryTokens) {
        if (prodName.includes(token)) score += 2;
        if (prodDesc.includes(token)) score += 1;
      }

      return { p, score };
    })
    .sort((a, b) => b.score - a.score);

  for (const item of scored) {
    if (results.length >= topK) break;
    results.push(item.p);
  }

  // Jika masih belum mencapai topK dan masih ada stok lain, isi dengan produk tersisa
  if (results.length < topK) {
    for (const p of available) {
      if (results.length >= topK) break;
      if (!results.some((r) => r.id === p.id)) {
        results.push(p);
      }
    }
  }

  return results.slice(0, topK);
}

function buildCatalog(relevantItems: ProductItem[]): string {
  if (relevantItems.length === 0) {
    return 'Saat ini tidak ada produk dengan stok tersedia.';
  }
  return relevantItems
    .map((p) => {
      const desc = (p.description || '').replace(/\s+/g, ' ').slice(0, 160);
      return `- [${p.sku}] ${p.name} | Kategori: ${p.category || 'Umum'} | Rp ${Number(p.price).toLocaleString('id-ID')} | Stok: ${p.stock} | Khasiat: ${desc}`;
    })
    .join('\n');
}

// ─── Panggilan ke berbagai provider AI (dengan timeout ketat 4.5 detik) ─
async function callMultiModelAI(config: AiConfig, system: string, turns: Turn[]): Promise<string | null> {
  const { provider, modelName, apiKey, baseUrl, temperature } = config;
  if (!apiKey || apiKey.trim() === '') return null;

  const temp = Math.max(0, Math.min(1, temperature || 0.4));
  // Semua provider butuh giliran pertama = user
  const convo = [...turns];
  while (convo.length > 0 && convo[0].role !== 'user') convo.shift();
  if (convo.length === 0) return null;

  // Timeout 4.5 detik agar Netlify functions (limit 10 detik) memiliki ruang fallback tanpa HTTP 504
  const TIMEOUT_MS = 4500;

  try {
    if (provider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: convo.map((t) => ({ role: t.role === 'user' ? 'user' : 'model', parts: [{ text: t.content }] })),
          generationConfig: { temperature: temp, maxOutputTokens: 350 }
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
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({ model: modelName, system, max_tokens: 350, temperature: temp, messages: convo })
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
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({
          model: modelName,
          temperature: temp,
          messages: [{ role: 'system', content: system }, ...convo],
          max_tokens: 350
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
    console.warn(`External AI API call to ${provider} timed out / failed, activating instant domain heuristic engine:`, apiErr);
  }
  return null;
}

// ─── Deteksi serah-terima ke admin ───────────────────────
const EMERGENCY_RE = /(nyeri.*dada|dada.*nyeri|sakit dada|sesak( napas| nafas)?|pingsan|lumpuh|bicara pelo|mulut mencong|serangan jantung|muntah darah|darurat|ingin bunuh)/i;
const HUMAN_RE = /(\badmin\b|manusia|petugas|operator|\bcs\b|customer service|apoteker|bicara (dengan|sama)|hubungi saya|telepon|komplain|refund|pesanan saya|status pesanan|pembayaran saya|sudah transfer)/i;
const SPECIAL_RE = /(hamil|menyusui|\bbayi\b|\banak (saya|umur|usia))/i;

function detectHandoff(query: string, isPharmacy: boolean = true): { reason: string; emergency: boolean } | null {
  if (EMERGENCY_RE.test(query)) return { reason: 'Gejala darurat disebutkan pelanggan', emergency: true };
  if (HUMAN_RE.test(query)) return { reason: 'Pelanggan meminta berbicara dengan admin / urusan pesanan', emergency: false };
  if (isPharmacy && SPECIAL_RE.test(query)) return { reason: 'Kondisi khusus (hamil/menyusui/anak) perlu pertimbangan admin', emergency: false };
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
    keywords: ['kolesterol', 'trigliserida', 'ldl', 'lemak darah', 'tengkuk', 'leher tegang', 'leher pegal', 'leher kaku', 'santan', 'gorengan', 'daging merah', 'jeroan', 'kambing', 'herb-kol-001', 'bawang putih'],
    empathy: 'Wah, tengkuk yang kaku dan berat memang bikin tidak nyaman ya 😔',
    q1: 'Boleh tahu, sudah berapa lama keluhan ini dirasakan, dan seberapa sering muncul?',
    q2: 'Apakah Anda pernah cek kolesterol di lab, atau sedang rutin minum obat dari dokter?'
  },
  darahKental: {
    categoryName: 'Darah Kental & Sirkulasi',
    keywords: ['darah kental', 'kesemutan', 'kebas', 'baal', 'ujung jari dingin', 'kaki dingin', 'tangan dingin', 'sirkulasi', 'kram betis', 'kram kaki', 'herb-koa-001', 'ginkgo'],
    empathy: 'Kesemutan dan jari yang dingin itu memang mengganggu aktivitas ya 😔',
    q1: 'Sudah berapa lama dirasakan, dan biasanya muncul di waktu tertentu (misalnya pagi atau setelah duduk lama)?',
    q2: 'Apakah Anda sedang minum obat pengencer darah atau punya riwayat tekanan darah/gula darah tinggi?'
  },
  asamUrat: {
    categoryName: 'Asam Urat & Sendi',
    keywords: ['asam urat', 'urat', 'purin', 'emping', 'sendi', 'nyeri sendi', 'bengkak', 'jempol', 'lutut', 'linu', 'ngilu', 'rematik', 'gout', 'herb-uri-001', 'uric-herba'],
    empathy: 'Nyeri dan bengkak di sendi pasti sangat menyiksa ya 😔',
    q1: 'Sendi bagian mana yang paling sakit, dan sejak kapan mulai terasa?',
    q2: 'Pernah cek kadar asam urat? Dan apakah sedang minum obat dari dokter saat ini?'
  },
  diabetes: {
    categoryName: 'Diabetes & Gula Darah',
    keywords: ['diabetes', 'gula darah', 'glukosa', 'kencing manis', 'sering haus', 'haus terus', 'sering kencing', 'cepat lelah', 'lemas', 'insulin', 'hba1c', 'herb-dia-001', 'glucodex'],
    empathy: 'Mudah lelah dan sering haus memang bikin tidak bertenaga ya 😔',
    q1: 'Sejak kapan gejalanya terasa, dan apakah gula darah Anda pernah diperiksa?',
    q2: 'Apakah sedang rutin minum obat diabetes atau suntik insulin dari dokter?'
  },
  hipertensi: {
    categoryName: 'Hipertensi & Tensi Darah',
    keywords: ['hipertensi', 'tensi', 'darah tinggi', 'tekanan darah', 'pusing', 'kepala berdenyut', 'migrain', 'pundak berat', 'berdebar', 'herb-ten-001', 'tensicap'],
    empathy: 'Pusing dan tensi yang tinggi itu pasti bikin cemas ya 😔',
    q1: 'Kira-kira berapa angka tensi terakhir Anda, dan sudah berapa lama keluhan ini?',
    q2: 'Apakah Anda sedang rutin minum obat tekanan darah dari dokter?'
  },
  lambung: {
    categoryName: 'Pencernaan & Lambung',
    keywords: ['lambung', 'maag', 'mag', 'gerd', 'asam lambung', 'perih', 'mual', 'kembung', 'ulu hati', 'begah', 'herb-gas-001'],
    empathy: 'Perut perih dan begah akibat asam lambung memang sangat mengganggu aktivitas ya 😔',
    q1: 'Apakah rasa perih biasanya muncul saat perut kosong atau setelah mengonsumsi makanan pedas/asam?',
    q2: 'Sudah berapa lama keluhan ini dirasakan, dan apakah sedang mengonsumsi antasida atau obat lambung dokter?'
  },
  stamina: {
    categoryName: 'Daya Tahan & Stamina',
    keywords: ['daya tahan', 'imun', 'stamina', 'lelah', 'capek', 'masuk angin', 'flu', 'batuk', 'pilek', 'meriang', 'herb-imm-001'],
    empathy: 'Kondisi tubuh yang kurang fit dan lelah memang butuh perhatian ekstra ya 😔',
    q1: 'Sudah berapa hari badan terasa kurang fit, dan apakah disertai demam atau flu batuk?',
    q2: 'Bagaimana asupan istirahat serta hidrasi air hangat Anda dalam beberapa hari terakhir?'
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

function heuristicReply(
  stage: string,
  query: string,
  customerText: string,
  items: ProductItem[],
  queriedProduct?: ProductItem | null,
  personaName: string = 'Apt. Siti Rahma, S.Farm',
  isPharmacy: boolean = true,
  storeName: string = 'toko kami'
): HeuristicResult {
  // ── MODE UNIVERSAL (NON-HERBAL) OFFLINE / HEURISTIK ──
  if (!isPharmacy) {
    if (queriedProduct) {
      const reply = `Halo! Terima kasih sudah menanyakan tentang *${queriedProduct.name}* (SKU: ${queriedProduct.sku}) di ${storeName} 😊\n\nProduk ini dibanderol dengan harga Rp ${queriedProduct.price.toLocaleString('id-ID')} dan stok saat ini tersedia (${queriedProduct.stock} pcs).\n${queriedProduct.description ? `Keterangan: ${queriedProduct.description}\n\n` : ''}Apakah ada informasi lain yang ingin Anda ketahui atau ingin langsung memesan?`;
      return {
        reply,
        stage: 'recommended',
        recommended: [queriedProduct]
      };
    }

    const recs = selectTopRelevantProducts(query, customerText, items, null, 3);
    if (recs.length > 0) {
      const lines = recs
        .map((p, i) => `**${i + 1}. ${p.name}** — Rp ${p.price.toLocaleString('id-ID')}\n${(p.description || '').replace(/\s+/g, ' ').slice(0, 160)}`)
        .join('\n\n');
      const reply = `Halo! Selamat datang di ${storeName} 😊 Ada yang bisa ${personaName} bantu hari ini?\n\nBerikut beberapa produk rekomendasi kami yang mungkin sesuai untuk Anda:\n\n${lines}\n\nSilakan pilih atau tanyakan detail produk yang Anda minati ya!`;
      return {
        reply,
        stage: 'recommended',
        recommended: recs
      };
    }

    const reply = `Halo! Selamat datang di ${storeName} 😊 Saya ${personaName}, siap membantu Anda. Silakan beri tahu produk apa yang sedang Anda cari atau butuhkan!`;
    return {
      reply,
      stage: 'greeting',
      recommended: []
    };
  }

  // ── A. PENANGANAN KONSULTASI PRODUK SPESIFIK ──
  if (queriedProduct) {
    const desc = queriedProduct.description || '';
    const bpomMatch = desc.match(/\[POM\s+TR\s+[^\]]+\]/i);
    const bpomInfo = bpomMatch ? ` (${bpomMatch[0].replace(/[\[\]]/g, '')})` : '';
    const cleanDesc = desc.replace(/\[POM[^\]]*\]/gi, '').trim();

    // Tahap Awal konsultasi produk
    if (stage === 'greeting' || stage.startsWith('gathering:1') || stage === 'gathering:0') {
      const reply = `Halo! Senang sekali bisa membantu Anda berkonsultasi mengenai herbal *${queriedProduct.name}* (SKU: ${queriedProduct.sku})${bpomInfo} 😊\n\nHerbal ini diformulasikan khusus untuk kategori **${queriedProduct.category}**.\nKhasiat & petunjuk pemakaian: ${cleanDesc || 'membantu memelihara kesehatan tubuh secara alami'}.\n\nBoleh diceritakan keluhan atau gejala apa yang sedang Anda rasakan saat ini, agar saya dapat memastikan herbal ini benar-benar sesuai dengan kondisi kesehatan Anda? 🌿`;
      return {
        reply,
        stage: 'gathering:1',
        recommended: [queriedProduct]
      };
    }

    // Tahap Persetujuan / Rekomendasi
    if (stage === 'consent_asked' || AFFIRM_RE.test(query) || stage.startsWith('gathering:')) {
      const reply = `Terima kasih atas informasinya 🙏 Berdasarkan kebutuhan Anda, *${queriedProduct.name}* sangat tepat untuk mendampingi pemulihan dan memelihara kesehatan Anda.\n\nAturan konsumsi: ikuti petunjuk pada kemasan secara teratur dan perbanyak konsumsi air putih hangat. Anda bisa langsung memesan produk ini melalui tombol di bawah 🌿`;
      return {
        reply,
        stage: 'recommended',
        recommended: [queriedProduct]
      };
    }
  }

  // ── B. PENANGANAN BERDASARKAN KELUHAN GEJALA KLINIS ──
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
        ? `Halo, saya ${personaName}! Senang bertemu Anda 😊 Bagaimana kabarnya hari ini?\n\nBoleh ceritakan apa yang sedang Anda rasakan atau ingin Anda konsultasikan seputar kesehatan dan herbal? Santai saja, saya siap mendengarkan.`
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
      const meta = {
        symptoms: body.symptoms || [],
        source: body.source || (body.productId ? 'product' : 'rag_main'),
        productId: body.productId || null,
        productName: body.productName || null,
        productSku: body.productSku || null,
        productCategory: body.productCategory || null,
      };
      session = {
        id: `chat_${crypto.randomUUID()}`,
        status: 'ai',
        stage: 'greeting',
        handoffReason: null,
        customerName: body.customerName?.trim() || null,
        customerPhone: body.customerPhone?.trim() || null,
        leadStatus: 'general_inquiry',
        adminNotes: null,
        isArchived: false,
        symptomsJson: JSON.stringify(meta),
        createdAt: t,
        updatedAt: t
      };
      await db.insert(chatSessions).values(session);
    } else {
      // Perbarui info pelanggan bila ada data baru yang masuk
      const leadPatch: Record<string, any> = {};
      if (body.customerName && !session.customerName) leadPatch.customerName = body.customerName.trim();
      if (body.customerPhone && !session.customerPhone) leadPatch.customerPhone = body.customerPhone.trim();
      
      let currentMeta: any = { symptoms: [] };
      try {
        const parsed = JSON.parse(session.symptomsJson || '{}');
        if (Array.isArray(parsed)) currentMeta = { symptoms: parsed, source: 'rag_main' };
        else if (parsed && typeof parsed === 'object') currentMeta = parsed;
      } catch {}

      let metaChanged = false;
      if (body.symptoms && body.symptoms.length > 0) {
        currentMeta.symptoms = body.symptoms;
        metaChanged = true;
      }
      if (body.productId && !currentMeta.productId) {
        currentMeta.source = 'product';
        currentMeta.productId = body.productId;
        currentMeta.productName = body.productName || null;
        currentMeta.productSku = body.productSku || null;
        currentMeta.productCategory = body.productCategory || null;
        metaChanged = true;
      }
      if (metaChanged) {
        leadPatch.symptomsJson = JSON.stringify(currentMeta);
      }

      if (Object.keys(leadPatch).length > 0) {
        await db.update(chatSessions).set({ ...leadPatch, updatedAt: nowIso() }).where(eq(chatSessions.id, session.id));
        session = { ...session, ...leadPatch };
      }
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

    // ── 4. Data pendukung: profil toko, katalog, konfigurasi AI ──
    let catalog: ProductItem[] = [];
    let aiConfig: AiConfig = {
      provider: 'gemini',
      modelName: 'gemini-2.0-flash',
      apiKey: process.env.GEMINI_API_KEY || '',
      baseUrl: '',
      temperature: 0.4,
      systemPromptOverride: ''
    };
    let profileData: any = null;

    try {
      const [items, aiRows, profileRows] = await Promise.all([
        db.select().from(products).where(eq(products.isActive, true)),
        db.select().from(aiSettings).where(eq(aiSettings.isActive, true)).limit(1),
        db.select().from(storeProfile).where(eq(storeProfile.id, 'default')).limit(1)
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
      if (profileRows && profileRows.length > 0) {
        profileData = profileRows[0];
      }
    } catch (dbErr) {
      console.warn('Database fetch warning, using fallback knowledge base:', dbErr);
    }

    const isPharmacy = !profileData || profileData.businessCategory === 'pharmacy_herbal';

    if (catalog.length === 0) {
      catalog = isPharmacy ? FALLBACK_KNOWLEDGE : [];
    }

    // ── 5. Pemicu serah-terima berbasis aturan ──
    const rule = detectHandoff(query, isPharmacy);
    if (rule) {
      const reply = rule.emergency ? EMERGENCY_REPLY : HANDOFF_REPLY;
      await updateSession({ status: 'waiting_admin', handoffReason: rule.reason });
      await saveMessage('bot', reply);
      return successResponse({ sessionId: session.id, status: 'waiting_admin', reply, handoff: true, recommendedProducts: [] });
    }

    // Guardrail: Tolak pertanyaan non-kesehatan pada mode farmasi/herbal
    const NON_HEALTH_RE = /\b(coding|program|javascript|python|html|css|sql|php|react|nextjs|politik|presiden|pemilu|partai|pilkada|dpr|bengkel|motor|mobil|karburator|oli mesin|ban bocor|resep masakan|resep kue|rendang|nasi goreng|masak ayam|matematika|fisika|tugas sekolah|pr matematika|lelucon|lawak|cerita lucu|tebak-tebakan)\b/i;
    const HEALTH_KEYWORDS_RE = /\b(keluhan|sakit|nyeri|pusing|pegal|darah|tensi|gula|kolesterol|asam urat|urat|sendi|jantung|leher|tengkuk|kebas|kesemutan|herbal|obat|minum|kapsul|resep|sehat|tubuh|badan|gejala|mual|lambung|mag|gerd)\b/i;

    if (isPharmacy && NON_HEALTH_RE.test(query) && !HEALTH_KEYWORDS_RE.test(query)) {
      const guardrailReply = 'Mohon maaf, saya dirancang khusus untuk mendampingi konsultasi kesehatan herbal dan pola hidup sehat keluarga. Boleh ceritakan apakah ada keluhan fisik atau kondisi kesehatan yang sedang Anda rasakan?';
      await saveMessage('bot', guardrailReply, []);
      return successResponse({
        sessionId: session.id,
        status: session.status,
        stage: session.stage,
        reply: guardrailReply,
        handoff: false,
        recommendedProducts: [],
        activeProvider: aiConfig.provider,
        activeModel: aiConfig.modelName,
        usedFallback: false,
      });
    }

    let pharmacistName = 'Apt. Siti Rahma, S.Farm';
    let pharmacistTitle = 'Apoteker Pendamping Klinis';
    let productSystemPrompt = '';
    try {
      const [cfgRows, prodCfgRows] = await Promise.all([
        db.select().from(chatbotConfig).where(eq(chatbotConfig.id, 'default')).limit(1),
        db.select().from(chatbotConfig).where(eq(chatbotConfig.id, 'product_chat')).limit(1),
      ]);
      if (cfgRows && cfgRows.length > 0) {
        if (cfgRows[0].pharmacistName) pharmacistName = cfgRows[0].pharmacistName;
        if (cfgRows[0].pharmacistTitle) pharmacistTitle = cfgRows[0].pharmacistTitle;
      }
      if (prodCfgRows && prodCfgRows.length > 0 && prodCfgRows[0].pharmacistStatusText) {
        productSystemPrompt = prodCfgRows[0].pharmacistStatusText;
      }
    } catch {}

    // Urutan prioritas persona: chatbot_config (jika diisi admin) → store_profile.ai_persona_title → default
    let personaTitle = profileData?.aiPersonaTitle || (isPharmacy ? 'Apoteker Pendamping Klinis' : 'Asisten Toko');
    if (pharmacistTitle && (isPharmacy || pharmacistTitle !== 'Apoteker Pendamping Klinis')) {
      personaTitle = pharmacistTitle;
    }
    const storeName = profileData?.storeName || (isPharmacy ? 'Apotek Herbal Medika' : 'toko kami');
    const taglinePart = profileData?.tagline ? ` — ${profileData.tagline}` : '';

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
    const customerTurnsCount = history.filter((m: any) => m.sender === 'customer').length;
    const targetProdFromReq = body.productId
      ? catalog.find((p) => p.id === body.productId) || (body.productSku ? catalog.find((p) => p.sku === body.productSku) : null)
      : null;
    const queriedProduct = targetProdFromReq || findQueriedProduct(query, catalog) || findQueriedProduct(customerText, catalog);

    let turnGuidance = '';
    if (isPharmacy) {
      if (queriedProduct) {
        turnGuidance = `\n\nSTATUS KONSULTASI PRODUK SPESIFIK: Pasien sedang mengonsultasikan herbal *${queriedProduct.name}* (SKU: ${queriedProduct.sku}).
${productSystemPrompt ? `PANDUAN KHUSUS EDUKASI PRODUK: ${productSystemPrompt}\n` : ''}Berikan penjelasan klinis yang hangat, ringkas, dan langsung to-the-point mengenai khasiat utama, aturan pakai/dosis (${queriedProduct.description || ''}), waktu minum terbaik (sebelum/sesudah makan), dan pantangan terkait, TANPA salam basa-basi panjang atau mengulang-ulang detail produk yang sudah jelas. Di akhir jawaban, sertakan tag [[RECOMMEND:${queriedProduct.sku}]] agar kartu produk otomatis ditampilkan ke pasien.`;
      } else if (customerTurnsCount <= 1) {
        turnGuidance = '\n\nSTATUS GILIRAN: Putaran Awal (Turn 1). Berikan empati mendalam + mini-edukasi medis penyebab keluhan ini + ajukan 1 pertanyaan ramah penguat. JANGAN merekomendasikan produk lain di luar keluhan.';
      } else if (customerTurnsCount === 2) {
        turnGuidance = '\n\nSTATUS GILIRAN: Putaran Pendalaman (Turn 2). Berikan apresiasi + tips pola hidup praktis + tanyakan riwayat cek lab/tensi/gula. JANGAN merekomendasikan produk dulu.';
      } else if (customerTurnsCount === 3 && session.stage !== 'consent_asked') {
        turnGuidance = `\n\nSTATUS GILIRAN: Izin Rekomendasi (Turn 3). Rangkum keluhan pasien dan tanyakan izin kesediaan: "Melihat kondisi Kak ${session.customerName || ''}, ada ramuan herbal alami terstandar BPOM yang cocok. Boleh saya bagikan rekomendasi dan aturan minumnya?" Jangan sertakan tag [[RECOMMEND:...]] sebelum pasien setuju.`;
      }
    } else {
      // Mode Universal: Alur belanja langsung, ramah, dan solutif
      if (queriedProduct) {
        turnGuidance = `\n\nSTATUS KONSULTASI PRODUK SPESIFIK: Pelanggan sedang menanyakan produk *${queriedProduct.name}* (SKU: ${queriedProduct.sku}).
${productSystemPrompt ? `PANDUAN TAMBAHAN: ${productSystemPrompt}\n` : ''}Jelaskan keunggulan produk, varian, harga, dan ketersediaannya (${queriedProduct.description || ''}) secara ramah dan ringkas. Di akhir jawaban, sertakan tag [[RECOMMEND:${queriedProduct.sku}]] agar kartu produk otomatis ditampilkan.`;
      } else {
        turnGuidance = '\n\nSTATUS PANDUAN: Bantu pelanggan menemukan produk yang paling sesuai dari katalog. Jika pelanggan menanyakan rekomendasi atau mencari barang tertentu, langsung jelaskan pilihan terbaik yang relevan dan sertakan tag [[RECOMMEND:SKU1,SKU2]] (maksimal 3 produk).';
      }
    }

    // ── 7. Jawaban: AI dulu, heuristik sebagai cadangan ──
    let replyText = '';
    let recommended: ProductItem[] = [];
    let nextStage: string = session.stage;
    let handoffReason: string | null = null;
    let usedFallback = false;

    const customerContext = session.customerName
      ? `\n\nDATA PELANGGAN:\nNama Pelanggan: ${session.customerName}. Sapa dengan ramah menyebut "Kak ${session.customerName}".`
      : '';

    const pharmacistContext = `\n\nIDENTITAS ANDA:\nNama Apoteker: ${pharmacistName}\nJabatan: ${pharmacistTitle}`;

    const topRelevantProducts = selectTopRelevantProducts(query, customerText, catalog, queriedProduct, 3);

    const universalPrompt = `Anda adalah ${personaTitle || 'Asisten Toko'} di ${storeName || 'toko kami'}${taglinePart}.
Bicaralah dalam Bahasa Indonesia yang ramah, santun, dan ringkas (maksimal 3-5 kalimat).
Bantu pelanggan menemukan dan memilih produk dari KATALOG PRODUK TERSEDIA.
Jangan pernah menyebut produk, harga, atau stok yang tidak ada di katalog.
Jika ditanya hal di luar produk, layanan, atau belanja di toko ini, tolak dengan sopan lalu arahkan kembali ke produk toko.
Saat merekomendasikan, akhiri dengan tag [[RECOMMEND:SKU1,SKU2]] (maksimal 3).
Gunakan [[HANDOFF:alasan]] bila pelanggan minta bicara dengan admin, komplain, atau urusan pesanan/pembayaran.`;

    const system = isPharmacy
      ? `${BASE_SYSTEM_PROMPT}${pharmacistContext}${customerContext}${turnGuidance}${
          aiConfig.systemPromptOverride.trim() ? `\n\nINSTRUKSI TAMBAHAN DARI ADMIN:\n${aiConfig.systemPromptOverride.trim()}` : ''
        }\n\nKATALOG PRODUK TERSEDIA (Hanya pilih dan rekomendasikan dari produk berstok berikut jika pasien menyetujui):\n${buildCatalog(topRelevantProducts)}`
      : `${universalPrompt}${customerContext}${turnGuidance}${
          aiConfig.systemPromptOverride.trim() ? `\n\nINSTRUKSI TAMBAHAN DARI ADMIN:\n${aiConfig.systemPromptOverride.trim()}` : ''
        }\n\nKATALOG PRODUK TERSEDIA:\n${buildCatalog(topRelevantProducts)}`;

    const aiRaw = await callMultiModelAI(aiConfig, system, turns);

    const userAllowsRecommendation = !isPharmacy || session.stage === 'consent_asked' || AFFIRM_RE.test(query) || Boolean(queriedProduct);

    if (aiRaw) {
      const parsed = parseTags(aiRaw, userAllowsRecommendation, catalog);
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
      const h = heuristicReply(
        session.stage,
        query,
        customerText,
        catalog,
        queriedProduct,
        isPharmacy ? pharmacistName : personaTitle,
        isPharmacy,
        storeName
      );
      replyText = h.reply;
      recommended = h.recommended;
      nextStage = h.stage;
    }

    // Jika pasien menanyakan produk spesifik namun belum terlampir di kartu rekomendasi, lampirkan otomatis
    if (queriedProduct && recommended.length === 0) {
      recommended = [queriedProduct];
    }

    const patchPayload: Record<string, any> = { stage: nextStage };
    if (handoffReason) {
      patchPayload.status = 'waiting_admin';
      patchPayload.handoffReason = handoffReason;
      patchPayload.leadStatus = 'waiting_admin';
    } else if (nextStage === 'recommended') {
      patchPayload.leadStatus = 'hot_lead';
    }
    await updateSession(patchPayload);
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
    console.error('Error in consultation-chat handler, applying graceful fallback:', err);
    const safeGreeting = 'Halo! Senang bertemu Anda 😊 Mohon maaf sempat ada kendala koneksi sesaat. Ada produk atau hal apa yang bisa saya bantu?';
    return successResponse({
      sessionId: 'chat_recovery',
      status: 'ai',
      stage: 'greeting',
      reply: safeGreeting,
      handoff: false,
      recommendedProducts: [],
      activeProvider: 'local',
      activeModel: 'domain_fallback',
      usedFallback: true
    });
  }
};
