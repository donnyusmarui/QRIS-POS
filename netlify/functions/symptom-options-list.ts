import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { chatbotSymptomOptions } from '../../db/schema';
import { corsHeaders, successResponse } from './_shared/response';
import { eq, asc } from 'drizzle-orm';

const DEFAULT_SYMPTOMS = [
  {
    id: 'sym_01',
    label: 'Tengkuk Kaku / Leher Tegang',
    category: 'kolesterol',
    orderIndex: 1,
    isActive: true,
    followUpQuestion: 'Berapa lama keluhan tengkuk kaku ini Anda rasakan?',
    followUpOptions: ['Kurang dari 3 hari', '1 - 2 minggu', 'Lebih dari 1 bulan', 'Tensi terakhir > 140/90']
  },
  {
    id: 'sym_02',
    label: 'Pusing / Kepala Berdenyut',
    category: 'hipertensi',
    orderIndex: 2,
    isActive: true,
    followUpQuestion: 'Kapan pusing atau kepala berdenyut paling sering muncul?',
    followUpOptions: ['Saat bangun tidur', 'Saat lelah atau stres', 'Sore menjelang malam', 'Disertai pandangan kabur']
  },
  {
    id: 'sym_03',
    label: 'Sering Kesemutan / Kebas di Tangan/Kaki',
    category: 'umum',
    orderIndex: 3,
    isActive: true,
    followUpQuestion: 'Di bagian tubuh mana kesemutan paling dominan dirasakan?',
    followUpOptions: ['Ujung jari tangan', 'Telapak kaki / tumit', 'Separuh badan kiri/kanan', 'Hanya saat duduk bersila']
  },
  {
    id: 'sym_04',
    label: 'Nyeri Sendi / Jempol Bengkak',
    category: 'asam_urat',
    orderIndex: 4,
    isActive: true,
    followUpQuestion: 'Bagaimana karakteristik nyeri sendi yang Anda rasakan?',
    followUpOptions: ['Jempol kaki bengkak & merah', 'Lutut ngilu / berbunyi', 'Asam urat terakhir > 7.0 mg/dL', 'Belum pernah cek lab']
  },
  {
    id: 'sym_05',
    label: 'Sering Haus & Cepat Lapar / Sering BAK Malam',
    category: 'diabetes',
    orderIndex: 5,
    isActive: true,
    followUpQuestion: 'Apakah sudah pernah melakukan pengecekan gula darah?',
    followUpOptions: ['Gula darah puasa > 126 mg/dL', 'Gula darah sewaktu > 200 mg/dL', 'Ada riwayat diabetes keluarga', 'Belum pernah cek lab']
  },
  {
    id: 'sym_06',
    label: 'Dada Terasa Berat / Nafas Pendek',
    category: 'kolesterol',
    orderIndex: 6,
    isActive: true,
    followUpQuestion: 'Kapan dada terasa berat atau nafas terasa pendek?',
    followUpOptions: ['Saat jalan cepat / naik tangga', 'Saat berbaring / istirahat', 'Disertai keringat dingin', 'Disertai jantung berdebar']
  }
];

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const db = createDb();
    const rows = await db
      .select()
      .from(chatbotSymptomOptions)
      .where(eq(chatbotSymptomOptions.isActive, true))
      .orderBy(asc(chatbotSymptomOptions.orderIndex));

    if (!rows || rows.length === 0) {
      return successResponse(DEFAULT_SYMPTOMS);
    }

    const formatted = rows.map((r: any) => {
      let followUpParsed = [];
      if (r.followUpOptions) {
        try {
          followUpParsed = typeof r.followUpOptions === 'string' ? JSON.parse(r.followUpOptions) : r.followUpOptions;
        } catch {
          followUpParsed = [];
        }
      }
      return {
        id: r.id,
        label: r.label,
        category: r.category,
        orderIndex: r.orderIndex,
        isActive: Boolean(r.isActive),
        followUpQuestion: r.followUpQuestion || '',
        followUpOptions: followUpParsed
      };
    });

    return successResponse(formatted);
  } catch (err: any) {
    console.error('Error fetching symptom options:', err);
    // Graceful fallback to default symptom list
    return successResponse(DEFAULT_SYMPTOMS);
  }
};
