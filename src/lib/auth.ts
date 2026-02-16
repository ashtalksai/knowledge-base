import { NextRequest } from 'next/server';

export function verifyApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.KB_API_KEY;
  
  if (!apiKey) {
    // No API key configured = allow all (dev mode)
    return true;
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
