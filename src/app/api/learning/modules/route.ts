
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { created, badRequest, serverError, requireAuth } from '@/lib/api';
import { ModuleService } from '@/lib/services/database';

const createModuleSchema = z.object({
  id: z.string().optional(),
  courseId: z.string().min(1),
  title: z.string().min(3),
  description: z.string().optional(),
  order: z.number().int().nonnegative().default(0),
  estimatedHours: z.number().int().positive().default(1),
  prerequisites: z.array(z.string()).default([]),
  learningObjectives: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req, ['admin']);
    if (!auth.ok) return auth.error;

    const body = await req.json().catch(() => null);
    const parsed = createModuleSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid module payload', parsed.error.flatten());

    const data = parsed.data;
    const mod = await ModuleService.create({
      id: data.id ?? `module-${Date.now()}`,
      courseId: data.courseId,
      title: data.title,
      description: data.description,
      order: data.order,
      estimatedHours: data.estimatedHours,
      contentBlocks: [],
      prerequisites: data.prerequisites,
      isLocked: false,
      learningObjectives: data.learningObjectives,
      tags: data.tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    return created(mod);
  } catch (e: any) {
    return serverError('Error creating module', e?.message);
  }
}
