'use server';

import { executeCode } from '@/ai/flows/execute-code';
import { NextResponse } from 'next/server';

interface CodeExecutionRequest {
  code: string;
  language: 'java' | 'python' | 'javascript';
  assignmentPrompt: string; 
}

export async function POST(request: Request) {
  try {
    const { code, language, assignmentPrompt }: Partial<CodeExecutionRequest> = await request.json();

    if (!code || !language || !assignmentPrompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const validLanguages = ['java', 'python', 'javascript'];
    if (!validLanguages.includes(language.toLowerCase())) {
        return NextResponse.json({ error: `Unsupported language: ${language}`}, { status: 400 });
    }

    const result = await executeCode({
      code,
      language: language.toLowerCase(),
      assignmentPrompt,
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Error executing code with AI:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
