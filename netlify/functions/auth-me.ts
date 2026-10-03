import type { Context } from '@netlify/functions';
import { extractAuthUser } from './_shared/auth-middleware';
import { errorResponse, successResponse, corsHeaders } from './_shared/response';

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'GET') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    const user = await extractAuthUser(req);
    return successResponse(user);
  } catch (error: any) {
    return errorResponse(401, error.message || 'Unauthorized');
  }
};
