import { NextRequest } from 'next/server';

export function verifyApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.KB_API_KEY;
  
  if (!apiKey) {
    // No API key configured = allow all (dev mode)
    return true;
  }
  
  // Allow same-origin requests (browser UI)
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  const referer = request.headers.get('referer');
  
  // If request comes from same domain, allow it
  if (host && (origin?.includes(host) || referer?.includes(host))) {
    return true;
  }
  
  // Also allow if no origin header (server-side rendering)
  if (!origin && !authHeader) {
    // Check if it's a browser request by looking at accept header
    const accept = request.headers.get('accept') || '';
    if (accept.includes('text/html')) {
      return true;
    }
  }
  
  if (!authHeader) {
    return false;
  }
  
  // Support both "Bearer <key>" and just "<key>"
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;
  
  return token === apiKey;
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
