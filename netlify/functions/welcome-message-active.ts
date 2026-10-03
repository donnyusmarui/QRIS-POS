import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { chatbotWelcomeMessages } from '../../db/schema';
import { corsHeaders, successResponse } from './_shared/response';
import { eq } from 'drizzle-orm';

const DEFAULT_WELCOME = {
  id: 'wm_fallback',
  title: 'Sapaan Apotek Hangat',
  content: 'Halo, selamat datang di Apotek Herbal Medika! Senang sekali Anda mampir 🙏 Boleh saya tahu apa kabar Anda hari ini? Kalau ada keluhan kesehatan atau gejala yang sedang dirasakan, saya siap mendengarkan dan membantu dengan senang hati 😊'
};

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const db = createDb();
    const rows = await db
      .select()
      .from(chatbotWelcomeMessages)
      .where(eq(chatbotWelcomeMessages.isActive, true))
      .limit(1);

    if (rows && rows.length > 0) {
      return successResponse(rows[0]);
    }

    return successResponse(DEFAULT_WELCOME);
  } catch (err) {
    return successResponse(DEFAULT_WELCOME);
  }
};
