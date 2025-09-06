'use server';

import { getCourses } from '@/lib/data';
import { NextResponse } from 'next/server';
import type { Course } from '@/types';

export async function GET() {
  const courses = getCourses();
  return NextResponse.json({ courses, totalCount: courses.length });
}

export async function POST(request: Request) {
  try {
    const { title, description, language, difficulty, estimatedHours } : Partial<Course> = await request.json();

    if (!title || !description || !language || !difficulty || !estimatedHours) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // In a real application, you would save this to a database.
    // For now, we'll just log it and return a success response.
    console.log('New course created:', { title, description, language, difficulty, estimatedHours });
    
    const newCourse: Course = {
      id: `new-course-${Date.now()}`,
      title,
      description,
      language,
      difficulty,
      estimatedHours,
      imageUrl: 'https://picsum.photos/600/400',
      imageHint: 'abstract technology',
      modules: [],
      isPublished: false,
      tags: [],
      prerequisites: [],
      learningObjectives: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin-user', // Placeholder
    };

    return NextResponse.json(newCourse, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
