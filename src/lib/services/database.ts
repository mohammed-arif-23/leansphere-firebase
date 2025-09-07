import { FilterQuery, UpdateQuery } from 'mongoose';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { models } from '@/models';
import type {
  ApiResponse,
  Course,
  CourseDocument,
  CourseFilters,
  Module as ModuleType,
  ModuleDocument,
  ContentBlock as ContentBlockType,
  ContentBlockDocument,
  UserProgress as UserProgressType,
  UserProgressDocument,
  Achievement as AchievementType,
  AchievementDocument,
  UserAchievementDocument,
} from '@/types/database';

// Generic pagination params
export interface Pagination {
  page?: number; // 1-based
  limit?: number; // items per page
}

export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

function buildPagination({ page = 1, limit = 20 }: Pagination = {}) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  return { skip, limit: Math.max(1, limit), page: Math.max(1, page) };
}

// Courses Service
export const CourseService = {
  async list(filters: CourseFilters = {}, pagination: Pagination = {}): Promise<ListResult<Course>> {
    await ensureMongooseConnection();

    const query: FilterQuery<CourseDocument> = {};

    if (filters.language?.length) query.language = { $in: filters.language } as any;
    if (filters.difficulty?.length) query.difficulty = { $in: filters.difficulty } as any;
    if (filters.tags?.length) query.tags = { $in: filters.tags } as any;
    if (typeof filters.isPublished === 'boolean') query.isPublished = filters.isPublished;
    if (typeof filters.isFree === 'boolean') query.isFree = filters.isFree;

    if (filters.search && filters.search.trim().length > 0) {
      query.$text = { $search: filters.search.trim() } as any;
    }

    const { skip, limit, page } = buildPagination(pagination);

    const [items, total] = await Promise.all([
      models.Course.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      models.Course.countDocuments(query),
    ]);

    return { items, total, page, limit, hasMore: skip + items.length < total };
  },

  async getById(courseId: string): Promise<Course | null> {
    await ensureMongooseConnection();
    return models.Course.findOne({ id: courseId }).lean().exec();
  },

  async create(course: Course): Promise<Course> {
    await ensureMongooseConnection();
    const doc = await models.Course.create(course);
    return doc.toObject();
  },

  async update(courseId: string, update: UpdateQuery<CourseDocument>): Promise<Course | null> {
    await ensureMongooseConnection();
    const updated = await models.Course.findOneAndUpdate({ id: courseId }, update, { new: true }).lean<Course>().exec();
    return updated;
  },

  async remove(courseId: string): Promise<boolean> {
    await ensureMongooseConnection();
    const res = await models.Course.deleteOne({ id: courseId }).exec();
    return res.deletedCount === 1;
  },
};

// Modules Service (modules are embedded under Course in our schema, but we also keep a Module collection for fast access)
export const ModuleService = {
  async getById(moduleId: string): Promise<ModuleType | null> {
    await ensureMongooseConnection();
    return models.Module.findOne({ id: moduleId }).lean<ModuleType>().exec();
  },

  async create(module: ModuleType): Promise<ModuleType> {
    await ensureMongooseConnection();
    const session = await (await import('mongoose')).default.startSession();
    session.startTransaction();
    try {
      // Create standalone module
      const created = await models.Module.create([module], { session });

      // Also push into course.modules for denormalized access
      await models.Course.updateOne(
        { id: module.courseId },
        { $push: { modules: module } },
        { session }
      );

      await session.commitTransaction();
      return created[0].toObject();
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  },

  async update(moduleId: string, update: UpdateQuery<ModuleDocument>): Promise<ModuleType | null> {
    await ensureMongooseConnection();
    const session = await (await import('mongoose')).default.startSession();
    session.startTransaction();
    try {
      const updated = await models.Module.findOneAndUpdate({ id: moduleId }, update, { new: true, session }).lean<ModuleType>().exec();
      if (updated) {
        // reflect in course.modules array
        await models.Course.updateOne(
          { id: updated.courseId, 'modules.id': moduleId },
          { $set: { 'modules.$': updated } },
          { session }
        );
      }
      await session.commitTransaction();
      return updated;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  },

  async remove(moduleId: string): Promise<boolean> {
    await ensureMongooseConnection();
    const session = await (await import('mongoose')).default.startSession();
    session.startTransaction();
    try {
      const mod = await models.Module.findOne({ id: moduleId }).lean<ModuleType>().session(session).exec();
      if (!mod) {
        await session.abortTransaction();
        return false;
      }
      const del = await models.Module.deleteOne({ id: moduleId }).session(session).exec();
      await models.Course.updateOne(
        { id: mod.courseId },
        { $pull: { modules: { id: moduleId } } },
        { session }
      );
      await session.commitTransaction();
      return del.deletedCount === 1;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  },
};

// Content Blocks Service (embedded within Module, also separate collection for search/filter)
export const ContentBlockService = {
  async getById(contentBlockId: string): Promise<ContentBlockType | null> {
    await ensureMongooseConnection();
    return models.ContentBlock.findOne({ id: contentBlockId }).lean<ContentBlockType>().exec();
  },

  async create(block: ContentBlockType): Promise<ContentBlockType> {
    await ensureMongooseConnection();
    const session = await (await import('mongoose')).default.startSession();
    session.startTransaction();
    try {
      const created = await models.ContentBlock.create([block], { session });
      // push into module.contentBlocks
      await models.Module.updateOne(
        { id: block.moduleId },
        { $push: { contentBlocks: block } },
        { session }
      );
      await session.commitTransaction();
      return created[0].toObject();
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  },

  async update(contentBlockId: string, update: UpdateQuery<ContentBlockDocument>): Promise<ContentBlockType | null> {
    await ensureMongooseConnection();
    const session = await (await import('mongoose')).default.startSession();
    session.startTransaction();
    try {
      const updated = await models.ContentBlock.findOneAndUpdate({ id: contentBlockId }, update, { new: true, session }).lean<ContentBlockType>().exec();
      if (updated) {
        await models.Module.updateOne(
          { id: updated.moduleId, 'contentBlocks.id': contentBlockId },
          { $set: { 'contentBlocks.$': updated } },
          { session }
        );
      }
      await session.commitTransaction();
      return updated;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  },

  async remove(contentBlockId: string): Promise<boolean> {
    await ensureMongooseConnection();
    const session = await (await import('mongoose')).default.startSession();
    session.startTransaction();
    try {
      const block = await models.ContentBlock.findOne({ id: contentBlockId }).lean<ContentBlockType>().session(session).exec();
      if (!block) {
        await session.abortTransaction();
        return false;
      }
      const del = await models.ContentBlock.deleteOne({ id: contentBlockId }).session(session).exec();
      await models.Module.updateOne(
        { id: block.moduleId },
        { $pull: { contentBlocks: { id: contentBlockId } } },
        { session }
      );
      await session.commitTransaction();
      return del.deletedCount === 1;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  },
};

// Progress Service with atomic updates and conflict resolution
export const ProgressService = {
  async getByStudent(studentId: string): Promise<UserProgressType[]> {
    await ensureMongooseConnection();
    const items = await models.UserProgress.find({ studentId }).lean().exec();
    // Coalesce top-level completedContentBlocks from nested structure if missing
    return items.map((it: any) => {
      const nestedCompleted: string[] = [];
      try {
        for (const mp of it?.moduleProgress || []) {
          for (const cp of mp?.contentProgress || []) {
            if (cp?.status === 'completed' && cp?.contentBlockId) nestedCompleted.push(cp.contentBlockId);
          }
        }
      } catch {}
      const unique = Array.from(new Set([...(it?.completedContentBlocks || []), ...nestedCompleted]));
      return { ...it, completedContentBlocks: unique } as UserProgressType;
    });
  },

  async get(studentId: string, courseId: string): Promise<UserProgressType | null> {
    await ensureMongooseConnection();
    return models.UserProgress.findOne({ studentId, courseId }).lean().exec();
  },

  async upsert(progress: UserProgressType): Promise<UserProgressType> {
    await ensureMongooseConnection();
    const updated = await models.UserProgress.findOneAndUpdate(
      { studentId: progress.studentId, courseId: progress.courseId },
      { $set: progress },
      { upsert: true, new: true }
    ).lean<UserProgressType>().exec();
    return updated as UserProgressType;
  },

  // Atomic-ish update for content progress (multi-step to support array element upserts)
  async updateContentProgress(params: {
    studentId: string;
    courseId: string;
    moduleId: string;
    contentBlockId: string;
    update: Partial<UserProgressType['moduleProgress'][number]['contentProgress'][number]>;
  }): Promise<UserProgressType | null> {
    await ensureMongooseConnection();

    const { studentId, courseId, moduleId, contentBlockId, update } = params;

    // 1) Ensure root user progress doc exists
    await models.UserProgress.updateOne(
      { studentId, courseId },
      {
        $setOnInsert: {
          status: 'in-progress',
          enrolledAt: new Date(),
          completionPercentage: 0,
          totalTimeSpent: 0,
          moduleProgress: [],
          streak: 0,
          longestStreak: 0,
          totalSessions: 0,
          averageSessionTime: 0,
          completedModules: [],
          completedContentBlocks: [],
        },
        $set: { lastAccessedAt: new Date() },
      },
      { upsert: true }
    ).exec();

    // 2) Ensure the module progress entry exists
    await models.UserProgress.updateOne(
      { studentId, courseId, 'moduleProgress.moduleId': { $ne: moduleId } },
      {
        $push: {
          moduleProgress: {
            moduleId,
            status: 'in-progress',
            completedAt: null,
            completionPercentage: 0,
            timeSpent: 0,
            contentProgress: [],
          },
        },
      }
    ).exec();

    // 3) Ensure the content progress entry exists
    await models.UserProgress.updateOne(
      { studentId, courseId },
      {
        $addToSet: {
          'moduleProgress.$[m].contentProgress': { contentBlockId },
        },
      },
      {
        arrayFilters: [{ 'm.moduleId': moduleId }],
      }
    ).exec();

    // 4) Apply field updates to the specific content progress element
    const setPayload: any = {
      'moduleProgress.$[m].status': 'in-progress',
    };
    if (update.status !== undefined) setPayload['moduleProgress.$[m].contentProgress.$[c].status'] = update.status;
    if (update.completedAt !== undefined) setPayload['moduleProgress.$[m].contentProgress.$[c].completedAt'] = update.completedAt;
    if (update.timeSpent !== undefined) setPayload['moduleProgress.$[m].contentProgress.$[c].timeSpent'] = update.timeSpent;
    if (update.attempts !== undefined) setPayload['moduleProgress.$[m].contentProgress.$[c].attempts'] = update.attempts;
    if (update.videoProgress !== undefined) setPayload['moduleProgress.$[m].contentProgress.$[c].videoProgress'] = update.videoProgress as any;
    if (update.codeProgress !== undefined) setPayload['moduleProgress.$[m].contentProgress.$[c].codeProgress'] = update.codeProgress as any;
    if (update.quizProgress !== undefined) setPayload['moduleProgress.$[m].contentProgress.$[c].quizProgress'] = update.quizProgress as any;

    if (Object.keys(setPayload).length > 0) {
      await models.UserProgress.updateOne(
        { studentId, courseId },
        { $set: setPayload },
        {
          arrayFilters: [
            { 'm.moduleId': moduleId },
            { 'c.contentBlockId': contentBlockId },
          ],
        }
      ).exec();
    }

    // 5) If status is completed, add to top-level completedContentBlocks (idempotent)
    if (update.status === 'completed') {
      await models.UserProgress.updateOne(
        { studentId, courseId },
        { $addToSet: { completedContentBlocks: contentBlockId } }
      ).exec();
    }

    // 6) Fetch updated document (TODO: recompute completion properly)
    return models.UserProgress.findOne({ studentId, courseId }).lean().exec();
  },

  async completeModule(params: { studentId: string; courseId: string; moduleId: string }): Promise<UserProgressType | null> {
    await ensureMongooseConnection();
    const { studentId, courseId, moduleId } = params;

    // Ensure progress doc exists
    await models.UserProgress.updateOne(
      { studentId, courseId },
      {
        $setOnInsert: {
          status: 'in-progress',
          enrolledAt: new Date(),
          completionPercentage: 0,
          totalTimeSpent: 0,
          moduleProgress: [],
          streak: 0,
          longestStreak: 0,
          totalSessions: 0,
          averageSessionTime: 0,
          completedModules: [],
          completedContentBlocks: [],
        },
        $set: { lastAccessedAt: new Date() },
      },
      { upsert: true }
    ).exec();

    // Ensure moduleProgress entry exists
    await models.UserProgress.updateOne(
      { studentId, courseId, 'moduleProgress.moduleId': { $ne: moduleId } },
      {
        $push: {
          moduleProgress: {
            moduleId,
            status: 'in-progress',
            completedAt: null,
            completionPercentage: 0,
            timeSpent: 0,
            contentProgress: [],
          },
        },
      }
    ).exec();

    // Mark module as completed and add to completedModules
    await models.UserProgress.updateOne(
      { studentId, courseId },
      {
        $addToSet: { completedModules: moduleId },
        $set: {
          'moduleProgress.$[m].status': 'completed',
          'moduleProgress.$[m].completedAt': new Date(),
        },
      },
      { arrayFilters: [{ 'm.moduleId': moduleId }] }
    ).exec();

    return models.UserProgress.findOne({ studentId, courseId }).lean().exec();
  },
};

// Achievements Service
export const AchievementService = {
  async listActive(): Promise<AchievementType[]> {
    await ensureMongooseConnection();
    return models.Achievement.find({ isActive: true }).lean().exec();
  },

  async getForStudent(studentId: string) {
    await ensureMongooseConnection();
    const userAch = await models.UserAchievement.find({ studentId }).lean().exec();
    return userAch;
  },

  async award(params: {
    studentId: string;
    achievementId: string;
    relatedCourseId?: string;
    relatedModuleId?: string;
    context?: Record<string, any>;
  }): Promise<boolean> {
    await ensureMongooseConnection();

    // ensure achievement exists
    const ach = await models.Achievement.findOne({ id: params.achievementId }).lean<AchievementType>().exec();
    if (!ach) return false;

    // upsert user achievement
    const ua = await models.UserAchievement.findOneAndUpdate(
      { studentId: params.studentId, achievementId: params.achievementId },
      {
        $setOnInsert: {
          earnedAt: new Date(),
        },
        $set: {
          relatedCourseId: params.relatedCourseId,
          relatedModuleId: params.relatedModuleId,
          context: params.context ?? {},
        },
      },
      { upsert: true, new: true }
    ).lean<UserAchievementDocument>().exec();

    return !!ua;
  },
};

// Health utility
export const HealthService = {
  async db(): Promise<ApiResponse> {
    try {
      await ensureMongooseConnection();
      // simple ping via any collection
      await models.Course.findOne({}).select({ _id: 1 }).lean().exec();
      return { success: true, data: { ok: true } };
    } catch (e: any) {
      return { success: false, error: { code: 'DB_HEALTH_FAILED', message: e?.message || 'Unknown error' } };
    }
  },
};
