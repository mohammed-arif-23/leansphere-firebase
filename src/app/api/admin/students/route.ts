import { NextRequest, NextResponse } from 'next/server';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { models } from '@/models';

// GET /api/admin/students
export async function GET(_req: NextRequest) {
  try {
    await ensureMongooseConnection();

    const users = await (models as any).User.find({}, { password: 0 }).lean().exec().catch(() => []);
    const progress = await (models as any).UserProgress.find({}).lean().exec().catch(() => []);

    const progByStudent: Record<string, any> = {};
    for (const p of progress) {
      const sid = String(p.studentId);
      if (!progByStudent[sid]) progByStudent[sid] = { completedModules: 0, completionPercentage: 0 };
      if (Array.isArray(p.completedModules)) progByStudent[sid].completedModules += p.completedModules.length;
      progByStudent[sid].completionPercentage = Math.max(
        progByStudent[sid].completionPercentage,
        Number(p.completionPercentage || 0)
      );
    }

    const data = (users as any[]).map((u) => ({
      id: u.id || u._id?.toString(),
      name: u.name || '',
      email: u.email || '',
      avatarUrl: u.avatarUrl || '',
      progress: progByStudent[u.id || u._id?.toString()] || { completedModules: 0, completionPercentage: 0 },
      createdAt: u.createdAt || null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || 'Failed to load students' } }, { status: 500 });
  }
}

// POST /api/admin/students
export async function POST(req: NextRequest) {
  try {
    await ensureMongooseConnection();
    const body = await req.json();
    const payload = {
      name: String(body.name || ''),
      email: String(body.email || ''),
      avatarUrl: String(body.avatarUrl || ''),
      isActive: true,
    };
    if (!payload.name || !payload.email) {
      return NextResponse.json({ success: false, error: { message: 'name and email are required' } }, { status: 400 });
    }
    const created = await (models as any).User.create(payload);
    return NextResponse.json({ success: true, data: { id: created.id, ...payload } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || 'Failed to create student' } }, { status: 500 });
  }
}
