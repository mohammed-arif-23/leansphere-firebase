import jwt from 'jsonwebtoken';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'admin-secret-fallback';

export function ensureAdminConfigured() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Admin credentials not configured. Please set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local');
  }
}

export function checkAdminCredentials(email: string, password: string): boolean {
  ensureAdminConfigured();
  return email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

export function signAdminJWT(payload: { sub: string; role?: string }) {
  return jwt.sign(payload, ADMIN_JWT_SECRET as string, { expiresIn: '7d' });
}

export function verifyAdminJWT(token: string): { sub: string; role?: string } {
  return jwt.verify(token, ADMIN_JWT_SECRET as string) as any;
}
