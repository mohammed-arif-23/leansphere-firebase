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
  kind: z.enum(['text','markdown','video','image','code','bullets','html']),
  content: z.string().optional(),
  html: z.string().optional(),
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
  type: z.enum(['text', 'video', 'code', 'quiz', 'assignment', 'bullets', 'image', 'composite', 'html']),
  title: z.string(),
  content: z.string().default(''),
  html: z.string().optional(),
  order: z.number().int().nonnegative(),
  estimatedMinutes: z.number().int().nonnegative().optional(),
  markdown: z.boolean().optional(),
  textHeadingLevel: z.number().int().min(1).max(6).optional(),
  textFontSize: z.string().optional(),
  // video
  videoUrl: z.string().optional(),
  videoDuration: z.number().int().nonnegative().optional(),
  requiredPercent: z.number().min(0).max(1).optional(),
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
  // required gating
  isRequired: z.boolean().default(false),
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
  isLocked: z.boolean().default(false),
  sequentialRequired: z.boolean().default(false),
  learningObjectives: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  contentBlocks: z.array(ModuleBlockSchema).default([]),
});

const CourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  customHtml: z.string().optional(),
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

    // Normalize quiz payloads from admin shape into API schema shape
    const normalized = (() => {
      try {
        const course = structuredClone(json);
        const modules = Array.isArray(course?.modules) ? course.modules : [];
        modules.forEach((m: any, mIdx: number) => {
          // Ensure required primitives
          if (typeof m.title !== 'string') m.title = String(m.title ?? '');
          // Coerce module.order
          if (typeof m.order !== 'number' || Number.isNaN(m.order)) m.order = mIdx + 1;
          // Clean up nullable numerics so Zod defaults apply
          if (m.estimatedHours == null) delete m.estimatedHours;
          if (m.displayIndex != null) m.displayIndex = String(m.displayIndex);
          if (m.isLocked == null) delete m.isLocked;
          if (m.sequentialRequired == null) delete m.sequentialRequired;
          if (!Array.isArray(m.prerequisites)) m.prerequisites = [];
          const blocks = Array.isArray(m?.contentBlocks) ? m.contentBlocks : [];
          blocks.forEach((b: any, bIdx: number) => {
            // Coerce block.order
            if (typeof b.order !== 'number' || Number.isNaN(b.order)) b.order = bIdx + 1;
            // Coerce estimatedMinutes if present as null
            if (b.estimatedMinutes === null || b.estimatedMinutes === undefined) delete b.estimatedMinutes;
            if (b.videoDuration == null) delete b.videoDuration;
            if (b.requiredPercent == null) delete b.requiredPercent; else b.requiredPercent = Math.max(0, Math.min(1, Number(b.requiredPercent) || 0));
            if (b.timeLimitMs == null) delete b.timeLimitMs;
            if (b.memoryLimitMb == null) delete b.memoryLimitMb;
            if (b?.type === 'quiz' && b.quiz) {
              const qz = b.quiz;
              // Coerce top-level quiz numerics
              if (qz.passingScore == null) delete qz.passingScore; else qz.passingScore = Number(qz.passingScore) || 0;
              if (qz.maxAttempts == null) delete qz.maxAttempts; else qz.maxAttempts = Number(qz.maxAttempts) || 0;
              if (qz.timeLimit == null) delete qz.timeLimit; else qz.timeLimit = Number(qz.timeLimit) || 0;
              const qs = Array.isArray(qz.questions) ? qz.questions : [];
              b.quiz.questions = qs.map((q: any, qi: number) => {
                const question = String(q.question ?? q.text ?? '');
                const rawOpts = Array.isArray(q.options) ? q.options : [];
                const options = rawOpts.map((op: any, oi: number) => ({ id: String(op?.id ?? `o-${qi}-${oi}`), text: String(typeof op === 'string' ? op : (op?.text ?? '')) }));
                const correctOptionId = (() => {
                  if (q.correctOptionId) return String(q.correctOptionId);
                  const ci = Number(q.correctIndex);
                  if (Number.isFinite(ci) && ci >= 0 && ci < options.length) return options[ci].id;
                  return undefined;
                })();
                return {
                  id: String(q.id ?? `q-${qi}`),
                  question,
                  type: (q.type === 'true-false' || q.type === 'fill-blank') ? q.type : 'multiple-choice',
                  options,
                  correctOptionId,
                  explanation: q.explanation,
                  difficulty: q.difficulty ?? 'easy',
                  points: Number.isFinite(Number(q.points)) ? Number(q.points) : 1,
                };
              });
            }
          });
        });
        return course;
      } catch {
        return json;
      }
    })();

    // Also normalize top-level course fields
    if (normalized) {
      if (typeof normalized.title !== 'string') normalized.title = String(normalized.title ?? '');
      if (typeof normalized.description !== 'string') normalized.description = String(normalized.description ?? '');
      if (normalized.estimatedHours == null) delete normalized.estimatedHours;
      if (normalized.enrollmentCount == null) delete normalized.enrollmentCount;
      if (normalized.price == null) delete normalized.price;
      if (normalized.isPublished == null) delete normalized.isPublished;
      if (normalized.isActive == null) delete normalized.isActive;
      if (normalized.isFree == null) delete normalized.isFree;
      if (!Array.isArray(normalized.modules)) normalized.modules = [];
      if (!Array.isArray(normalized.tags)) normalized.tags = [];
      if (!Array.isArray(normalized.prerequisites)) normalized.prerequisites = [];
      if (!Array.isArray(normalized.learningObjectives)) normalized.learningObjectives = [];
    }

    const parsed = CourseSchema.safeParse(normalized);
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
