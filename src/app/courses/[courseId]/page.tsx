import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import ScrollProgressBar from '@/components/ScrollProgressBar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { CourseService, ProgressService } from '@/lib/services/database';

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) redirect('/login?redirect=' + encodeURIComponent(`/courses/${courseId}`));
  try {
    verifyJWT(token);
  } catch {
    redirect('/login?redirect=' + encodeURIComponent(`/courses/${courseId}`));
  }

  await ensureMongooseConnection();
  const course = await CourseService.getById(courseId);
  if (!course) notFound();

  const jwt = verifyJWT(token);
  const progress = await ProgressService.getByStudent('' + jwt.sub);
  const userCompleted = new Set<string>(progress.flatMap((p: any) => p.completedModules || []));

  const completedModulesInCourse = course.modules.filter((m: any) => userCompleted.has(m.id)).length;
  const totalModules = course.modules.length;
  const progressPercentage = totalModules > 0 ? (completedModulesInCourse / totalModules) * 100 : 0;
  // Determine next module to continue
  const nextModule = course.modules.find((m: any) => !userCompleted.has(m.id)) || course.modules[0];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      <ScrollProgressBar />
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <section className="mb-6 overflow-hidden rounded-2xl border animate-slide-up" style={{ animationDelay: '80ms' }}>
        <div className="relative h-56 sm:h-64 w-full">
          <Image
            src={course.imageUrl || 'https://picsum.photos/1200/400'}
            alt={course.title}
            fill
            className="object-cover"
            data-ai-hint={course.imageHint}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight drop-shadow">{course.title}</h1>
            <p className="mt-1 text-sm sm:text-base text-white/90 line-clamp-3">{course.description}</p>
            {nextModule && (
              <div className="mt-3">
                <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link href={`/courses/${course.id}/${nextModule.id}`}>
                    {completedModulesInCourse === 0 ? 'Start Course' : (completedModulesInCourse < totalModules ? 'Continue' : 'Review')}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-xl border-0 shadow-none bg-transparent">
            <CardHeader>
              <CardTitle>Course Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {course.modules.map((module: any, idx: number) => (
                  <div key={module.id} className="flex items-start justify-between gap-4 rounded-lg p-3 hover:bg-muted/50 transition animate-slide-up" style={{ animationDelay: `${Math.min(idx * 70, 600)}ms` }}>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{module.displayIndex ? `${module.displayIndex} ` : ''}{module.title}</p>
                      {module.description && <p className="text-sm text-muted-foreground line-clamp-2">{module.description}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/courses/${course.id}/${module.id}`}>Open</Link>
                      </Button>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${userCompleted.has(module.id) ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {userCompleted.has(module.id) ? 'Completed' : 'In progress'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="rounded-xl border-0 shadow-none sticky top-24 bg-transparent">
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
