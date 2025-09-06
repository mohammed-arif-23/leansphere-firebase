import { NextRequest } from 'next/server';
import { ok, notFound, serverError } from '@/lib/api';
import { CourseService } from '@/lib/services/database';

export async function GET(_req: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const course = await CourseService.getById(params.courseId);
    if (!course) return notFound('Course not found');
    return ok(course);
  } catch (e: any) {
    return serverError('Failed to fetch course', e?.message);
  }
}
