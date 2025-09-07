import { NextResponse } from 'next/server';
import { askAI } from '@/ai/flows/ask';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question = '', context = '' } = body || {};
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ success: false, error: 'question is required' }, { status: 400 });
    }
    const { answer } = await askAI({ question, context });
    return NextResponse.json({ success: true, answer });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to get answer' }, { status: 500 });
  }
}
