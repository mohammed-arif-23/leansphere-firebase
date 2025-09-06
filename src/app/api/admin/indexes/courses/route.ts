import { NextRequest, NextResponse } from 'next/server';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { Course } from '@/models';

export async function GET() {
  await ensureMongooseConnection();
  const indexes = await Course.collection.indexes();
  return NextResponse.json({ success: true, data: { indexes } });
}

export async function POST(req: NextRequest) {
  await ensureMongooseConnection();
  const body = await req.json().catch(() => ({} as any));
  const action = body?.action as string | undefined;

  if (action === 'dropAll') {
    try {
      await Course.collection.dropIndexes();
    } catch (e: any) {
      return NextResponse.json({ success: false, error: { code: 'DROP_FAILED', message: e?.message } }, { status: 500 });
    }
    const indexes = await Course.collection.indexes();
    return NextResponse.json({ success: true, data: { dropped: true, indexes } });
  }

  return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Provide { action: "dropAll" }' } }, { status: 400 });
}
