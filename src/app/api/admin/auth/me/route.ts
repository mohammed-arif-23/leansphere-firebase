import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminJWT } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.cookies.get('admin_token')?.value;
  if (!token) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } }, { status: 401 });
  try {
    const payload = verifyAdminJWT(token);
    return NextResponse.json({ success: true, data: { admin: { email: payload.sub, role: payload.role || 'admin' } } });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }
}
