'use server';

import { NextResponse } from 'next/server';
import { executeCode } from '@/ai/flows/execute-code';
import type { ExecuteCodeInput } from '@/ai/flows/execute-code';

export async function POST(request: Request) {
  try {
    const { code, language, assignmentId, assignmentPrompt } : Partial<ExecuteCodeInput> & { assignmentId: string } = await request.json();

    if (!code || !language || !assignmentId || !assignmentPrompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await executeCode({
      code,
      language,
      assignmentPrompt
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Error executing code:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
