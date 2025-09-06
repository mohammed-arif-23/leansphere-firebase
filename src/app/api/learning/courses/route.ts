
'use server';

import { getCourses, addCourse } from '@/lib/data';
import { NextResponse } from 'next/server';
import type { Course } from '@/types';

export async function GET() {
  const courses = getCourses();
  return NextResponse.json({ courses, totalCount: courses.length });
}

export async function POST(request: Request) {
  try {
    const { title, description, language, difficulty, imageUrl } : Partial<Course> = await request.json();

    if (!title || !description || !language || !difficulty ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newCourse: Course = {
      id: `new-course-${Date.now()}`,
      title,
      description,
      language,
      difficulty,
      estimatedHours: 10, // Placeholder
      imageUrl: imageUrl || 'https://picsum.photos/600/400',
      imageHint: 'abstract technology',
      modules: [],
      isPublished: false,
      tags: [language],
      prerequisites: [],
      learningObjectives: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin-user', // Placeholder
    };

    addCourse(newCourse);

    return NextResponse.json(newCourse, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
