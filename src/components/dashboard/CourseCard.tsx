'use client';

import type { Course, UserProgress } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  course: Course;
  userProgress: UserProgress;
}

export function CourseCard({ course, userProgress }: CourseCardProps) {
  const completedModulesInCourse = userProgress.completedModules.filter(moduleId =>
    course.modules.some(module => module.id === moduleId)
  ).length;

  const totalModules = course.modules.length;
  const progressPercentage = totalModules > 0 ? (completedModulesInCourse / totalModules) * 100 : 0;
  const isLocked = false; // Placeholder for future logic

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl flex flex-col bg-card/80 backdrop-blur-sm border border-white/20 shadow-xl"
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-600/10 dark:from-blue-500/20 dark:to-purple-600/20" />
      <CardHeader className="relative p-0">
        <Link href={`/courses/${course.id}`}>
          <div className="relative h-48 w-full">
            <Image
              src={course.imageUrl}
              alt={course.title}
              fill
              className="object-cover"
              data-ai-hint={course.imageHint}
            />
          </div>
        </Link>
      </CardHeader>
      <CardContent className="relative flex-grow p-6">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
              <Link href={`/courses/${course.id}`} className="hover:text-primary-500">{course.title}</Link>
          </CardTitle>
          {isLocked && <Lock className="w-5 h-5 text-gray-400" />}
        </div>
        <CardDescription className="text-gray-600 dark:text-gray-300">{course.description}</CardDescription>
      </CardContent>
      <CardFooter className="relative flex flex-col items-start gap-4 p-6 pt-0 mt-auto">
        <div className="w-full">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">{completedModulesInCourse} / {totalModules} modules</p>
        </div>
        <Link href={`/courses/${course.id}`}>
          <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white" disabled={isLocked}>
            {isLocked ? "Locked" : progressPercentage > 0 && progressPercentage < 100 ? 'Continue Learning' : 'Start Course'}
          </Button>
        </Link>
      </CardFooter>
    </motion.div>
  );
}
