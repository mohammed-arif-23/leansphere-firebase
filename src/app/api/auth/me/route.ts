import { NextRequest } from 'next/server';
import { ok, unauthorized } from '@/lib/api';
import { getAuthFromHeader } from '@/lib/auth';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { models } from '@/models';

export async function GET(req: NextRequest) {
  // 1) Read JWT from Authorization header or cookie
  const headerAuth = req.headers.get('authorization') || undefined;
  let auth = getAuthFromHeader(headerAuth);

  if (!auth) {
    const cookie = req.cookies.get('auth_token');
    if (cookie?.value) {
      auth = getAuthFromHeader(`Bearer ${cookie.value}`);
    }
  }

  if (!auth) return unauthorized();

  // 2) Load user profile
  await ensureMongooseConnection();
  const user = await models.User.findOne({ id: auth.sub }).lean().exec();
  if (!user) return unauthorized('User not found');

  return ok({ user, auth });
}
