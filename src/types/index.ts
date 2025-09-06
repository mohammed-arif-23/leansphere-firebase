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
  language: 'Java' | 'Python';
  description: string;
  imageUrl: string;
  imageHint: string;
  modules: Module[];
}

export interface UserProgress {
  studentId: string;
  completedModules: string[];
}
