import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PISTON_URL = 'https://emkc.org/api/v2/piston/execute';

const TestCaseSchema = z.object({ input: z.string(), expectedOutput: z.string().optional() });

const RunSchema = z.object({
  language: z.enum(['java', 'python', 'javascript']),
  code: z.string(),
  input: z.string().default(''),
  testCases: z.array(TestCaseSchema).optional(),
  timeLimitMs: z.number().int().positive().max(20000).default(5000),
  memoryLimitMb: z.number().int().positive().max(2048).default(512),
});

function mapLanguage(lang: 'java' | 'python' | 'javascript') {
  switch (lang) {
    case 'javascript':
      return { language: 'javascript', version: '18.15.0' }; // Node 18
    case 'python':
      return { language: 'python', version: '3.10.0' };
    case 'java':
      return { language: 'java', version: '15.0.2' };
  }
}

async function runWithPiston(language: string, version: string, code: string, stdin: string) {
  const body = {
    language,
    version,
    files: [{ name: 'Main.' + (language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'java'), content: code }],
    stdin,
  } as any;

  const res = await fetch(PISTON_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Piston error: ${res.status} ${txt}`);
  }
  const json = await res.json();
  return json as { run: { stdout: string; stderr: string; code: number; signal?: string } };
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = RunSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid payload', details: parsed.error.flatten() } }, { status: 400 });
  }

  const { language, code, input, testCases } = parsed.data;

  const mapped = mapLanguage(language);

  try {
    if (testCases && testCases.length > 0) {
      const results = [] as Array<{ input: string; stdout: string; stderr: string; pass?: boolean; expectedOutput?: string; exitCode: number }>;
      for (const tc of testCases) {
        const r = await runWithPiston(mapped.language, mapped.version, code, tc.input);
        const stdout = (r.run.stdout || '').trim();
        const expected = (tc.expectedOutput || '').trim();
        results.push({ input: tc.input, stdout, stderr: r.run.stderr, pass: expected ? stdout === expected : undefined, expectedOutput: expected || undefined, exitCode: r.run.code });
      }
      return NextResponse.json({ success: true, data: { mode: 'batch', results } });
    } else {
      const r = await runWithPiston(mapped.language, mapped.version, code, input || '');
      return NextResponse.json({ success: true, data: { mode: 'single', stdout: r.run.stdout, stderr: r.run.stderr, exitCode: r.run.code } });
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { code: 'EXECUTION_FAILED', message: e?.message || 'Execution failed' } }, { status: 500 });
  }
}
