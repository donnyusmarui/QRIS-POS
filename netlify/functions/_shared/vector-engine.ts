// ─── Engine Vektor & Cosine Similarity untuk RAG Apotek Herbal & POS ───

// Helper normalisasi SKU / Teks untuk pencarian leksikal presisi
export function normalizeSkuOrText(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Kamus kata kunci klinis & POS umum untuk pembobotan semantik fallback deterministik
const VOCAB_KEYWORDS = [
  'kolesterol', 'ldl', 'hdl', 'trigliserida', 'plak', 'arteri', 'jantung', 'tengkuk', 'kaku', 'leher',
  'darah kental', 'koagulasi', 'sirkulasi', 'perifer', 'kesemutan', 'kebas', 'baal', 'kaki dingin', 'ujung jari', 'kram',
  'asam urat', 'purin', 'gout', 'sendi', 'radang', 'bengkak', 'jempol', 'lutut', 'linu', 'ngilu', 'rematik',
  'diabetes', 'gula darah', 'glukosa', 'kencing manis', 'insulin', 'hba1c', 'lemas', 'sering haus', 'haus', 'sering kencing', 'lapar',
  'hipertensi', 'tensi', 'darah tinggi', 'tekanan darah', 'pusing', 'berdenyut', 'migrain', 'berdebar', 'stres',
  'bawang putih', 'garlic', 'allium', 'zaitun', 'angkak', 'monacolin', 'mengkudu', 'pace', 'seledri', 'apium',
  'sidaguri', 'tempuyung', 'kumis kucing', 'sambiloto', 'andrographis', 'kayu manis', 'cinnamon', 'daun salam',
  'ginkgo biloba', 'centella', 'pegagan', 'habba', 'jintan hitam', 'nigella', 'madu', 'propolis', 'temulawak', 'kunyit',
  'kapsul', 'ekstrak', 'herbal', 'jamu', 'bpom', 'halal', 'aman', 'dewasa', 'dosis', 'makan', 'sebelum', 'sesudah',
  'detoks', 'imun', 'daya tahan', 'antioksidan', 'vitalitas', 'ginjal', 'hati', 'empedu', 'lambung', 'pencernaan'
];

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function generateDeterministicEmbedding(text: string, dimensions = 768): number[] {
  const lower = (text || '').toLowerCase();
  const vec = new Array(dimensions).fill(0);

  // 1. Bobot berbasis vocab klinis & domain
  VOCAB_KEYWORDS.forEach((kw, idx) => {
    if (lower.includes(kw)) {
      const occurrences = (lower.match(new RegExp(kw, 'g')) || []).length;
      const dimIdx = (idx * 7) % dimensions;
      vec[dimIdx] += 1.8 * occurrences;
      vec[(dimIdx + 31) % dimensions] += 0.9 * occurrences;
    }
  });

  // 2. Bobot n-gram token & character shingles untuk menangkap variasi teks & SKU
  const tokens = lower.split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const idx1 = Math.abs(hash) % dimensions;
    const idx2 = Math.abs((hash * 37) ^ (hash >> 3)) % dimensions;
    vec[idx1] += 1.2;
    vec[idx2] += 0.7;

    // Subword character trigrams
    for (let i = 0; i <= token.length - 3; i++) {
      let triHash = 0;
      for (let j = 0; j < 3; j++) {
        triHash = (triHash << 5) - triHash + token.charCodeAt(i + j);
        triHash |= 0;
      }
      const triIdx = Math.abs(triHash) % dimensions;
      vec[triIdx] += 0.4;
    }
  }

  // 3. Normalisasi L2 unit vector
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) sumSq += vec[i] * vec[i];
  const mag = Math.sqrt(sumSq) || 1;
  return vec.map((v) => Number((v / mag).toFixed(5)));
}

export async function computeEmbedding(text: string, geminiApiKey?: string): Promise<{ vector: number[]; provider: string }> {
  const clean = (text || '').slice(0, 1500).trim();
  if (!clean) return { vector: new Array(768).fill(0), provider: 'empty' };

  if (geminiApiKey && geminiApiKey.trim() !== '') {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: clean }] }
        })
      });
      if (res.ok) {
        const json = await res.json();
        const values: number[] = json.embedding?.values;
        if (Array.isArray(values) && values.length > 0) {
          return { vector: values, provider: 'gemini-embedding-004' };
        }
      }
    } catch (e) {
      console.warn('Gemini embedding failed or timed out, falling back to deterministic vector:', e);
    }
  }

  return { vector: generateDeterministicEmbedding(clean, 768), provider: 'deterministic-768' };
}
