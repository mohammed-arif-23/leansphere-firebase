import { notFound } from 'next/navigation';
import { getModuleById, getCourseById } from '@/lib/data';
import { VideoPlayer } from '@/components/course/VideoPlayer';
import { CodingAssignment } from '@/components/course/CodingAssignment';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { TextContent } from '@/components/course/TextContent';

export default function ModulePage({ params }: { params: { courseId: string, moduleId: string } }) {
  const module = getModuleById(params.courseId, params.moduleId);
  const course = getCourseById(params.courseId);

  if (!module || !course) {
    notFound();
  }

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

      <div>
        {module.type === 'video' && <VideoPlayer module={module} />}
        {module.type === 'text' && <TextContent module={module} />}
        {module.type === 'code' && <CodingAssignment module={module} course={course} />}
      </div>
    </div>
  );
}
