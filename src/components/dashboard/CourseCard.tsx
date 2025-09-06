'use client';

import type { Course, UserProgress } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

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

  return (
    <Card className="flex flex-col overflow-hidden transition-transform duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl">
      <CardHeader className="p-0">
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
      <CardContent className="flex-grow p-6">
        <CardTitle className="mb-2 text-xl font-bold">
            <Link href={`/courses/${course.id}`} className="hover:text-primary">{course.title}</Link>
        </CardTitle>
        <CardDescription>{course.description}</CardDescription>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 p-6 pt-0">
        <div className="w-full">
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">{completedModulesInCourse} / {totalModules} modules</p>
        </div>
        <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href={`/courses/${course.id}`}>
                {progressPercentage > 0 && progressPercentage < 100 ? 'Continue Learning' : 'Start Course'}
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
