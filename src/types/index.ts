export type ModuleType = 'video' | 'code' | 'text';

export interface Module {
  id: string;
  courseId: string;
  title: string;
  type: ModuleType;
  content: string; // For video, it's a URL. For code, it's a description/prompt. For text, it is markdown content.
}

export interface Course {
  id: string;
  title: string;
  language: 'Java' | 'Python' | 'JavaScript' | 'Other';
  description: string;
  imageUrl: string;
  imageHint: string;
  modules: Module[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours?: number;
  isPublished?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  prerequisites?: string[];
  learningObjectives?: string[];
}

export interface UserProgress {
  studentId: string;
  completedModules: string[];
}
