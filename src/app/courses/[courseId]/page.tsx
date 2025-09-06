import { notFound } from 'next/navigation';
import { getCourseById, getUserProgress } from '@/lib/data';
import { ModuleListItem } from '@/components/course/ModuleListItem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

export default function CoursePage({ params }: { params: { courseId: string } }) {
  const course = getCourseById(params.courseId);
  const userProgress = getUserProgress('student1');

  if (!course) {
    notFound();
  }
  
  const completedModulesInCourse = userProgress.completedModules.filter(moduleId =>
    course.modules.some(module => module.id === moduleId)
  ).length;

  const totalModules = course.modules.length;
  const progressPercentage = totalModules > 0 ? (completedModulesInCourse / totalModules) * 100 : 0;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
           <div className="relative h-64 w-full rounded-lg overflow-hidden mb-6">
            <Image
              src={course.imageUrl}
              alt={course.title}
              fill
              className="object-cover"
              data-ai-hint={course.imageHint}
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{course.title}</h1>
          <p className="text-lg text-muted-foreground mb-6">{course.description}</p>
          
          <Card>
            <CardHeader>
              <CardTitle>Course Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {course.modules.map((module) => (
                  <ModuleListItem 
                    key={module.id} 
                    module={module} 
                    isCompleted={userProgress.completedModules.includes(module.id)} 
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <aside className="space-y-6 lg:mt-0">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full">
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>Overall Completion</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {completedModulesInCourse} of {totalModules} modules completed.
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>

      </div>
    </div>
  );
}
