'use server';

import { NextResponse } from 'next/server';

interface UpdateProgressRequest {
  studentId: string;
  moduleId: string;
  contentId: string;
  progressType: "video_watched" | "assignment_completed" | "quiz_passed";
  progressData: any;
}

export async function POST(request: Request) {
  try {
    const { studentId, moduleId, progressType, progressData }: UpdateProgressRequest = await request.json();

    if (!studentId || !moduleId || !progressType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // In a real application, you would save this to a database.
    // For now, we'll just log it and return a success response.
    console.log('Progress updated:', { studentId, moduleId, progressType, progressData });
    
    // You could also award achievements here
    
    return NextResponse.json({ success: true, message: 'Progress updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
