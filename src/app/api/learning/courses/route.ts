
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, created, badRequest, serverError, requireAuth } from '@/lib/api';
import { CourseService } from '@/lib/services/database';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '20');
    const language = searchParams.getAll('language');
    const difficulty = searchParams.getAll('difficulty');
    const tags = searchParams.getAll('tags');
    const isPublished = searchParams.get('isPublished');
    const isFree = searchParams.get('isFree');
    const search = searchParams.get('search') || undefined;

    const list = await CourseService.list(
      {
        language: language.length ? language : undefined,
        difficulty: difficulty.length ? difficulty : undefined,
        tags: tags.length ? tags : undefined,
        isPublished: isPublished === null ? undefined : isPublished === 'true',
        isFree: isFree === null ? undefined : isFree === 'true',
        search,
      },
      { page, limit }
    );
    return ok(list);
  } catch (e: any) {
    return serverError('Failed to list courses', e?.message);
  }
}

const createCourseSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3),
  description: z.string().min(10),
  language: z.enum(['Java', 'Python', 'JavaScript', 'General']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedHours: z.number().int().positive().default(10),
  imageUrl: z.string().url().optional(),
  imageHint: z.string().optional(),
  tags: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  learningObjectives: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isFree: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req, ['admin']);
    if (!auth.ok) return auth.error;

    const body = await req.json().catch(() => null);
    const parsed = createCourseSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest('Invalid course payload', parsed.error.flatten());
    }

    const data = parsed.data;
    const course = await CourseService.create({
      id: data.id ?? `course-${Date.now()}`,
      title: data.title,
      description: data.description,
      language: data.language,
      difficulty: data.difficulty,
      estimatedHours: data.estimatedHours,
      imageUrl: data.imageUrl,
      imageHint: data.imageHint,
      modules: [],
      tags: data.tags,
      prerequisites: data.prerequisites,
      learningObjectives: data.learningObjectives,
      isPublished: data.isPublished,
      isActive: data.isActive,
      isFree: data.isFree,
      enrollmentCount: 0,
      createdBy: 'admin-user',
      instructors: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    return created(course);
  } catch (e: any) {
    return serverError('Failed to create course', e?.message);
  }
}
