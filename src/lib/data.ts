import type { Course, UserProgress, Module } from '@/types';

const javaModules: Module[] = [
  { id: 'j1', courseId: 'java-101', title: 'Introduction to Java', type: 'video', content: 'https://videos.cloudinary.com/demo' },
  { id: 'j1.5', courseId: 'java-101', title: 'What is Java?', type: 'text', content: 'Java is a high-level, class-based, object-oriented programming language that is designed to have as few implementation dependencies as possible. It is a general-purpose programming language intended to let application developers write once, run anywhere (WORA), meaning that compiled Java code can run on all platforms that support Java without the need for recompilation.' },
  { id: 'j2', courseId: 'java-101', title: 'Variables and Data Types', type: 'code', content: 'Write a Java program that declares an integer, a double, and a string. Print all three to the console.' },
  { id: 'j3', courseId: 'java-101', title: 'Control Flow (If/Else)', type: 'video', content: 'https://videos.cloudinary.com/demo' },
  { id: 'j4', courseId: 'java-101', title: 'Loops (For/While)', type: 'code', content: 'Using a for loop, print numbers from 1 to 10. Then, do the same with a while loop.' },
  { id: 'j5', courseId: 'java-101', title: 'Introduction to Objects', type: 'video', content: 'https://videos.cloudinary.com/demo' },
];

const pythonModules: Module[] = [
  { id: 'p1', courseId: 'python-101', title: 'Introduction to Python', type: 'video', content: 'https://videos.cloudinary.com/demo' },
  { id: 'p1.5', courseId: 'python-101', title: 'What is Python?', type: 'text', content: 'Python is an interpreted, high-level and general-purpose programming language. Python\'s design philosophy emphasizes code readability with its notable use of significant whitespace. Its language constructs and object-oriented approach aim to help programmers write clear, logical code for small and large-scale projects.' },
  { id: 'p2', courseId: 'python-101', title: 'Basic Syntax and Variables', type: 'code', content: 'Create a Python script that assigns a value to a variable and prints "Hello, [value]!".' },
  { id: 'p3', courseId: 'python-101', title: 'Lists and Tuples', type: 'video', content: 'https://videos.cloudinary.com/demo' },
  { id: 'p4', courseId: 'python-101', title: 'Dictionary Challenge', type: 'code', content: 'Create a dictionary representing a user with "name", "age", and "email". Print the user\'s age.' },
  { id: 'p5', courseId: 'python-101', title: 'Functions', type: 'video', content: 'https://videos.cloudinary.com/demo' },
  { id: 'p6', courseId: 'python-101', title: 'Your First Function', type: 'code', content: 'Write a Python function that takes two numbers and returns their sum.' },
];

const courses: Course[] = [
  {
    id: 'java-101',
    title: 'Java Fundamentals',
    language: 'Java',
    description: 'Master the basics of Java, one of the world\'s most popular programming languages.',
    imageUrl: 'https://picsum.photos/600/400',
    imageHint: 'abstract code',
    modules: javaModules,
  },
  {
    id: 'python-101',
    title: 'Python for Beginners',
    language: 'Python',
    description: 'Start your programming journey with Python. Learn syntax, data structures, and more.',
    imageUrl: 'https://picsum.photos/600/400',
    imageHint: 'python snake',
    modules: pythonModules,
  },
];

const userProgress: UserProgress = {
  studentId: 'student1',
  completedModules: ['j1', 'j2', 'p1'],
};

export const getCourses = (): Course[] => courses;
export const getCourseById = (id: string): Course | undefined => courses.find(c => c.id === id);
export const getModuleById = (courseId: string, moduleId: string): Module | undefined => {
  const course = getCourseById(courseId);
  return course?.modules.find(m => m.id === moduleId);
}
export const getUserProgress = (studentId: string): UserProgress => userProgress;
