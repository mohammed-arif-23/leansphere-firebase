import { NextRequest, NextResponse } from 'next/server';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { models } from '@/models';

export async function GET(_req: NextRequest) {
  try {
    await ensureMongooseConnection();

    const [coursesCount, modulesCount, usersCount] = await Promise.all([
      models.Course.countDocuments({}).exec(),
      models.Module.countDocuments({}).exec(),
      models.User.countDocuments({}).exec().catch(() => 0 as any), // if User doesn't exist
    ]);

    // Aggregate progress
    const progress = await models.UserProgress.find({}).lean().exec();
    // Reflect actual users shown in the Admin table; avoids counting orphan progress entries
    const students = Number(usersCount) || 0;
    const totalCompletedModules = progress.reduce((acc: number, p: any) => acc + (Array.isArray(p.completedModules) ? p.completedModules.length : 0), 0);

    // Average time spent per module (rough)
    const timePerModule: Record<string, { total: number; count: number }> = {};
    for (const p of progress as any[]) {
      for (const mp of p.moduleProgress || []) {
        const key = mp.moduleId;
        if (!timePerModule[key]) timePerModule[key] = { total: 0, count: 0 };
        timePerModule[key].total += Number(mp.timeSpent || 0);
        timePerModule[key].count += 1;
      }
    }
    const avgTimeSamples = Object.values(timePerModule).map(v => v.total / Math.max(1, v.count));
    const avgTimePerModule = avgTimeSamples.length ? Math.round(avgTimeSamples.reduce((a, b) => a + b, 0) / avgTimeSamples.length) : 0;

    // Course completion percent per-student average (very rough)
    const avgCompletionPct = progress.length ? Math.round(
      progress.reduce((acc: number, p: any) => acc + Number(p.completionPercentage || 0), 0) / progress.length
    ) : 0;

    return NextResponse.json({
      success: true,
      data: {
        totals: { courses: coursesCount, modules: modulesCount, users: usersCount, students },
        progress: {
          totalCompletedModules,
          avgTimePerModuleSeconds: avgTimePerModule,
          avgCompletionPct,
        },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || 'Failed to compute analytics' } }, { status: 500 });
  }
}
