export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
}

export function jsonResponse(statusCode: number, body: any) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(),
    },
  });
}

export function errorResponse(statusCode: number, message: string) {
  return jsonResponse(statusCode, { success: false, error: message });
}

export function successResponse(data: any, message?: string) {
  return jsonResponse(200, { success: true, data, ...(message && { message }) });
}
