import { NextRequest, NextResponse } from 'next/server';
import { listEntries, createEntry } from '@/lib/knowledge';
import { verifyApiKey, unauthorized } from '@/lib/auth';
import { ListEntriesParams, CreateEntryInput, SourceType } from '@/lib/types';

export async function GET(request: NextRequest) {
  if (!verifyApiKey(request)) return unauthorized();
  
  const searchParams = request.nextUrl.searchParams;
  
  const params: ListEntriesParams = {
    q: searchParams.get('q') || undefined,
    source: searchParams.get('source') as SourceType | undefined,
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined,
    sort: searchParams.get('sort') as 'created' | 'updated' | 'relevance' | undefined,
  };
  
  try {
    const result = await listEntries(params);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error listing entries:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyApiKey(request)) return unauthorized();
  
  try {
    const body = await request.json() as CreateEntryInput;
    
    // Validate required fields
    if (!body.title || !body.content || !body.source_type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, source_type' },
        { status: 400 }
      );
    }
    
    const entry = await createEntry(body);
    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    console.error('Error creating entry:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
