import { NextRequest, NextResponse } from 'next/server';
import { deleteTag } from '@/lib/knowledge';
import { verifyApiKey, unauthorized } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!verifyApiKey(request)) return unauthorized();
  
  try {
    const deleted = await deleteTag(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
