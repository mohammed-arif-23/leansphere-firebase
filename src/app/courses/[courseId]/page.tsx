import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ScrollProgressBar from '@/components/ScrollProgressBar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { CourseService, ProgressService } from '@/lib/services/database';

export default async function CoursePage({ params, searchParams }: { params: Promise<{ courseId: string }>, searchParams: Promise<Record<string, string | string[]>> }) {
  const { courseId } = await params;
  const s = await searchParams;
  const preview = String(s?.preview || '') === '1';
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
  if (!preview && !course.isPublished) notFound();

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
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Image card */}
      <section className="mb-4 animate-slide-up" style={{ animationDelay: '40ms' }}>
        <Card className="rounded-2xl overflow-hidden">
          <div className="relative w-full aspect-video">
            <Image
              src={course.imageUrl || 'https://picsum.photos/1200/675'}
              alt={course.title}
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </Card>
      </section>

      <section className="mb-6 animate-slide-up" style={{ animationDelay: '80ms' }}>
        <Card className="rounded-2xl">
          <CardContent className="p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{course.title}</h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground line-clamp-3">{course.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {(course.modules?.length || 0)} modules
              </div>
              {nextModule && (
                <Link href={`/courses/${course.id}/${nextModule.id}`} prefetch>
                  <Button size="sm" className="bg-primary text-primary-foreground hover:opacity-90 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]">
                    {completedModulesInCourse === 0 ? 'Start Course' : (completedModulesInCourse < totalModules ? 'Resume' : 'Review')}
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>Course Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-card">
                <ol className="divide-y" role="list" aria-label="Course modules">
                  {course.modules.map((module: any, idx: number) => (
                    <li key={module.id} className="p-4 animate-slide-up" style={{ animationDelay: `${Math.min(idx * 60, 540)}ms` }} role="listitem" aria-label={`Module ${module.displayIndex || idx + 1}: ${module.title}`}>
                      <div className="flex items-start gap-3">
                        <span className="inline-flex items-center justify-center h-6 min-w-6 rounded-full bg-muted px-2 text-xs font-mono">
                          {module.displayIndex || idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{module.title}</p>
                        
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
