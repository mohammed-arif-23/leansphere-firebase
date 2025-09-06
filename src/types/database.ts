import { Document, Types } from 'mongoose';

// Base interface for all database documents
export interface BaseDocument {
  // Do not declare _id here to avoid conflicts with Mongoose Document
  createdAt?: Date;
  updatedAt?: Date;
}

// User related interfaces
export interface User extends BaseDocument {
  id: string;
  registrationNumber: string; // college registration number for login
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'student' | 'admin' | 'instructor';
  isActive: boolean;
  lastLogin?: Date;
  source?: 'it-panel' | 'local';
  preferences?: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: boolean;
  };
}

// Quiz and assessment interfaces
export interface QuizOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank';
  options: QuizOption[];
  correctOptionId?: string;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  points: number;
}

export interface Quiz {
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit?: number; // in minutes
  allowRetakes: boolean;
  maxAttempts?: number;
}

// Content block interfaces
export interface ContentBlock extends BaseDocument {
  id: string;
  moduleId: string;
  displayIndex?: string; // e.g., 1.2.1 for hierarchical numbering
  type: 'text' | 'video' | 'code' | 'quiz' | 'assignment' | 'bullets' | 'image';
  title: string;
  content?: string;
  order: number;
  estimatedMinutes?: number;
  markdown?: boolean;
  
  // Type-specific properties
  videoUrl?: string;
  videoDuration?: number;
  codeLanguage?: 'java' | 'python' | 'javascript';
  codeTemplate?: string;
  codeContent?: string;
  codeKind?: 'illustrative' | 'exam'; // illustrative (preview only) vs exam (runnable with tests)
  timeLimitMs?: number; // for exam code blocks
  memoryLimitMb?: number; // for exam code blocks
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }>;
  quiz?: Quiz;
  // Bullets
  bullets?: string[];
  bulletsMarkdown?: boolean;
  // Image
  imageUrl?: string;
  alt?: string;
  caption?: string;
  
  // Metadata
  isRequired: boolean;
  prerequisites?: string[]; // Array of content block IDs
}

// Module interface
export interface Module extends BaseDocument {
  id: string;
  courseId: string;
  displayIndex?: string; // e.g., 1.2 for module numbering
  title: string;
  description?: string;
  order: number;
  estimatedHours: number;
  
  // Content blocks within this module
  contentBlocks: ContentBlock[];
  
  // Prerequisites and dependencies
  prerequisites?: string[]; // Array of module IDs
  isLocked: boolean;
  
  // Metadata
  learningObjectives: string[];
  tags: string[];
}

// Course interface
export interface Course extends BaseDocument {
  id: string;
  title: string;
  description: string;
  language: 'Java' | 'Python' | 'JavaScript' | 'General';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  
  // Media and presentation
  imageUrl?: string;
  imageHint?: string;
  thumbnailUrl?: string;
  
  // Course structure
  modules: Module[];
  
  // Metadata
  tags: string[];
  prerequisites: string[];
  learningObjectives: string[];
  
  // Publishing and access
  isPublished: boolean;
  isActive: boolean;
  enrollmentCount: number;
  
  // Authorship
  createdBy: string; // User ID
  instructors: string[]; // Array of User IDs
  
  // Pricing (for future use)
  price?: number;
  currency?: string;
  isFree: boolean;
}

// Progress tracking interfaces
export interface ContentProgress {
  contentBlockId: string;
  status: 'not-started' | 'in-progress' | 'completed';
  completedAt?: Date;
  timeSpent: number; // in minutes
  attempts: number;
  
  // Type-specific progress
  videoProgress?: {
    watchedDuration: number;
    totalDuration: number;
    lastPosition: number;
  };
  
  codeProgress?: {
    lastSubmission?: string;
    testsPassed: number;
    totalTests: number;
    bestScore?: number;
  };
  
  quizProgress?: {
    score: number;
    maxScore: number;
    attempts: number;
    lastAttemptAt?: Date;
  };
}

export interface ModuleProgress {
  moduleId: string;
  status: 'not-started' | 'in-progress' | 'completed';
  completedAt?: Date;
  completionPercentage: number;
  timeSpent: number; // in minutes
  contentProgress: ContentProgress[];
}

export interface UserProgress extends BaseDocument {
  studentId: string;
  courseId: string;
  
  // Overall progress
  status: 'not-started' | 'in-progress' | 'completed' | 'dropped';
  enrolledAt: Date;
  completedAt?: Date;
  lastAccessedAt: Date;
  
  // Detailed progress
  completionPercentage: number;
  totalTimeSpent: number; // in minutes
  moduleProgress: ModuleProgress[];
  
  // Engagement metrics
  streak: number;
  longestStreak: number;
  totalSessions: number;
  averageSessionTime: number;
  
  // Completion tracking
  completedModules: string[];
  completedContentBlocks: string[];
}

// Achievement system interfaces
export interface Achievement extends BaseDocument {
  id: string;
  type: 'first_submission' | 'module_completion' | 'course_completion' | 'perfect_score' | 'streak' | 'time_based';
  title: string;
  description: string;
  iconUrl?: string;
  badgeColor?: string;
  
  // Criteria for earning
  criteria: {
    courseId?: string;
    moduleId?: string;
    contentBlockId?: string;
    streakDays?: number;
    scoreThreshold?: number;
    timeThreshold?: number;
  };
  
  // Metadata
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
  isActive: boolean;
}

export interface UserAchievement extends BaseDocument {
  studentId: string;
  achievementId: string;
  earnedAt: Date;
  relatedCourseId?: string;
  relatedModuleId?: string;
  
  // Context when earned
  context?: {
    score?: number;
    streak?: number;
    timeSpent?: number;
  };
}

// Analytics and reporting interfaces
export interface LearningSession extends BaseDocument {
  studentId: string;
  courseId: string;
  moduleId?: string;
  contentBlockId?: string;
  
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  
  // Activity tracking
  activities: Array<{
    type: 'video_watch' | 'code_submit' | 'quiz_attempt' | 'content_view';
    timestamp: Date;
    details?: any;
  }>;
  
  // Device and context
  deviceType: 'desktop' | 'tablet' | 'mobile';
  userAgent?: string;
  ipAddress?: string;
}

// Code execution interfaces
export interface CodeExecution extends BaseDocument {
  studentId: string;
  contentBlockId: string;
  
  // Code details
  code: string;
  language: 'java' | 'python' | 'javascript';
  
  // Execution results
  output?: string;
  error?: string;
  executionTime?: number;
  memoryUsed?: number;
  
  // Test results
  testResults?: Array<{
    testCaseId: string;
    passed: boolean;
    actualOutput?: string;
    expectedOutput: string;
    executionTime?: number;
  }>;
  
  // Metadata
  submittedAt: Date;
  service: 'piston' | 'onecompiler' | 'jdoodle' | 'codex';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
}

// Notification system interfaces
export interface Notification extends BaseDocument {
  userId: string;
  type: 'achievement' | 'course_update' | 'reminder' | 'system';
  title: string;
  message: string;
  
  // Notification state
  isRead: boolean;
  readAt?: Date;
  
  // Action and linking
  actionUrl?: string;
  actionText?: string;
  
  // Metadata
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expiresAt?: Date;
}

// System configuration interfaces
export interface SystemConfig extends BaseDocument {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  category: 'general' | 'security' | 'features' | 'limits' | 'integrations';
  isPublic: boolean; // Whether this config can be accessed by frontend
}

// API response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

// Query and filter interfaces
export interface CourseFilters {
  language?: string[];
  difficulty?: string[];
  tags?: string[];
  isPublished?: boolean;
  isFree?: boolean;
  search?: string;
}

export interface ProgressFilters {
  status?: string[];
  courseId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Export types for Mongoose document interfaces (intersection types to avoid TS conflicts)
export type UserDocument = Document & User;
export type CourseDocument = Document & Course;
export type ModuleDocument = Document & Module;
export type ContentBlockDocument = Document & ContentBlock;
export type UserProgressDocument = Document & UserProgress;
export type AchievementDocument = Document & Achievement;
export type UserAchievementDocument = Document & UserAchievement;
export type LearningSessionDocument = Document & LearningSession;
export type CodeExecutionDocument = Document & CodeExecution;
export type NotificationDocument = Document & Notification;
export type SystemConfigDocument = Document & SystemConfig;
