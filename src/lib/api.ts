import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthFromHeader, requireRole } from '@/lib/auth';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function badRequest(message: string, details?: any) {
  return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message, details } }, { status: 400 });
}

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message } }, { status: 401 });
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message } }, { status: 403 });
}

export function notFound(message = 'Not Found') {
  return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message } }, { status: 404 });
}

export function serverError(message = 'Internal Server Error', details?: any) {
  return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message, details } }, { status: 500 });
}

export async function parseJson<T>(req: NextRequest, schema: z.ZodType<T>) {
  const json = await req.json().catch(() => null);
  if (!json) return { ok: false as const, error: badRequest('Invalid JSON') };
  const result = schema.safeParse(json);
  if (!result.success) return { ok: false as const, error: badRequest('Validation failed', result.error.flatten()) };
  return { ok: true as const, data: result.data };
}

export function requireAuth(req: NextRequest, roles?: Array<'student' | 'admin' | 'instructor'>) {
  const auth = getAuthFromHeader(req.headers.get('authorization') || undefined);
  if (!auth) return { ok: false as const, error: unauthorized() };
  try {
    if (roles && roles.length) requireRole(auth, roles);
    return { ok: true as const, auth };
  } catch (e: any) {
    return { ok: false as const, error: unauthorized() };
  }
}
