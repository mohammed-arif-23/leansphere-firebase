
import type { Course, UserProgress, Module, Achievement } from '@/types';

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

const javascriptModules: Module[] = [
    { id: 'js1', courseId: 'javascript-101', title: 'Introduction to JavaScript', type: 'video', content: 'https://videos.cloudinary.com/demo' },
    { id: 'js1.5', courseId: 'javascript-101', title: 'What is JavaScript?', type: 'text', content: 'JavaScript, often abbreviated as JS, is a programming language that is one of the core technologies of the World Wide Web, alongside HTML and CSS. As of 2023, 98.7% of websites use JavaScript on the client side for webpage behavior, often incorporating third-party libraries.' },
    { id: 'js2', courseId: 'javascript-101', title: 'Variables and Data Types', type: 'code', content: 'Declare a variable using `let`, a constant using `const`, and a variable using `var`. Log all three to the console.' },
    { id: 'js3', courseId: 'javascript-101', title: 'Arrow Functions', type: 'video', content: 'https://videos.cloudinary.com/demo' },
    { id: 'js4', courseId: 'javascript-101', title: 'Array Methods', type: 'code', content: 'Create an array of numbers. Use the .map() method to create a new array where each number is doubled. Log the new array.' },
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
    difficulty: 'beginner',
    estimatedHours: 10,
    isPublished: true,
    tags: ['Java', 'Programming', 'Beginner'],
    prerequisites: [],
    learningObjectives: [
        'Understand Java basics',
        'Write simple Java applications',
        'Learn about variables and data types'
    ],
    createdAt: '2023-01-01T10:00:00Z',
    updatedAt: '2023-01-01T10:00:00Z',
    createdBy: 'admin-user',
  },
  {
    id: 'python-101',
    title: 'Python for Beginners',
    language: 'Python',
    description: 'Start your programming journey with Python. Learn syntax, data structures, and more.',
    imageUrl: 'https://picsum.photos/600/400',
    imageHint: 'python snake',
    modules: pythonModules,
    difficulty: 'beginner',
    estimatedHours: 8,
    isPublished: true,
    tags: ['Python', 'Data Science', 'Beginner'],
    prerequisites: [],
    learningObjectives: [
        'Understand Python syntax',
        'Work with lists and dictionaries',
        'Create basic functions'
    ],
    createdAt: '2023-02-15T12:00:00Z',
    updatedAt: '2023-02-15T12:00:00Z',
    createdBy: 'admin-user',
  },
  {
    id: 'javascript-101',
    title: 'JavaScript for Web Devs',
    language: 'JavaScript',
    description: 'Learn the language of the web, from basic syntax to modern features.',
    imageUrl: 'https://picsum.photos/600/400',
    imageHint: 'web development',
    modules: javascriptModules,
    difficulty: 'beginner',
    estimatedHours: 12,
    isPublished: true,
    tags: ['JavaScript', 'Web Development', 'Frontend'],
    prerequisites: [],
    learningObjectives: [
        'Understand core JavaScript concepts',
        'Manipulate the DOM',
        'Learn about asynchronous programming'
    ],
    createdAt: '2023-04-10T16:00:00Z',
    updatedAt: '2023-04-10T16:00:00Z',
    createdBy: 'admin-user',
  },
];

const userProgress: UserProgress = {
  studentId: 'student1',
  completedModules: ['j1', 'j2', 'p1'],
};

const achievements: Achievement[] = [
    {
        id: 'ach-1',
        studentId: 'student1',
        type: 'first_submission',
        title: 'First Code Submitted',
        description: 'You submitted your first piece of code for grading!',
        iconUrl: '/icons/first-submission.svg',
        earnedAt: '2023-03-01T10:00:00Z',
        relatedCourseId: 'java-101',
    },
    {
        id: 'ach-2',
        studentId: 'student1',
        type: 'module_completion',
        title: 'Java Basics Completed',
        description: 'You completed the first module in the Java course.',
        iconUrl: '/icons/module-completion.svg',
        earnedAt: '2023-03-02T14:00:00Z',
        relatedCourseId: 'java-101',
    },
    {
        id: 'ach-3',
        studentId: 'student1',
        type: 'perfect_score',
        title: 'Flawless Victory',
        description: 'You got a perfect score on a coding assignment.',
        iconUrl: '/icons/perfect-score.svg',
        earnedAt: '2023-03-05T18:00:00Z',
        relatedCourseId: 'python-101',
    },
    {
        id: 'ach-4',
        studentId: 'student1',
        type: 'course_completion',
        title: 'Python Pioneer',
        description: 'You completed the entire Python for Beginners course.',
        iconUrl: '/icons/course-completion.svg',
        earnedAt: '2023-03-10T20:00:00Z',
        relatedCourseId: 'python-101',
    },
]

export const getCourses = (): Course[] => courses;
export const getCourseById = (id: string): Course | undefined => courses.find(c => c.id === id);

export const getModuleById = (moduleId: string): Module | undefined => {
  for (const course of courses) {
    const module = course.modules.find(m => m.id === moduleId);
    if (module) {
      return module;
    }
  }
  return undefined;
};

export const getUserProgress = (studentId: string): UserProgress | undefined => {
    if (studentId === userProgress.studentId) return userProgress;
    return undefined;
};

export const getAchievementsByStudentId = (studentId: string) : Achievement[] => {
    return achievements.filter(a => a.studentId === studentId);
}
