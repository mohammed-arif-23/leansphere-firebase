'use server';

import { getModuleById } from '@/lib/data';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  // In a real app, you'd get the courseId from the context or URL
  // For now, we find the module across all courses.
  const module = getModuleById(params.moduleId);
  
  if (!module) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }

  // Prerequisite checking would happen here
  const isUnlocked = true; // Placeholder

  return NextResponse.json({ module, isUnlocked });
}
