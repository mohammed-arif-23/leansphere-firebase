import { NextRequest, NextResponse } from 'next/server';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { verifyJWT } from '@/lib/auth';
import { ProgressService } from '@/lib/services/database';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing auth' } }, { status: 401 });
    const auth = verifyJWT(token);

    const body = await req.json();
    const { courseId, moduleId } = body || {};
    if (!courseId || !moduleId) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'courseId and moduleId required' } }, { status: 400 });
    }

    await ensureMongooseConnection();

    const updated = await ProgressService.completeModule({ studentId: auth.sub as string, courseId, moduleId });

    return NextResponse.json({ success: true, data: { updated } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL', message: e?.message || 'Internal Error' } }, { status: 500 });
  }
}
