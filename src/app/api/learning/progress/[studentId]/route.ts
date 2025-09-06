import { NextRequest } from 'next/server';
import { ok, notFound, serverError } from '@/lib/api';
import { ProgressService, AchievementService } from '@/lib/services/database';

export async function GET(
  _request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    // For MVP, fetch all progress docs for the student
    const progress = await ProgressService.getByStudent(params.studentId);
    if (!progress || progress.length === 0) return notFound('User progress not found');

    // Achievements earned by this student
    const achievements = await AchievementService.getForStudent(params.studentId);

    // Basic aggregates (placeholder calculations)
    const totalHoursSpent = progress.reduce((acc, p) => acc + (p.totalTimeSpent || 0), 0) / 60;
    const completionRate = Math.round(
      progress.reduce((acc, p) => acc + (p.completionPercentage || 0), 0) /
        Math.max(1, progress.length)
    );

    return ok({ progress, achievements, totalHoursSpent, completionRate });
  } catch (e: any) {
    return serverError('Failed to fetch progress', e?.message);
  }
}
