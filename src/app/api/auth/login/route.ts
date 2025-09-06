import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findStudentByRegistrationNumber } from '@/lib/itPanel';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { models } from '@/models';
import { signJWT } from '@/lib/auth';

const loginSchema = z.object({
  registrationNumber: z.string().min(3).trim(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid payload', details: parsed.error.flatten() } }, { status: 400 });
    }

    const registrationNumber = parsed.data.registrationNumber.toUpperCase();

    // 1) Validate against IT Panel (Supabase)
    const itStudent = await findStudentByRegistrationNumber(registrationNumber);
    if (!itStudent) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Registration number not found in IT Panel' } }, { status: 401 });
    }

    // 2) Upsert user in MongoDB for future logins
    await ensureMongooseConnection();

    // Prefer stable id: use Supabase student id if available; else derive from regno
    const stableId = itStudent.id || `user-${registrationNumber}`;

    const now = new Date();
    const user = await models.User.findOneAndUpdate(
      { registrationNumber },
      {
        $setOnInsert: {
          id: stableId,
          role: 'student',
          isActive: true,
          source: 'it-panel',
          createdAt: now,
        },
        $set: {
          registrationNumber,
          name: itStudent.name || registrationNumber,
          email: itStudent.email || `${registrationNumber}@example.com`,
          avatarUrl: undefined,
          lastLogin: now,
          updatedAt: now,
        },
      },
      { upsert: true, new: true }
    ).lean().exec();

    // 3) Issue JWT and set cookie
    const token = signJWT({ sub: user!.id, role: 'student', email: user!.email, name: user!.name });

    const res = NextResponse.json({ success: true, data: { token, user } }, { status: 200 });
    // Cookie for convenience (HttpOnly, secure in prod)
    res.cookies.set('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return res;
  } catch (e: any) {
    console.error('Login error', e);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'Internal Server Error' } }, { status: 500 });
  }
}
