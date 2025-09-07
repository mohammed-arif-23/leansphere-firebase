import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'AI summary endpoint has been removed.' },
    { status: 410 }
  );
}
