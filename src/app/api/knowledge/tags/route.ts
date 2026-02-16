import { NextRequest, NextResponse } from 'next/server';
import { listTags, createTag } from '@/lib/knowledge';
import { verifyApiKey, unauthorized } from '@/lib/auth';

export async function GET(request: NextRequest) {
  if (!verifyApiKey(request)) return unauthorized();
  
  try {
    const tags = await listTags();
    return NextResponse.json({ tags });
  } catch (error: any) {
    console.error('Error listing tags:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyApiKey(request)) return unauthorized();
  
  try {
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }
    
    const tag = await createTag(body.name, body.color);
    return NextResponse.json(tag, { status: 201 });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Tag already exists' },
        { status: 409 }
      );
    }
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
