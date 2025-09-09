import { NextRequest, NextResponse } from 'next/server';
import { findStudentById } from '@/lib/itPanel';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { models } from '@/models';
import { signJWT } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = (searchParams.get('studentId') || '').trim();
    if (!studentId) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing studentId' } }, { status: 400 });
    }

    // 1) Validate student in IT Panel (Supabase) by id
    const itStudent = await findStudentById(studentId);
    if (!itStudent || !itStudent.registrationNumber) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Student not found' } }, { status: 401 });
    }

    // 2) Upsert user in MongoDB
    await ensureMongooseConnection();

    const registrationNumber = String(itStudent.registrationNumber).toUpperCase();
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
    res.cookies.set('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e: any) {
    console.error('Autologin error', e);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'Internal Server Error' } }, { status: 500 });
  }
}
