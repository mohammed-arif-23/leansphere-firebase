import { NextResponse } from 'next/server';
import { getSmartHint } from '@/ai/flows/smart-hints';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code = '', assignmentPrompt = '', programmingLanguage = 'javascript' } = body || {};
    const { hint } = await getSmartHint({ code, assignmentPrompt, programmingLanguage });
    return NextResponse.json({ success: true, hint });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to get hint' }, { status: 500 });
  }
}
