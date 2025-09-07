export type ModuleType = 'video' | 'code' | 'text' | 'quiz';

export interface QuizQuestion {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
}

export interface Quiz {
  questions: QuizQuestion[];
  passingScore: number;
  allowRetakes: boolean;
  timeLimit?: number;
  proctored?: boolean;
  adaptive?: boolean;
  maxAttempts?: number;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  type: ModuleType;
  content: string; // For video, it's a URL. For code, it's a prompt. For text, it is markdown.
  quiz?: QuizQuestion[]; // For quiz modules
}

export interface Course {
  id: string;
  title: string;
  language: 'Java' | 'Python' | 'JavaScript' | 'Other';
  description: string;
  imageUrl: string;
  imageHint: string;
  modules: Module[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  isPublished: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  prerequisites: string[];
  learningObjectives: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

export interface UserProgress {
  studentId: string;
  completedModules: string[];
  lastLogin: string; // ISO Date string
  streak: number;
}

export type AchievementType =
  | "course_completion"
  | "module_completion"
  | "streak"
  | "first_submission"
  | "perfect_score";

export interface Achievement {
  id: string;
  studentId: string;
  type: AchievementType;
  title: string;
  description: string;
  iconUrl: string;
  earnedAt: string;
  relatedCourseId?: string;
}

// Based on the design document's CodeExecutionResponse
export interface CodeExecutionResponse {
  success: boolean;
  output: string;
  errors?: string;
  score: number;
  feedback: string;
}

export interface ContentBlock {
  id: string;
  title: string;
  type: 'text' | 'video' | 'code' | 'bullets' | 'image' | 'quiz' | 'assignment' | 'composite';
  order: number;
  displayIndex: string;
  estimatedMinutes: number;
  content?: string;
  bullets?: string[];
  imageUrl?: string;
  alt?: string;
  caption?: string;
  codeLanguage?: string;
  codeTemplate?: string;
  codeContent?: string;
  codeKind?: string;
  testCases?: any[];
  items?: any[];
  quiz?: Quiz;
  // Assignment properties
  enablePlagiarismCheck?: boolean;
  enablePeerReview?: boolean;
  rubric?: string[];
  dueDate?: string;
  maxScore?: number;
}
