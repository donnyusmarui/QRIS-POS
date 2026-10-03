import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { products, aiSettings } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { eq } from 'drizzle-orm';

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
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

// Fallback knowledge base in case database is momentarily unreachable
const FALLBACK_KNOWLEDGE: ProductItem[] = [
  {
    id: 'prod_herb_01',
    name: 'Sido Muncul Bawang Putih (Garlic)',
    sku: 'HERB-KOL-001',
    price: 95000,
    stock: 45,
    category: 'Kolesterol & Jantung',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    description: '[POM TR 092303861] Ekstrak umbi Allium sativum terstandar untuk meluruhkan plak lemak darah, menurunkan kadar kolesterol jahat (LDL) dan trigliserida. Aturan: 2x sehari 1 kapsul sesudah makan.'
  },
  {
    id: 'prod_herb_03',
    name: 'Herbilogy Red Yeast Rice Extract',
    sku: 'HERB-KOL-003',
    price: 110000,
    stock: 30,
    category: 'Kolesterol & Jantung',
    imageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=800&q=80',
    description: '[POM TR 182318721] Ekstrak Angkak Beras Merah alami mengandung Monacolin K untuk menghambat sintesis kolesterol di hati. Aturan: 1-2x sehari 1 kapsul malam hari.'
  },
  {
    id: 'prod_herb_07',
    name: 'Sido Muncul Ginkgo Biloba Memory',
    sku: 'HERB-KOA-001',
    price: 120000,
    stock: 40,
    category: 'Darah Kental & Sirkulasi',
    imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80',
    description: '[POM TR 092303841] Ekstrak Ginkgo Biloba terstandar untuk melancarkan sirkulasi perifer, antiplatelet darah kental, dan kesemutan. Aturan: 2x sehari 1 kapsul sesudah makan.'
  },
  {
    id: 'prod_herb_08',
    name: 'Habbasyifa Minyak Habbatussauda',
    sku: 'HERB-KOA-002',
    price: 70000,
    stock: 65,
    category: 'Darah Kental & Sirkulasi',
    imageUrl: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=800&q=80',
    description: '[POM TR 113323461] Minyak jintan hitam murni mengandung Thymoquinone untuk menjaga fluiditas aliran kapiler darah dan anti-trombotik. Aturan: 2x sehari 2 kapsul lunak.'
  },
  {
    id: 'prod_herb_13',
    name: 'Uric-Herba HerbaMed',
    sku: 'HERB-URI-001',
    price: 85000,
    stock: 50,
    category: 'Asam Urat & Sendi',
    imageUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80',
    description: '[POM TR 153385761] Formula sidaguri dan tempuyung menghambat pembentukan xantin oksidase dan melarutkan kristal purin tofus sendi. Aturan: 3x sehari 2 kapsul 30 menit sebelum makan.'
  },
  {
    id: 'prod_herb_14',
    name: 'Sido Muncul Sari Daun Salam',
    sku: 'HERB-URI-002',
    price: 75000,
    stock: 60,
    category: 'Asam Urat & Sendi',
    imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
    description: '[POM TR 112323891] Kapsul ekstrak daun salam kaya flavonoid urikosurik mempercepat ekskresi kelebihan purin melalui air kemih. Aturan: 2x sehari 1 kapsul sebelum makan.'
  },
  {
    id: 'prod_herb_19',
    name: 'Glucodex HerbaMed',
    sku: 'HERB-DIA-001',
    price: 85000,
    stock: 45,
    category: 'Diabetes & Gula Darah',
    imageUrl: 'https://images.unsplash.com/photo-1579165466791-788226ab6fb0?auto=format&fit=crop&w=800&q=80',
    description: '[POM TR 153385741] Ekstrak sambiloto dan biji duwet terstandar meningkatkan sensitivitas reseptor insulin sel beta pankreas. Aturan: 3x sehari 2 kapsul 30 menit sebelum makan.'
  },
  {
    id: 'prod_herb_20',
    name: 'Sido Muncul Sambiloto',
    sku: 'HERB-DIA-002',
    price: 70000,
    stock: 60,
    category: 'Diabetes & Gula Darah',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
    description: '[POM TR 092303881] Ekstrak daun sambiloto kaya zat pahit andrographolide memicu pengeluaran insulin dan menstabilkan gula darah. Aturan: 3x sehari 1 kapsul sesudah makan.'
  },
  {
    id: 'prod_herb_25',
    name: 'Tensicap HerbaMed',
    sku: 'HERB-TEN-001',
    price: 85000,
    stock: 40,
    category: 'Hipertensi & Tensi Darah',
    imageUrl: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=800&q=80',
    description: '[POM TR 153385721] Ekstrak seledri dan pegagan menstimulasi vasodilatasi arteri menurunkan tensi sistolik dan diastolik. Aturan: 3x sehari 2 kapsul 30 menit sebelum makan.'
  },
  {
    id: 'prod_herb_26',
    name: 'Sido Muncul Celery (Ekstrak Seledri)',
    sku: 'HERB-TEN-002',
    price: 75000,
    stock: 55,
    category: 'Hipertensi & Tensi Darah',
    imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80',
    description: '[POM TR 092303851] Ekstrak seledri terstandarisasi 3-n-butylphthalide merelaksasi dinding vaskular dan mengatasi tegang di pundak. Aturan: 3x sehari 1 kapsul sesudah makan.'
  }
];

// Helper: Call Multi-Model AI API
async function callMultiModelAI(
  config: { provider: string; modelName: string; apiKey: string; baseUrl?: string; temperature: number; systemPromptOverride?: string },
  userPrompt: string,
  groundingContext: string
): Promise<string | null> {
  const { provider, modelName, apiKey, baseUrl, temperature, systemPromptOverride } = config;
  if (!apiKey || apiKey.trim() === '') return null;

  const systemInstruction = (systemPromptOverride && systemPromptOverride.trim().length > 0)
    ? systemPromptOverride
    : "Anda adalah Konsultan Herbal Medika & Asisten Belanja Apotek Sehat Indonesia terstandar BPOM RI. Tugas Anda menjawab keluhan pasien/pembeli dengan ramah, berempati, menjelaskan mekanisme patofisiologi secara ringkas dan mudah dipahami, serta merekomendasikan produk herbal BPOM yang relevan dari data yang tersedia. Sertakan tips pola makan/hidup sehat dan disclaimer medis ramah.";

  const fullPrompt = `${systemInstruction}\n\n${groundingContext}\n\nPertanyaan/Keluhan Pasien: ${userPrompt}\n\nBerikan jawaban ramah dalam bahasa Indonesia yang terstruktur dengan format Markdown.`;

  try {
    // 1. Google Gemini
    if (provider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: Math.max(0, Math.min(1, temperature || 0.4)),
            maxOutputTokens: 1000
          }
        })
      });
      if (res.ok) {
        const json = await res.json();
        const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) return candidate.trim();
      }
    }

    // 2. OpenAI / DeepSeek / Groq / Ollama (OpenAI-compatible)
    if (['openai', 'deepseek', 'groq', 'custom_ollama'].includes(provider)) {
      let defaultBase = 'https://api.openai.com/v1';
      if (provider === 'deepseek') defaultBase = 'https://api.deepseek.com/v1';
      if (provider === 'groq') defaultBase = 'https://api.groq.com/openai/v1';
      if (provider === 'custom_ollama') defaultBase = 'http://localhost:11434/v1';

      const finalBase = (baseUrl && baseUrl.trim() !== '') ? baseUrl.trim().replace(/\/$/, '') : defaultBase;
      const endpoint = `${finalBase}/chat/completions`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelName,
          temperature: Math.max(0, Math.min(1, temperature || 0.4)),
          messages: [
            { role: 'system', content: `${systemInstruction}\n\n${groundingContext}` },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 1000
        })
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) return content.trim();
      }
    }

    // 3. Anthropic Claude
    if (provider === 'anthropic') {
      const endpoint = 'https://api.anthropic.com/v1/messages';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelName,
          system: `${systemInstruction}\n\n${groundingContext}`,
          max_tokens: 1000,
          messages: [{ role: 'user', content: userPrompt }]
        })
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.content?.[0]?.text;
        if (content) return content.trim();
      }
    }
  } catch (apiErr) {
    console.warn(`External AI API call to ${provider} failed, falling back to heuristic engine:`, apiErr);
  }

  return null;
}

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

    if (!query) {
      return errorResponse(400, 'Pesan tidak boleh kosong');
    }

    // 1. Fetch live active products from Neon DB
    let allProducts: ProductItem[] = [];
    let aiConfig = {
      provider: 'gemini',
      modelName: 'gemini-2.0-flash',
      apiKey: process.env.GEMINI_API_KEY || '',
      baseUrl: '',
      temperature: 0.4,
      systemPromptOverride: ''
    };

    try {
      const db = createDb();
      const [items, aiRows] = await Promise.all([
        db.select().from(products).where(eq(products.isActive, true)),
        db.select().from(aiSettings).where(eq(aiSettings.isActive, true)).limit(1)
      ]);

      if (items && items.length > 0) {
        allProducts = items.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: Number(p.price),
          stock: Number(p.stock),
          category: p.category,
          imageUrl: p.imageUrl,
          description: p.description
        }));
      }

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

    if (allProducts.length === 0) {
      allProducts = FALLBACK_KNOWLEDGE;
    }

    // 2. Pathology & Symptom Scoring Engine
    const lowerQ = query.toLowerCase();

    const clusters = {
      kolesterol: {
        categoryName: 'Kolesterol & Jantung',
        keywords: [
          'kolesterol', 'trigliserida', 'ldl', 'plak', 'lemak', 'lemak darah',
          'tengkuk', 'tengkuk kaku', 'tengkuk berat', 'leher tegang', 'leher pegal',
          'santan', 'gorengan', 'kambing', 'daging merah', 'arteri', 'jantung', 'garlic', 'bawang putih', 'angkak'
        ],
        advice: 'Tengkuk tegang dan leher kaku sering kali dipicu oleh aliran darah perifer yang terhambat akibat tingginya viskositas lipid (kolesterol LDL & trigliserida). Herbal berbahan ekstrak Allium sativum (bawang putih) dan Red Yeast Rice (angkak) bekerja aktif meluruhkan timbunan plak vaskular dan menghambat biosintesis kolesterol di organ hati.'
      },
      darahKental: {
        categoryName: 'Darah Kental & Sirkulasi',
        keywords: [
          'darah kental', 'kental', 'kesemutan', 'kebas', 'baal', 'ujung jari dingin',
          'kaki dingin', 'sirkulasi', 'aliran darah', 'mikrosirkulasi', 'stasis',
          'ginkgo', 'habbatussauda', 'zaitun', 'pegagan', 'kram betis', 'kram kaki', 'stroke'
        ],
        advice: 'Gejala kesemutan, baal, dan ujung jari dingin mengindikasikan perfusi mikrosirkulasi perifer yang menurun akibat agregasi trombosit atau darah kental. Ekstrak Ginkgo Biloba dan Minyak Habbatussauda murni kaya zat aktif flavonoid dan Thymoquinone yang terbukti meningkatkan elastisitas sel darah merah (eritrosit) serta melancarkan distribusi oksigen ke ujung-ujung saraf.'
      },
      asamUrat: {
        categoryName: 'Asam Urat & Sendi',
        keywords: [
          'asam urat', 'urat', 'purin', 'emping', 'jeroan', 'tofus', 'sendi', 'nyeri sendi',
          'bengkak', 'jempol bengkak', 'lutut', 'linu', 'rematik', 'gout', 'radang sendi',
          'sidaguri', 'tempuyung', 'daun salam', 'celeriac', 'seledri'
        ],
        advice: 'Nyeri berdenyut dan radang kemerahan pada sendi (terutama jempol kaki atau lutut) merupakan ciri khas penumpukan kristal monosodium urat akibat metabolisme purin yang berlebih. Sinergi herbal Sidaguri dan Daun Salam memiliki sifat urikosurik alami untuk menghambat enzim xantin oksidase dan mempercepat pembuangan kelebihan asam urat melalui ginjal.'
      },
      diabetes: {
        categoryName: 'Diabetes & Gula Darah',
        keywords: [
          'diabetes', 'gula darah', 'glukosa', 'kencing manis', 'sering haus', 'haus terus',
          'sering kencing', 'kencing malam', 'lemas', 'cepat lelah', 'insulin', 'resistensi insulin',
          'pankreas', 'sambiloto', 'brotowali', 'kayu manis', 'cinnamon', 'hba1c', 'manis'
        ],
        advice: 'Rasa cepat lelah, sering haus, dan lonjakan gula darah setelah makan berkaitan erat dengan resistensi insulin sel tubuh. Senyawa andrographolide dari Sambiloto terstandar dan ekstrak Kayu Manis terbukti memiliki efek insulin-mimetic yang membantu membuka reseptor sel agar glukosa dapat diserap optimal menjadi energi tubuh.'
      },
      hipertensi: {
        categoryName: 'Hipertensi & Tensi Darah',
        keywords: [
          'hipertensi', 'tensi', 'tensi tinggi', 'darah tinggi', 'tekanan darah', 'pusing',
          'kepala berdenyut', 'migrain', 'pundak berat', 'berdebar', 'natrium', 'garam',
          'seledri', 'mengkudu', 'tensicap', 'tensiofit', 'kumis kucing'
        ],
        advice: 'Tekanan darah tinggi dan rasa pusing berdenyut terjadi saat tonus dinding arteri mengalami konstriksi (penyempitan). Senyawa 3-n-butylphthalide pada ekstrak Seledri dan scopoletin pada Mengkudu menstimulasi vasodilatasi pembuluh darah sehingga tekanan darah sistolik dan diastolik berangsur relaks dan normal.'
      }
    };

    // Calculate cluster scores
    let bestClusterKey: keyof typeof clusters = 'kolesterol';
    let maxClusterScore = 0;

    for (const [key, cluster] of Object.entries(clusters)) {
      let score = 0;
      for (const kw of cluster.keywords) {
        if (lowerQ.includes(kw)) {
          score += kw.includes(' ') ? 3 : 1.5;
        }
      }
      if (score > maxClusterScore) {
        maxClusterScore = score;
        bestClusterKey = key as keyof typeof clusters;
      }
    }

    const matchedCluster = clusters[bestClusterKey];

    // Score individual products
    const scoredProducts = allProducts.map((p) => {
      let score = 0;
      const pName = (p.name || '').toLowerCase();
      const pDesc = (p.description || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();

      if (pCat.includes(matchedCluster.categoryName.toLowerCase())) {
        score += 5;
      }

      matchedCluster.keywords.forEach((kw) => {
        if (lowerQ.includes(kw)) {
          if (pName.includes(kw)) score += 4;
          if (pDesc.includes(kw)) score += 2;
        }
      });

      const words = lowerQ.split(/\s+/).filter((w) => w.length > 3);
      words.forEach((w) => {
        if (pName.includes(w)) score += 3;
        if (pDesc.includes(w)) score += 1.5;
      });

      return { product: p, score };
    });

    scoredProducts.sort((a, b) => b.score - a.score);
    let recommended = scoredProducts.slice(0, 3).map((sp) => sp.product);

    const isGreeting = ['halo', 'hai', 'siang', 'malam', 'pagi', 'assalamu', 'bisa bantu', 'konsultasi', 'menu', 'katalog'].some((g) =>
      lowerQ.includes(g)
    );

    let replyText = '';
    let detectedCategory = matchedCluster.categoryName;

    if (isGreeting && maxClusterScore < 2) {
      detectedCategory = 'Koleksi Terpopuler';
      recommended = [
        allProducts.find((p) => p.sku === 'HERB-KOL-001') || allProducts[0],
        allProducts.find((p) => p.sku === 'HERB-KOA-001') || allProducts[1],
        allProducts.find((p) => p.sku === 'HERB-URI-001') || allProducts[2]
      ].filter(Boolean) as ProductItem[];

      replyText = `Halo! Selamat datang di **Layanan Konsultasi Herbal Medika QRIS-POS** 🌿✨

Saya adalah asisten kesehatan herbal resmi Anda. Seluruh produk kami telah **terdaftar resmi di BPOM RI** dan terbukti secara klinis maupun empiris untuk mendampingi mitigasi 5 masalah degeneratif:

1. **Kolesterol & Plak Jantung** (Tengkuk berat, lemak darah, trigliserida)
2. **Darah Kental & Sirkulasi Perifer** (Kesemutan, jari dingin, kebas)
3. **Asam Urat & Radang Sendi** (Nyeri jempol kaki, radang linu sendi)
4. **Diabetes & Regulasi Glukosa** (Resistensi insulin, lemas sehabis makan)
5. **Hipertensi & Tensi Darah** (Pusing belakang leher, tegang vaskular)

Silakan ceritakan keluhan, gejala yang Anda rasakan, atau hasil cek laboratorium terakhir Anda. Saya akan merekomendasikan formulasi herbal yang paling tepat dan aman!`;
    } else {
      // 3. Grounding Context for Multi-Model AI
      const groundingContext = `
INFORMASI PRODUK HERBAL TERSEDIA (BPOM RI):
${recommended
  .map(
    (p, i) =>
      `${i + 1}. [${p.sku}] ${p.name} (Kategori: ${p.category}) - Harga: Rp ${p.price.toLocaleString('id-ID')}
   Khasiat & Legalitas: ${p.description}`
  )
  .join('\n\n')}
`;

      // Attempt Dynamic AI Generation if API key is present
      let aiGeneratedText: string | null = null;
      if (aiConfig.apiKey && aiConfig.apiKey.trim().length > 0) {
        aiGeneratedText = await callMultiModelAI(aiConfig, query, groundingContext);
      }

      if (aiGeneratedText) {
        replyText = aiGeneratedText;
      } else {
        // Built-in Clinical Heuristic Engine fallback
        const productBulletList = recommended
          .map(
            (p, idx) =>
              `**${idx + 1}. ${p.name}** (${p.category})\n   • *Khasiat & Legalitas:* ${p.description}\n   • *Harga:* Rp ${p.price.toLocaleString('id-ID')} (Stok: ${p.stock})`
          )
          .join('\n\n');

        replyText = `Terima kasih telah berkonsultasi mengenai keluhan Anda 🌿

### 🩺 Analisis Medis & Mekanisme Herbal:
${matchedCluster.advice}

---

### 💊 Rekomendasi Formulasi Herbal BPOM Terpilih:
${productBulletList}

---

### 🥗 Tips Gaya Hidup & Pantangan Pendukung:
• **Cukupi Cairan:** Konsumsi minimal 2-2.5 liter air putih hangat per hari untuk membantu ginjal dan sirkulasi darah.
• **Pola Makan Seimbang:** Hindari makanan pemicu utama (gorengan berkali-kali, jeroan, santan pekat, atau gula sederhana berlebih).
• **Aturan Konsumsi:** Beri jeda 1-2 jam jika Anda juga mengonsumsi obat resep dokter agar khasiat saling mendukung tanpa interaksi negatif.

*Catatan: Asisten herbal ini memberikan rekomendasi suplemen alami berizin BPOM RI untuk gaya hidup sehat. Bila gejala berlanjut atau bersifat darurat, konsultasikan dengan dokter spesialis Anda.*`;
      }
    }

    return successResponse({
      reply: replyText,
      detectedCategory,
      activeProvider: aiConfig.provider,
      activeModel: aiConfig.modelName,
      recommendedProducts: recommended
    });
  } catch (err: any) {
    console.error('Error in consultation-chat handler:', err);
    return errorResponse(500, err?.message || 'Terjadi kesalahan sistem konsultasi');
  }
};
