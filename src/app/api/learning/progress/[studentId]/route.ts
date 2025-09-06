'use server';

import { getUserProgress, getAchievementsByStudentId } from '@/lib/data';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  const userProgress = getUserProgress(params.studentId);
  const achievements = getAchievementsByStudentId(params.studentId);
  
  if (!userProgress) {
    return NextResponse.json({ error: 'User progress not found' }, { status: 404 });
  }

  // In a real app, you would calculate totalHoursSpent and completionRate
  const response = {
      courses: [], // Placeholder for course-specific progress
      achievements,
      totalHoursSpent: 18, // Placeholder
      completionRate: 45, // Placeholder
      ...userProgress,
  }

  return NextResponse.json(response);
}
