import { NextRequest, NextResponse } from 'next/server';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { models } from '@/models';

// PUT /api/admin/students/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureMongooseConnection();
    const { id } = await params;
    const body = await req.json();
    const User = (models as any)?.User;
    if (!User) return NextResponse.json({ success: false, error: { message: 'User model not available' } }, { status: 501 });
    const update: any = {};
    if (body.name !== undefined) update.name = String(body.name);
    if (body.email !== undefined) update.email = String(body.email);
    if (body.avatarUrl !== undefined) update.avatarUrl = String(body.avatarUrl);
    if (body.isActive !== undefined) update.isActive = Boolean(body.isActive);

    // Support non-ObjectId identifiers by updating via $or
    let updated = await User.findOneAndUpdate({ $or: [{ _id: id }, { id }] }, update, { new: true }).lean().exec().catch(() => null);
    if (!updated) {
      // Try again with delete cast handling
      try {
        updated = await User.findOneAndUpdate({ id }, update, { new: true }).lean().exec();
      } catch {}
    }
    if (!updated) return NextResponse.json({ success: false, error: { message: 'Student not found' } }, { status: 404 });
    return NextResponse.json({ success: true, data: { id: updated._id?.toString(), ...updated } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || 'Failed to update student' } }, { status: 500 });
  }
}

// DELETE /api/admin/students/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureMongooseConnection();
    const { id } = await params;
    const User = (models as any)?.User;
    if (!User) return NextResponse.json({ success: false, error: { message: 'User model not available' } }, { status: 501 });
    let res = await User.findOneAndDelete({ $or: [{ _id: id }, { id }] }).lean().exec().catch(() => null);
    if (!res) {
      try {
        res = await User.findOneAndDelete({ id }).lean().exec();
      } catch {}
    }
    if (!res) return NextResponse.json({ success: false, error: { message: 'Student not found' } }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || 'Failed to delete student' } }, { status: 500 });
  }
}
