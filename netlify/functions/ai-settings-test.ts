import type { Context } from '@netlify/functions';
import { createDb } from '../../db/index';
import { aiSettings } from '../../db/schema';
import { corsHeaders, errorResponse, successResponse } from './_shared/response';
import { requirePermission } from './_shared/rbac';
import { eq } from 'drizzle-orm';

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    const authResult = await requirePermission(req, 'settings:manage');
    if ('statusCode' in authResult) {
      return new Response(JSON.stringify({ success: false, error: authResult.message }), {
        status: authResult.statusCode,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    const body = await req.json();
    let { provider, modelName, apiKey, baseUrl } = body;

    provider = provider || 'gemini';
    modelName = modelName || 'gemini-2.0-flash';
    apiKey = (apiKey || '').trim();

    // If key is masked or empty, load from database
    if (!apiKey || apiKey.includes('••••')) {
      const db = createDb();
      const rows = await db
        .select()
        .from(aiSettings)
        .where(eq(aiSettings.isActive, true))
        .limit(1);
      if (rows.length > 0 && rows[0].apiKey) {
        apiKey = rows[0].apiKey;
      }
    }

    if (!apiKey && provider !== 'custom_ollama') {
      return errorResponse(400, 'API Key belum diisi. Masukkan API key terlebih dahulu untuk pengujian.');
    }

    const startTime = Date.now();

    // 1. Google Gemini
    if (provider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Halo, balas dengan kata 'Siap' dalam 1 kata." }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });

      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${res.status}: Gagal verifikasi Gemini API`;
        return successResponse({
          ok: false,
          latencyMs,
          provider,
          model: modelName,
          message: errMsg
        });
      }

      return successResponse({
        ok: true,
        latencyMs,
        provider,
        model: modelName,
        message: `Koneksi Google Gemini (${modelName}) berhasil! Latensi: ${latencyMs}ms.`
      });
    }

    // 2. OpenAI / DeepSeek / Groq / Ollama (OpenAI-compatible)
    if (['openai', 'deepseek', 'groq', 'custom_ollama'].includes(provider)) {
      let defaultBase = 'https://api.openai.com/v1';
      if (provider === 'deepseek') defaultBase = 'https://api.deepseek.com/v1';
      if (provider === 'groq') defaultBase = 'https://api.groq.com/openai/v1';
      if (provider === 'custom_ollama') defaultBase = 'http://localhost:11434/v1';

      const finalBase = (baseUrl && baseUrl.trim() !== '') ? baseUrl.trim().replace(/\/$/, '') : defaultBase;
      const endpoint = `${finalBase}/chat/completions`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: "Halo, balas dengan kata 'Siap' dalam 1 kata." }],
          max_tokens: 10
        })
      });

      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${res.status}: Gagal verifikasi ${provider} API`;
        return successResponse({
          ok: false,
          latencyMs,
          provider,
          model: modelName,
          message: errMsg
        });
      }

      return successResponse({
        ok: true,
        latencyMs,
        provider,
        model: modelName,
        message: `Koneksi ${provider.toUpperCase()} (${modelName}) berhasil! Latensi: ${latencyMs}ms.`
      });
    }

    // 3. Anthropic
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
          max_tokens: 10,
          messages: [{ role: 'user', content: "Halo, balas dengan kata 'Siap' dalam 1 kata." }]
        })
      });

      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${res.status}: Gagal verifikasi Anthropic API`;
        return successResponse({
          ok: false,
          latencyMs,
          provider,
          model: modelName,
          message: errMsg
        });
      }

      return successResponse({
        ok: true,
        latencyMs,
        provider,
        model: modelName,
        message: `Koneksi Anthropic Claude (${modelName}) berhasil! Latensi: ${latencyMs}ms.`
      });
    }

    return errorResponse(400, `Provider '${provider}' tidak didukung.`);
  } catch (err: any) {
    console.error('Error testing AI settings:', err);
    return errorResponse(500, err?.message || 'Gagal menguji koneksi AI');
  }
};
