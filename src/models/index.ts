import mongoose, { Schema, Model } from 'mongoose';
import {
  UserDocument,
  CourseDocument,
  ModuleDocument,
  ContentBlockDocument,
  UserProgressDocument,
  AchievementDocument,
  UserAchievementDocument,
  LearningSessionDocument,
  CodeExecutionDocument,
  NotificationDocument,
  SystemConfigDocument,
} from '@/types/database';

// User Schema
const UserSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  registrationNumber: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  avatarUrl: { type: String },
  role: { 
    type: String, 
    enum: ['student', 'admin', 'instructor'], 
    default: 'student',
    index: true 
  },
  isActive: { type: Boolean, default: true, index: true },
  lastLogin: { type: Date },
  source: { type: String, enum: ['it-panel', 'local'], default: 'it-panel', index: true },
  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    language: { type: String, default: 'en' },
    notifications: { type: Boolean, default: true },
  },
}, {
  timestamps: true,
  collection: 'users'
});

// Quiz and Content Block Schemas
const QuizOptionSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
}, { _id: false });

const QuizQuestionSchema = new Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['multiple-choice', 'true-false', 'fill-blank'], 
    required: true 
  },
  options: [QuizOptionSchema],
  correctOptionId: { type: String },
  explanation: { type: String },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
  points: { type: Number, default: 1 },
}, { _id: false });

const QuizSchema = new Schema({
  questions: [QuizQuestionSchema],
  passingScore: { type: Number, required: true },
  timeLimit: { type: Number }, // in minutes
  allowRetakes: { type: Boolean, default: true },
  maxAttempts: { type: Number, default: 3 },
}, { _id: false });

const TestCaseSchema = new Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: false },
}, { _id: false });

const CompositeItemSchema = new Schema({
  id: { type: String },
  kind: { type: String, enum: ['text','markdown','video','image','code','bullets','html'], required: true },
  content: { type: String },
  html: { type: String },
  textHeadingLevel: { type: Number, min: 1, max: 6 },
  textFontSize: { type: String },
  bullets: [{ type: String }],
  imageUrl: { type: String },
  alt: { type: String },
  caption: { type: String },
  videoUrl: { type: String },
  codeContent: { type: String },
  codeLanguage: { type: String, enum: ['java','python','javascript','typescript','c','cpp','go','ruby','html','css'] },
  codeFontSize: { type: String },
}, { _id: false });

const ContentBlockSchema = new Schema({
  id: { type: String, required: true, index: true },
  moduleId: { type: String, required: true, index: true },
  displayIndex: { type: String },
  type: { 
    type: String, 
    enum: ['text', 'video', 'code', 'quiz', 'assignment', 'bullets', 'image', 'composite', 'html'], 
    required: true,
    index: true 
  },
  title: { type: String, required: true },
  // Plain text content for text/code blocks; optional for image/bullets
  content: { type: String },
  html: { type: String },
  textHeadingLevel: { type: Number, min: 1, max: 6 },
  textFontSize: { type: String },
  order: { type: Number, required: true, index: true },
  estimatedMinutes: { type: Number, default: 0 },
  
  // Type-specific properties
  videoUrl: { type: String },
  videoDuration: { type: Number },
  codeLanguage: { 
    type: String, 
    enum: ['java', 'python', 'javascript','typescript','c','cpp','go','ruby','html','css'] 
  },
  codeTemplate: { type: String },
  codeContent: { type: String },
  codeKind: { type: String, enum: ['illustrative', 'exam'], default: 'illustrative' },
  codeFontSize: { type: String },
  timeLimitMs: { type: Number, default: 2000 },
  memoryLimitMb: { type: Number, default: 256 },
  testCases: [TestCaseSchema],
  quiz: QuizSchema,
  // Composite items (for composite blocks)
  items: [CompositeItemSchema],

  // Bullets
  bullets: [{ type: String }],
  bulletsMarkdown: { type: Boolean, default: false },

  // Image
  imageUrl: { type: String },
  alt: { type: String },
  caption: { type: String },
  
  // Metadata
  isRequired: { type: Boolean, default: true },
  prerequisites: [{ type: String }], // Array of content block IDs
}, {
  timestamps: true,
  collection: 'contentblocks'
});

// Module Schema
const ModuleSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  courseId: { type: String, required: true, index: true },
  displayIndex: { type: String },
  title: { type: String, required: true },
  description: { type: String },
  order: { type: Number, required: true, index: true },
  estimatedHours: { type: Number, default: 1 },
  
  // Content blocks within this module
  contentBlocks: [ContentBlockSchema],
  
  // Prerequisites and dependencies
  prerequisites: [{ type: String }], // Array of module IDs
  isLocked: { type: Boolean, default: false, index: true },
  
  // Metadata
  learningObjectives: [{ type: String }],
  tags: [{ type: String, index: true }],
}, {
  timestamps: true,
  collection: 'modules'
});

// Course Schema
const CourseSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  customHtml: { type: String },
  language: { 
    type: String, 
    enum: ['Java', 'Python', 'JavaScript', 'General'], 
    required: true,
    index: true 
  },
  difficulty: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'], 
    required: true,
    index: true 
  },
  estimatedHours: { type: Number, required: true },
  
  // Media and presentation
  imageUrl: { type: String },
  imageHint: { type: String },
  thumbnailUrl: { type: String },
  
  // Course structure
  modules: [ModuleSchema],
  
  // Metadata
  tags: [{ type: String, index: true }],
  prerequisites: [{ type: String }],
  learningObjectives: [{ type: String }],
  
  // Publishing and access
  isPublished: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true },
  enrollmentCount: { type: Number, default: 0 },
  
  // Authorship
  createdBy: { type: String, required: true, index: true },
  instructors: [{ type: String, index: true }],
  
  // Pricing (for future use)
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  isFree: { type: Boolean, default: true, index: true },
}, {
  timestamps: true,
  collection: 'courses'
});

// Text index temporarily disabled; re-enable later with a safe config

// Progress Tracking Schemas
const VideoProgressSchema = new Schema({
  watchedDuration: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 },
  lastPosition: { type: Number, default: 0 },
}, { _id: false });

const CodeProgressSchema = new Schema({
  lastSubmission: { type: String },
  testsPassed: { type: Number, default: 0 },
  totalTests: { type: Number, default: 0 },
  bestScore: { type: Number },
}, { _id: false });

const QuizProgressSchema = new Schema({
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  lastAttemptAt: { type: Date },
}, { _id: false });

const ContentProgressSchema = new Schema({
  contentBlockId: { type: String, required: true, index: true },
  status: { 
    type: String, 
    enum: ['not-started', 'in-progress', 'completed'], 
    default: 'not-started',
    index: true 
  },
  completedAt: { type: Date },
  timeSpent: { type: Number, default: 0 }, // in minutes
  attempts: { type: Number, default: 0 },
  
  // Type-specific progress
  videoProgress: VideoProgressSchema,
  codeProgress: CodeProgressSchema,
  quizProgress: QuizProgressSchema,
}, { _id: false });

const ModuleProgressSchema = new Schema({
  moduleId: { type: String, required: true, index: true },
  status: { 
    type: String, 
    enum: ['not-started', 'in-progress', 'completed'], 
    default: 'not-started',
    index: true 
  },
  completedAt: { type: Date },
  completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
  timeSpent: { type: Number, default: 0 }, // in minutes
  contentProgress: [ContentProgressSchema],
}, { _id: false });

const UserProgressSchema = new Schema({
  studentId: { type: String, required: true, index: true },
  courseId: { type: String, required: true, index: true },
  
  // Overall progress
  status: { 
    type: String, 
    enum: ['not-started', 'in-progress', 'completed', 'dropped'], 
    default: 'not-started',
    index: true 
  },
  enrolledAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  lastAccessedAt: { type: Date, default: Date.now, index: true },
  
  // Detailed progress
  completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
  totalTimeSpent: { type: Number, default: 0 }, // in minutes
  moduleProgress: [ModuleProgressSchema],
  
  // Engagement metrics
  streak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  totalSessions: { type: Number, default: 0 },
  averageSessionTime: { type: Number, default: 0 },
  
  // Completion tracking
  completedModules: [{ type: String }],
  completedContentBlocks: [{ type: String }],
}, {
  timestamps: true,
  collection: 'userprogress'
});

// Create compound index for efficient queries
UserProgressSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

// Achievement Schemas
const AchievementSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  type: { 
    type: String, 
    enum: ['first_submission', 'module_completion', 'course_completion', 'perfect_score', 'streak', 'time_based'], 
    required: true,
    index: true 
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  iconUrl: { type: String },
  badgeColor: { type: String },
  
  // Criteria for earning
  criteria: {
    courseId: { type: String },
    moduleId: { type: String },
    contentBlockId: { type: String },
    streakDays: { type: Number },
    scoreThreshold: { type: Number },
    timeThreshold: { type: Number },
  },
  
  // Metadata
  rarity: { 
    type: String, 
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'], 
    default: 'common',
    index: true 
  },
  points: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
}, {
  timestamps: true,
  collection: 'achievements'
});

const UserAchievementSchema = new Schema({
  studentId: { type: String, required: true, index: true },
  achievementId: { type: String, required: true, index: true },
  earnedAt: { type: Date, default: Date.now, index: true },
  relatedCourseId: { type: String, index: true },
  relatedModuleId: { type: String, index: true },
  
  // Context when earned
  context: {
    score: { type: Number },
    streak: { type: Number },
    timeSpent: { type: Number },
  },
}, {
  timestamps: true,
  collection: 'userachievements'
});

// Create compound index for efficient queries
UserAchievementSchema.index({ studentId: 1, achievementId: 1 }, { unique: true });

// Learning Session Schema
const LearningSessionSchema = new Schema({
  studentId: { type: String, required: true, index: true },
  courseId: { type: String, required: true, index: true },
  moduleId: { type: String, index: true },
  contentBlockId: { type: String, index: true },
  
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date },
  duration: { type: Number, default: 0 }, // in minutes
  
  // Activity tracking
  activities: [{
    type: { 
      type: String, 
      enum: ['video_watch', 'code_submit', 'quiz_attempt', 'content_view'], 
      required: true 
    },
    timestamp: { type: Date, required: true },
    details: { type: Schema.Types.Mixed },
  }],
  
  // Device and context
  deviceType: { 
    type: String, 
    enum: ['desktop', 'tablet', 'mobile'], 
    default: 'desktop' 
  },
  userAgent: { type: String },
  ipAddress: { type: String },
}, {
  timestamps: true,
  collection: 'learningsessions'
});

// Code Execution Schema
const CodeExecutionSchema = new Schema({
  studentId: { type: String, required: true, index: true },
  contentBlockId: { type: String, required: true, index: true },
  
  // Code details
  code: { type: String, required: true },
  language: { 
    type: String, 
    enum: ['java', 'python', 'javascript'], 
    required: true 
  },
  
  // Execution results
  output: { type: String },
  error: { type: String },
  executionTime: { type: Number },
  memoryUsed: { type: Number },
  
  // Test results
  testResults: [{
    testCaseId: { type: String, required: true },
    passed: { type: Boolean, required: true },
    actualOutput: { type: String },
    expectedOutput: { type: String, required: true },
    executionTime: { type: Number },
  }],
  
  // Metadata
  submittedAt: { type: Date, default: Date.now, index: true },
  service: { 
    type: String, 
    enum: ['piston', 'onecompiler', 'jdoodle', 'codex'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'running', 'completed', 'failed', 'timeout'], 
    default: 'pending',
    index: true 
  },
}, {
  timestamps: true,
  collection: 'codeexecutions'
});

// Notification Schema
const NotificationSchema = new Schema({
  userId: { type: String, required: true, index: true },
  type: { 
    type: String, 
    enum: ['achievement', 'course_update', 'reminder', 'system'], 
    required: true,
    index: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  
  // Notification state
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date },
  
  // Action and linking
  actionUrl: { type: String },
  actionText: { type: String },
  
  // Metadata
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium',
    index: true 
  },
  expiresAt: { type: Date, index: true },
}, {
  timestamps: true,
  collection: 'notifications'
});

// System Config Schema
const SystemConfigSchema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: Schema.Types.Mixed, required: true },
  type: { 
    type: String, 
    enum: ['string', 'number', 'boolean', 'object', 'array'], 
    required: true 
  },
  description: { type: String },
  category: { 
    type: String, 
    enum: ['general', 'security', 'features', 'limits', 'integrations'], 
    required: true,
    index: true 
  },
  isPublic: { type: Boolean, default: false, index: true },
}, {
  timestamps: true,
  collection: 'systemconfig'
});

// Create and export models
export const User: Model<UserDocument> = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);
export const Course: Model<CourseDocument> = mongoose.models.Course || mongoose.model<CourseDocument>('Course', CourseSchema);
export const Module: Model<ModuleDocument> = mongoose.models.Module || mongoose.model<ModuleDocument>('Module', ModuleSchema);
export const ContentBlock: Model<ContentBlockDocument> = mongoose.models.ContentBlock || mongoose.model<ContentBlockDocument>('ContentBlock', ContentBlockSchema);
export const UserProgress: Model<UserProgressDocument> = mongoose.models.UserProgress || mongoose.model<UserProgressDocument>('UserProgress', UserProgressSchema);
export const Achievement: Model<AchievementDocument> = mongoose.models.Achievement || mongoose.model<AchievementDocument>('Achievement', AchievementSchema);
export const UserAchievement: Model<UserAchievementDocument> = mongoose.models.UserAchievement || mongoose.model<UserAchievementDocument>('UserAchievement', UserAchievementSchema);
export const LearningSession: Model<LearningSessionDocument> = mongoose.models.LearningSession || mongoose.model<LearningSessionDocument>('LearningSession', LearningSessionSchema);
export const CodeExecution: Model<CodeExecutionDocument> = mongoose.models.CodeExecution || mongoose.model<CodeExecutionDocument>('CodeExecution', CodeExecutionSchema);
export const Notification: Model<NotificationDocument> = mongoose.models.Notification || mongoose.model<NotificationDocument>('Notification', NotificationSchema);
export const SystemConfig: Model<SystemConfigDocument> = mongoose.models.SystemConfig || mongoose.model<SystemConfigDocument>('SystemConfig', SystemConfigSchema);

// Export all models as a single object for convenience
export const models = {
  User,
  Course,
  Module,
  ContentBlock,
  UserProgress,
  Achievement,
  UserAchievement,
  LearningSession,
  CodeExecution,
  Notification,
  SystemConfig,
};
