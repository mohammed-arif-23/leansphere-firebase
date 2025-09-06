import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { verifyAdminJWT } from '@/lib/adminAuth';
import { models } from '@/models';

const ModuleBlockSchema = z.object({
  id: z.string(),
  displayIndex: z.string().optional(),
  type: z.enum(['text', 'video', 'code', 'quiz', 'assignment']),
  title: z.string(),
  content: z.string().default(''),
  order: z.number().int().nonnegative(),
  estimatedMinutes: z.number().int().nonnegative().optional(),
  videoUrl: z.string().url().optional(),
  videoDuration: z.number().int().nonnegative().optional(),
  codeLanguage: z.enum(['java', 'python', 'javascript']).optional(),
  codeTemplate: z.string().optional(),
  testCases: z.array(z.object({ input: z.string(), expectedOutput: z.string(), isHidden: z.boolean() })).optional(),
});

const ModuleSchema = z.object({
  id: z.string(),
  displayIndex: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number().int().nonnegative(),
  estimatedHours: z.number().int().nonnegative().default(1),
  learningObjectives: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  contentBlocks: z.array(ModuleBlockSchema).default([]),
});

const CourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  language: z.enum(['Java', 'Python', 'JavaScript', 'General']).default('General'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  estimatedHours: z.number().int().nonnegative().default(1),
  imageUrl: z.string().url().optional(),
  imageHint: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  modules: z.array(ModuleSchema).default([]),
  tags: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  learningObjectives: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
  isActive: z.boolean().default(true),
  enrollmentCount: z.number().int().nonnegative().default(0),
  createdBy: z.string().default('admin-user'),
  instructors: z.array(z.string()).default([]),
  price: z.number().nonnegative().default(0),
  currency: z.string().default('USD'),
  isFree: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  // Require admin auth
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : (req.cookies.get('admin_token')?.value || req.cookies.get('auth_token')?.value);
  if (!token) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } }, { status: 401 });
  }
  try { verifyAdminJWT(token); } catch { return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 }); }
  await ensureMongooseConnection();
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit') || '20')));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    models.Course.find({}).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean().exec(),
    models.Course.countDocuments({}).exec(),
  ]);

  return NextResponse.json({ success: true, data: { items, total, page, limit } });
}

export async function POST(req: NextRequest) {
  // Require admin auth
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : (req.cookies.get('admin_token')?.value || req.cookies.get('auth_token')?.value);
  if (!token) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } }, { status: 401 });
  }
  try { verifyAdminJWT(token); } catch { return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 }); }
  try {
    await ensureMongooseConnection();
    const json = await req.json();
    const parsed = CourseSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid payload', details: parsed.error.flatten() } }, { status: 400 });
    }

    // Ensure module.moduleId/contentBlock.moduleId are set properly by id relations
    const course = parsed.data;
    // Sort modules by order and generate displayIndex if missing
    const sortedModules = [...course.modules].sort((a, b) => a.order - b.order);
    const modules = sortedModules.map((m, mIdx) => {
      const moduleDisplay = m.displayIndex && m.displayIndex.trim().length > 0 ? m.displayIndex : `${mIdx + 1}`;
      // Sort blocks by order and generate displayIndex like 1.1, 1.2.1
      const sortedBlocks = [...(m.contentBlocks || [])].sort((a, b) => a.order - b.order);
      const contentBlocks = sortedBlocks.map((cb, cbIdx) => ({
        ...cb,
        moduleId: m.id,
        displayIndex: cb.displayIndex && cb.displayIndex.trim().length > 0 ? cb.displayIndex : `${moduleDisplay}.${cbIdx + 1}`,
      }));
      return {
        ...m,
        courseId: course.id,
        displayIndex: moduleDisplay,
        contentBlocks,
      };
    });

    const doc = await models.Course.create({ ...course, modules });
    return NextResponse.json({ success: true, data: { course: doc.toObject() } }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL', message: e?.message || 'Internal Error' } }, { status: 500 });
  }
}
