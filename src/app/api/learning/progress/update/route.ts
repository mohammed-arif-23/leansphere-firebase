import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, badRequest, serverError, requireAuth, unauthorized } from '@/lib/api';
import { ProgressService } from '@/lib/services/database';

const updateSchema = z.object({
  studentId: z.string().min(1),
  courseId: z.string().min(1),
  moduleId: z.string().min(1),
  contentBlockId: z.string().min(1),
  update: z.object({
    status: z.enum(['not-started', 'in-progress', 'completed']).optional(),
    completedAt: z.coerce.date().optional(),
    timeSpent: z.number().nonnegative().optional(),
    attempts: z.number().int().nonnegative().optional(),
    videoProgress: z
      .object({ watchedDuration: z.number(), totalDuration: z.number(), lastPosition: z.number() })
      .partial()
      .optional(),
    codeProgress: z
      .object({ lastSubmission: z.string().optional(), testsPassed: z.number(), totalTests: z.number(), bestScore: z.number().optional() })
      .partial()
      .optional(),
    quizProgress: z
      .object({ score: z.number(), maxScore: z.number(), attempts: z.number(), lastAttemptAt: z.coerce.date().optional() })
      .partial()
      .optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req, ['student', 'admin']);
    if (!auth.ok) return auth.error;

    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid progress update payload', parsed.error.flatten());

    const { studentId, courseId, moduleId, contentBlockId, update } = parsed.data;

    // If the user is a student, ensure they can only update their own progress
    if (auth.ok && auth.auth.role === 'student' && auth.auth.sub !== studentId) {
      return unauthorized('Students can only update their own progress');
    }

    const updated = await ProgressService.updateContentProgress({
      studentId,
      courseId,
      moduleId,
      contentBlockId,
      // zod gives us a safely typed object, but narrow to the service's expected partial type
      update: update as any,
    });

    return ok({ updated });
  } catch (e: any) {
    return serverError('Error updating progress', e?.message);
  }
}
