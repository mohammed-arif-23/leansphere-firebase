
'use server';

import { NextResponse } from 'next/server';
import type { Module } from '@/types';
import { addModule } from '@/lib/data';

export async function POST(request: Request) {
  try {
    const { courseId, title, type, content, quiz } : Partial<Module> = await request.json();

    if (!courseId || !title || !type || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // In a real application, you would save this to a database.
    const newModule: Module = {
      id: `new-module-${Date.now()}`,
      courseId,
      title,
      type,
      content,
      quiz: type === 'quiz' ? quiz : undefined
    };
    
    addModule(newModule);

    return NextResponse.json(newModule, { status: 201 });
  } catch (error) {
    console.error('Error creating module:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
