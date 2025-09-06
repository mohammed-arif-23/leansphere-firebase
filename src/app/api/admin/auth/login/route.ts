import { NextRequest, NextResponse } from 'next/server';
import { checkAdminCredentials, signAdminJWT, ensureAdminConfigured } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    ensureAdminConfigured();
    const body = await req.json().catch(() => null);
    const email = (body?.email || '').toString();
    const password = (body?.password || '').toString();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'email and password required' } }, { status: 400 });
    }

    const ok = checkAdminCredentials(email, password);
    if (!ok) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } }, { status: 401 });
    }

    const token = signAdminJWT({ sub: email, role: 'admin' });
    const res = NextResponse.json({ success: true, data: { token, user: { email, role: 'admin' } } });

    res.cookies.set('admin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL', message: e?.message || 'Internal Error' } }, { status: 500 });
  }
}
