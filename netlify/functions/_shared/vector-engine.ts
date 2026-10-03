// ─── Engine Vektor & Cosine Similarity untuk RAG Apotek Herbal ───

// Kamus kata kunci klinis untuk pemetaan vektor semantik fallback deterministik (128 dimensi)
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

export function generateDeterministicEmbedding(text: string, dimensions = 128): number[] {
  const lower = (text || '').toLowerCase();
  const vec = new Array(dimensions).fill(0);

  // 1. Beri bobot berbasis vocab klinis
  VOCAB_KEYWORDS.forEach((kw, idx) => {
    const dimIdx = idx % dimensions;
    if (lower.includes(kw)) {
      const occurrences = (lower.match(new RegExp(kw, 'g')) || []).length;
      vec[dimIdx] += 1.5 * occurrences;
    }
  });

  // 2. Beri bobot n-gram hash untuk menangkap konteks umum
  const tokens = lower.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vec[idx] += 0.8;
  }

  // 3. Normalisasi L2 unit vector
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) sumSq += vec[i] * vec[i];
  const mag = Math.sqrt(sumSq) || 1;
  return vec.map((v) => Number((v / mag).toFixed(5)));
}

export async function computeEmbedding(text: string, geminiApiKey?: string): Promise<{ vector: number[]; provider: string }> {
  const clean = (text || '').slice(0, 1500).trim();
  if (!clean) return { vector: new Array(128).fill(0), provider: 'empty' };

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

  return { vector: generateDeterministicEmbedding(clean, 128), provider: 'deterministic-128' };
}
