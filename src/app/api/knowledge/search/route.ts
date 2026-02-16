import { NextRequest, NextResponse } from 'next/server';
import { semanticSearch } from '@/lib/knowledge';
import { verifyApiKey, unauthorized } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (!verifyApiKey(request)) return unauthorized();
  
  try {
    const body = await request.json();
    
    if (!body.query) {
      return NextResponse.json(
        { error: 'Missing required field: query' },
        { status: 400 }
      );
    }
    
    const results = await semanticSearch(
      body.query,
      body.limit || 10,
      body.source,
      body.tags
    );
    
    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Error in semantic search:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
