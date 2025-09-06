import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { models } from '@/models';

const QuizOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  isCorrect: z.boolean().optional(),
});

const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(['multiple-choice', 'true-false', 'fill-blank']),
  options: z.array(QuizOptionSchema).default([]),
  correctOptionId: z.string().optional(),
  explanation: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('easy'),
  points: z.number().int().nonnegative().default(1),
});

const QuizSchema = z.object({
  questions: z.array(QuizQuestionSchema).default([]),
  passingScore: z.number().int().nonnegative().default(0),
  timeLimit: z.number().int().nonnegative().optional(),
  allowRetakes: z.boolean().default(true),
  maxAttempts: z.number().int().nonnegative().optional(),
});

const CompositeItemSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(['text','markdown','video','image','code','bullets']),
  content: z.string().optional(),
  textHeadingLevel: z.number().int().min(1).max(6).optional(),
  textFontSize: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  videoUrl: z.string().optional(),
  codeContent: z.string().optional(),
  codeLanguage: z.enum(['java','python','javascript','typescript','c','cpp','go','ruby','html','css']).optional(),
  codeFontSize: z.string().optional(),
});

const ModuleBlockSchema = z.object({
  id: z.string(),
  displayIndex: z.string().optional(),
  type: z.enum(['text', 'video', 'code', 'quiz', 'assignment', 'bullets', 'image', 'composite']),
  title: z.string(),
  content: z.string().default(''),
  order: z.number().int().nonnegative(),
  estimatedMinutes: z.number().int().nonnegative().optional(),
  markdown: z.boolean().optional(),
  textHeadingLevel: z.number().int().min(1).max(6).optional(),
  textFontSize: z.string().optional(),
  // video
  videoUrl: z.string().optional(),
  videoDuration: z.number().int().nonnegative().optional(),
  // code
  codeLanguage: z.enum(['java', 'python', 'javascript','typescript','c','cpp','go','ruby','html','css']).optional(),
  codeTemplate: z.string().optional(),
  codeContent: z.string().optional(),
  codeKind: z.enum(['illustrative', 'exam']).optional(),
  codeFontSize: z.string().optional(),
  timeLimitMs: z.number().int().nonnegative().optional(),
  memoryLimitMb: z.number().int().nonnegative().optional(),
  testCases: z
    .array(z.object({ input: z.string(), expectedOutput: z.string(), isHidden: z.boolean().optional() }))
    .optional(),
  // bullets
  bullets: z.array(z.string()).optional(),
  bulletsMarkdown: z.boolean().optional(),
  // image
  imageUrl: z.string().optional(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  // quiz
  quiz: QuizSchema.optional(),
  // composite
  items: z.array(CompositeItemSchema).optional(),
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

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await ensureMongooseConnection();
  const { id } = await ctx.params;
  const doc = await models.Course.findOne({ id }).lean().exec();
  if (!doc) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } }, { status: 404 });
  return NextResponse.json({ success: true, data: { course: doc } });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ensureMongooseConnection();
    const json = await req.json();
    const parsed = CourseSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid payload', details: parsed.error.flatten() } }, { status: 400 });
    }

    const course = parsed.data;
    const { id } = await ctx.params;
    // Sort and generate indices if missing
    const sortedModules = [...course.modules].sort((a, b) => a.order - b.order);
    const modules = sortedModules.map((m, mIdx) => {
      const moduleDisplay = m.displayIndex && m.displayIndex.trim().length > 0 ? m.displayIndex : `${mIdx + 1}`;
      const sortedBlocks = [...(m.contentBlocks || [])].sort((a, b) => a.order - b.order);
      const contentBlocks = sortedBlocks.map((cb, cbIdx) => ({
        ...cb,
        moduleId: m.id,
        displayIndex: cb.displayIndex && cb.displayIndex.trim().length > 0 ? cb.displayIndex : `${moduleDisplay}.${cbIdx + 1}`,
      }));
      return { ...m, courseId: course.id, displayIndex: moduleDisplay, contentBlocks };
    });

    const updated = await models.Course.findOneAndUpdate(
      { id },
      { $set: { ...course, modules } },
      { new: true, upsert: false }
    ).lean().exec();

    if (!updated) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } }, { status: 404 });
    return NextResponse.json({ success: true, data: { course: updated } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL', message: e?.message || 'Internal Error' } }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await ensureMongooseConnection();
  const { id } = await ctx.params;
  await models.Course.deleteOne({ id }).exec();
  return NextResponse.json({ success: true });
}
