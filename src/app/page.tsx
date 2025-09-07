import { Card, CardContent } from '@/components/ui/card';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { CourseService, ProgressService } from '@/lib/services/database';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';

export default async function HomePage() {
  // Try to detect user (optional)
  const token = (await cookies()).get('auth_token')?.value;
  let auth: any = null;
  if (token) {
    try { auth = verifyJWT(token); } catch {}
  }

  // Preload minimal data for Resume CTA (if logged in)
  let nextTarget: { course: any, module: any } | null = null;
  try {
    await ensureMongooseConnection();
    const courseList = await CourseService.list({ isPublished: true }, { page: 1, limit: 50 }).then((r) => r.items);
    if (auth?.sub) {
      const progressList = await ProgressService.getByStudent(auth.sub);
      const completedSet = new Set<string>(progressList.flatMap((p: any) => p.completedModules || []));
      for (const c of courseList) {
        const next = (c.modules || []).find((m: any) => !completedSet.has(m.id)) || (c.modules || [])[0];
        if (next) { nextTarget = { course: c, module: next }; break; }
      }
    }
  } catch {}

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">dynamIT</h1>
            <p className="mt-4 text-lg sm:text-xl text-muted-foreground">A modern learning platform with adaptive quizzes, projects, proctoring, and rich progress tracking. Built for students, designed for results.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/courses" className="inline-flex  items-center rounded-full px-5 py-2.5 bg-black text-white hover:bg-primary/90">Explore Courses</a>
              {auth?.sub ? (
                nextTarget ? (
                  <a href={`/courses/${nextTarget.course.id}/${nextTarget.module.id}`} className="inline-flex border items-center rounded-full px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90">Resume Learning</a>
                ) : (
                  <a href="/profile" className="inline-flex items-center rounded-full px-5 py-2.5 bg-muted text-foreground hover:bg-muted/80">Go to Profile</a>
                )
              ) : (
                <a href="/login" className="inline-flex items-center rounded-full px-5 py-2.5 bg-muted text-foreground hover:bg-muted/80">Sign In</a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-6">
              <div className="text-lg font-semibold mb-1">Adaptive Quizzes</div>
              <p className="text-sm text-muted-foreground">Question difficulty adapts to your performance to optimize learning.</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-6">
              <div className="text-lg font-semibold mb-1">Projects & Assignments</div>
              <p className="text-sm text-muted-foreground">Hands-on coding exercises with plagiarism checks and peer reviews.</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-6">
              <div className="text-lg font-semibold mb-1">Progress Tracking</div>
              <p className="text-sm text-muted-foreground">Automatic progress saves and resume where you left off anytime.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* About */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">About dynamIT</h2>
            <p className="text-sm sm:text-base text-muted-foreground">LearnSphere blends structured modules, multimedia content, and assessments to deliver a delightful, effective learning journey. Whether you're just starting or advancing your skills, our platform guides you step-by-step.</p>
            <ul className="mt-4 list-disc ml-5 text-sm sm:text-base text-muted-foreground space-y-1">
              <li>Engaging modules with readable, distraction-free design</li>
              <li>Glassmorphism UI, premium visuals, and mobile-first UX</li>
              <li>Gamification: streaks, achievements, and skill trees</li>
            </ul>
          </div>
         
        </div>
      </section>

      {/* Rules / How it works */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">How it works</h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 list-decimal ml-5">
          <li className="text-sm sm:text-base"><span className="font-semibold">Pick a course</span> — choose from curated topics and levels.</li>
          <li className="text-sm sm:text-base"><span className="font-semibold">Complete modules</span> — watch, read, code, and quiz with guidance.</li>
          <li className="text-sm sm:text-base"><span className="font-semibold">Track progress</span> — resume instantly and celebrate milestones.</li>
        </ol>
        <div className="mt-6">
          <a href="/courses" className="inline-flex items-center rounded-full border border-primary px-5 py-2.5 bg-primary text-black hover:bg-primary/90">Start Learning</a>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="border-t bg-background/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-xl font-semibold">Ready to dive in?</div>
              <div className="text-sm text-muted-foreground">Join for free and explore courses crafted for growth.</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
