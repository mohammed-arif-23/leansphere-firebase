import jwt from 'jsonwebtoken';

export type AuthRole = 'student' | 'admin' | 'instructor';

export interface JwtPayload {
  sub: string; // user id
  role: AuthRole;
  email?: string;
  name?: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || '';

export function requireEnv(name: string, value?: string) {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function signJWT(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresIn: string | number = '7d') {
  const secret = requireEnv('JWT_SECRET', JWT_SECRET);
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyJWT(token: string): JwtPayload {
  const secret = requireEnv('JWT_SECRET', JWT_SECRET);
  const decoded = jwt.verify(token, secret);
  return decoded as JwtPayload;
}

export function getAuthFromHeader(authorization?: string): JwtPayload | null {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  try {
    return verifyJWT(token);
  } catch {
    return null;
  }
}

export function requireRole(payload: JwtPayload | null, allowed: AuthRole[]): asserts payload is JwtPayload {
  if (!payload || !allowed.includes(payload.role)) {
    const err: any = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
}
