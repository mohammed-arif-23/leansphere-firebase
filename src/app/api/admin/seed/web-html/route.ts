import { NextRequest, NextResponse } from 'next/server';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { Course } from '@/models';

export async function POST(_req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Seeding disabled in production' } }, { status: 403 });
  }

  await ensureMongooseConnection();
  // Ensure there is no lingering text index on the collection
  try {
    const indexes = await Course.collection.indexes();
    for (const idx of indexes) {
      if ((idx as any).key && ((idx as any).key as any)._fts === 'text') {
        await Course.collection.dropIndex((idx as any).name);
      }
    }
  } catch {}

  const existing = await Course.findOne({ id: 'web-html-101' }).lean().exec();
  if (existing) {
    return NextResponse.json({ success: true, data: { seeded: false, course: existing } });
  }

  const now = new Date();
  const course = {
    id: 'web-html-101',
    title: 'Web Development with HTML',
    description: 'Learn the foundations of the web with HTML. Build structured pages and a solid understanding of semantic markup.',
    language: 'General',
    difficulty: 'beginner',
    estimatedHours: 6,
    imageUrl: 'https://picsum.photos/seed/html/1200/400',
    imageHint: 'html code',
    modules: [
      {
        id: 'html-1',
        courseId: 'web-html-101',
        title: 'Introduction to the Web and HTML',
        description: 'What is HTML and how the web works',
        order: 1,
        estimatedHours: 1,
        contentBlocks: [],
        prerequisites: [],
        isLocked: false,
        learningObjectives: ['Understand how browsers render HTML', 'Basic tags and structure'],
        tags: ['html', 'intro']
      },
      {
        id: 'html-2',
        courseId: 'web-html-101',
        title: 'HTML Document Structure',
        description: 'Headings, paragraphs, links and images',
        order: 2,
        estimatedHours: 1,
        contentBlocks: [],
        prerequisites: ['html-1'],
        isLocked: false,
        learningObjectives: ['Build a basic HTML page', 'Use semantic tags for content'],
        tags: ['html', 'structure']
      },
      {
        id: 'html-3',
        courseId: 'web-html-101',
        title: 'Lists and Tables',
        description: 'Organize content using lists and tables',
        order: 3,
        estimatedHours: 1,
        contentBlocks: [],
        prerequisites: ['html-2'],
        isLocked: false,
        learningObjectives: ['Create ordered/unordered lists', 'Build accessible tables'],
        tags: ['html', 'lists', 'tables']
      },
      {
        id: 'html-4',
        courseId: 'web-html-101',
        title: 'Forms and Inputs',
        description: 'Collect user input with forms',
        order: 4,
        estimatedHours: 1,
        contentBlocks: [],
        prerequisites: ['html-3'],
        isLocked: false,
        learningObjectives: ['Create forms', 'Use input types and labels'],
        tags: ['html', 'forms']
      },
      {
        id: 'html-5',
        courseId: 'web-html-101',
        title: 'Media and Embeds',
        description: 'Images, audio, video and iframes',
        order: 5,
        estimatedHours: 1,
        contentBlocks: [],
        prerequisites: ['html-4'],
        isLocked: false,
        learningObjectives: ['Embed media', 'Best practices for performance'],
        tags: ['html', 'media']
      },
      {
        id: 'html-6',
        courseId: 'web-html-101',
        title: 'Semantic HTML and Accessibility',
        description: 'Use semantic tags and improve accessibility',
        order: 6,
        estimatedHours: 1,
        contentBlocks: [],
        prerequisites: ['html-5'],
        isLocked: false,
        learningObjectives: ['Semantic layout', 'ARIA basics'],
        tags: ['html', 'a11y']
      },
    ],
    tags: ['HTML', 'Web Development', 'Frontend'],
    prerequisites: [],
    learningObjectives: ['Structure pages with semantic HTML', 'Create forms and tables'],
    isPublished: true,
    isActive: true,
    isFree: true,
    enrollmentCount: 0,
    createdBy: 'admin-user',
    instructors: [],
    createdAt: now,
    updatedAt: now,
  } as any;

  const doc = await Course.create(course);
  return NextResponse.json({ success: true, data: { seeded: true, course: doc.toObject() } });
}
