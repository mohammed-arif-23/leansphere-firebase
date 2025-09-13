import { NextRequest, NextResponse } from 'next/server';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { models } from '@/models';
import { z } from 'zod';
import { verifyAdminJWT } from '@/lib/adminAuth';

const PayloadSchema = z.object({
  orders: z.array(z.object({ id: z.string(), order: z.number().int().nonnegative() })).min(1),
});

export async function POST(req: NextRequest) {
  // Require admin auth (cookie or Authorization: Bearer)
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : (req.cookies.get('admin_token')?.value || req.cookies.get('auth_token')?.value);
  if (!token) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } }, { status: 401 });
  }
  try { verifyAdminJWT(token); } catch { return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 }); }

  await ensureMongooseConnection();

  const json = await req.json();
  const parsed = PayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid payload', details: parsed.error.flatten() } }, { status: 400 });
  }

  const { orders } = parsed.data;

  try {
    // Use native collection to avoid schema cache issues with new fields
    const ops = orders.map(({ id, order }) => ({
      updateOne: {
        filter: { id },
        update: { $set: { order } },
        upsert: false,
      },
    }));
    let result: any = null;
    if (ops.length > 0) {
      result = await models.Course.collection.bulkWrite(ops as any, { ordered: false });
    }
    return NextResponse.json({ success: true, data: { matched: result?.matchedCount ?? 0, modified: result?.modifiedCount ?? 0 } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL', message: e?.message || 'Internal Error' } }, { status: 500 });
  }
}
