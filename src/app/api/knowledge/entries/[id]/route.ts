import { NextRequest, NextResponse } from 'next/server';
import { getEntry, updateEntry, deleteEntry } from '@/lib/knowledge';
import { verifyApiKey, unauthorized } from '@/lib/auth';
import { UpdateEntryInput } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!verifyApiKey(request)) return unauthorized();
  
  try {
    const entry = await getEntry(params.id);
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    return NextResponse.json(entry);
  } catch (error: any) {
    console.error('Error getting entry:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!verifyApiKey(request)) return unauthorized();
  
  try {
    const body = await request.json() as UpdateEntryInput;
    const entry = await updateEntry(params.id, body);
    
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    
    return NextResponse.json(entry);
  } catch (error: any) {
    console.error('Error updating entry:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!verifyApiKey(request)) return unauthorized();
  
  try {
    const deleted = await deleteEntry(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting entry:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
