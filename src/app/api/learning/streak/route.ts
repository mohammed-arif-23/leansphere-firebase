import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { models } from '@/models';

// Helper to normalize date to local day string (server-side)
function dayString(d: Date) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString();
}

export async function GET() {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    let auth: any;
    try { auth = verifyJWT(token); } catch { return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }); }

    await ensureMongooseConnection();

    const doc = await models.UserProgress.findOne({ studentId: String(auth.sub), courseId: '_global' }).lean().exec();

    const lastActiveDate = doc?.lastAccessedAt ? new Date(doc.lastAccessedAt).toISOString() : null;

    return NextResponse.json({
      currentStreak: doc?.streak || 0,
      longestStreak: doc?.longestStreak || 0,
      lastActiveDate,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: e?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    let auth: any;
    try { auth = verifyJWT(token); } catch { return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }); }

    await ensureMongooseConnection();

    const studentId = String(auth.sub);

    const now = new Date();
    const todayStr = dayString(now);

    // Ensure doc exists
    await models.UserProgress.updateOne(
      { studentId, courseId: '_global' },
      {
        $setOnInsert: {
          status: 'in-progress',
          enrolledAt: now,
          completionPercentage: 0,
          totalTimeSpent: 0,
          moduleProgress: [],
          streak: 0,
          longestStreak: 0,
          totalSessions: 0,
          averageSessionTime: 0,
          completedModules: [],
          completedContentBlocks: [],
        },
      },
      { upsert: true }
    ).exec();

    const existing = await models.UserProgress.findOne({ studentId, courseId: '_global' }).lean().exec();

    const last = existing?.lastAccessedAt ? new Date(existing.lastAccessedAt) : undefined;
    let newStreak = existing?.streak || 0;

    if (last) {
      const lastStr = dayString(last);
      // compute yesterday string
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = dayString(yesterday);

      if (lastStr === todayStr) {
        // already counted today; keep streak as-is
      } else if (lastStr === yesterdayStr) {
        newStreak = newStreak + 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    const longest = Math.max(existing?.longestStreak || 0, newStreak);

    await models.UserProgress.updateOne(
      { studentId, courseId: '_global' },
      {
        $set: {
          streak: newStreak,
          longestStreak: longest,
          lastAccessedAt: now,
          status: 'in-progress',
        },
        $setOnInsert: { enrolledAt: now },
      }
    ).exec();

    return NextResponse.json({
      currentStreak: newStreak,
      longestStreak: longest,
      lastActiveDate: now.toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: e?.message || 'Unknown error' }, { status: 500 });
  }
}
