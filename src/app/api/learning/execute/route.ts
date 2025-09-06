'use server';

import {NextResponse} from 'next/server';

// Based on the design document
interface CodeExecutionRequest {
  code: string;
  language: 'java' | 'python' | 'javascript';
  assignmentId: string; // Keep this for context, though not sent to Piston
}

// Simplified response based on what the frontend needs and what Piston provides
interface CodeExecutionResponse {
  success: boolean;
  output: string;
  errors?: string;
  score: number; // We'll simulate this for now
  feedback: string; // We'll provide a simple feedback message
}

// Piston API specific types
interface PistonFile {
  name: string;
  content: string;
}

interface PistonRequest {
  language: string;
  version: string;
  files: PistonFile[];
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
  compile_memory_limit?: number;
  run_memory_limit?: number;
}

interface PistonResponse {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
}

const languageVersionMap = {
  java: '15.0.2',
  python: '3.10.0',
  javascript: '18.15.0',
};

async function executeWithPiston(
  request: CodeExecutionRequest
): Promise<CodeExecutionResponse> {
  const {language, code} = request;
  const fileName = language === 'java' ? 'Main.java' : `main.${language === 'python' ? 'py' : 'js'}`;
  
  const pistonRequestBody: PistonRequest = {
    language: language,
    version: languageVersionMap[language],
    files: [{name: fileName, content: code}],
    run_timeout: 3000, // 3 second timeout
  };

  try {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(pistonRequestBody),
    });

    if (!response.ok) {
      throw new Error(`Piston API request failed with status ${response.status}`);
    }

    const result: PistonResponse = await response.json();
    
    const errors = result.run.stderr || result.compile?.stderr;
    const output = result.run.stdout;
    const success = !errors;

    // Simulate scoring and feedback based on execution success
    const score = success ? 100 : 0;
    const feedback = success
      ? 'Your code ran successfully!'
      : 'Your code encountered an error. Check the error logs for details.';

    return {
      success,
      output,
      errors: errors || undefined,
      score,
      feedback,
    };
  } catch (error) {
    console.error('Piston API execution error:', error);
    return {
      success: false,
      output: '',
      errors: error instanceof Error ? error.message : 'An unknown error occurred.',
      score: 0,
      feedback: 'Failed to connect to the code execution service. Please try again later.',
    };
  }
}

export async function POST(request: Request) {
  try {
    const {code, language, assignmentId}: Partial<CodeExecutionRequest> =
      await request.json();

    if (!code || !language || !assignmentId) {
      return NextResponse.json(
        {error: 'Missing required fields'},
        {status: 400}
      );
    }
    
    const validLanguages = ['java', 'python', 'javascript'];
    if (!validLanguages.includes(language.toLowerCase())) {
        return NextResponse.json({ error: `Unsupported language: ${language}`}, { status: 400 });
    }


    const result = await executeWithPiston({
      code,
      language: language as 'java' | 'python' | 'javascript',
      assignmentId,
    });

    return NextResponse.json(result, {status: 200});
  } catch (error) {
    console.error('Error executing code:', error);
    return NextResponse.json(
      {error: 'Internal Server Error'},
      {status: 500}
    );
  }
}
