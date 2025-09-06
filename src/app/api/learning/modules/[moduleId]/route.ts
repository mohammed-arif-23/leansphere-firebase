import { NextRequest } from 'next/server';
import { ok, notFound, serverError } from '@/lib/api';
import { ModuleService } from '@/lib/services/database';

export async function GET(
  _request: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const module = await ModuleService.getById(params.moduleId);
    if (!module) return notFound('Module not found');
    // TODO: prerequisite checking based on user's progress
    const isUnlocked = true;
    return ok({ module, isUnlocked });
  } catch (e: any) {
    return serverError('Failed to fetch module', e?.message);
  }
}
