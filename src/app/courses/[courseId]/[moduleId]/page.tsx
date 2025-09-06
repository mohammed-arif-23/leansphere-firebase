
import { notFound } from 'next/navigation';
import { getModuleById, getCourseById } from '@/lib/data';
import { VideoPlayer } from '@/components/course/VideoPlayer';
import { CodingAssignment } from '@/components/course/CodingAssignment';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { TextContent } from '@/components/course/TextContent';
import { Separator } from '@/components/ui/separator';
import { Quiz } from '@/components/course/Quiz';
import { cn } from '@/lib/utils';

export default function ModulePage({ params }: { params: { courseId: string, moduleId: string } }) {
  const module = getModuleById(params.moduleId);
  const course = getCourseById(params.courseId);

  if (!module || !course) {
    notFound();
  }

  const currentModuleIndex = course.modules.findIndex(m => m.id === module.id);
  const prevModule = currentModuleIndex > 0 ? course.modules[currentModuleIndex - 1] : null;
  const nextModule = currentModuleIndex < course.modules.length - 1 ? course.modules[currentModuleIndex + 1] : null;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href={`/courses/${course.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {course.title}
          </Link>
        </Button>
      </div>

      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">{module.title}</h1>
        <p className="text-lg text-muted-foreground">Module from: {course.title}</p>
      </header>

      <div className="mb-8">
        {module.type === 'video' && <VideoPlayer module={module} />}
        {module.type === 'text' && <TextContent module={module} />}
        {module.type === 'code' && <CodingAssignment module={module} course={course} />}
        {module.type === 'quiz' && <Quiz module={module} />}
      </div>

      <Separator />

      <div className="mt-8 flex justify-between items-center">
        {prevModule ? (
          <Button asChild variant="outline">
            <Link href={`/courses/${course.id}/${prevModule.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Link>
          </Button>
        ) : (
          <div /> // Placeholder to keep spacing
        )}

        {nextModule ? (
          <Button asChild>
            <Link href={`/courses/${course.id}/${nextModule.id}`}>
              Next Module
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href={`/courses/${course.id}`}>
              Finish Course
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
