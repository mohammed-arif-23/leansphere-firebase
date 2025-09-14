import { Card, CardContent } from '@/components/ui/card';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { CourseService, ProgressService } from '@/lib/services/database';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import AutoLogin from '@/components/auth/AutoLogin';
import { Lock } from 'lucide-react';

export default async function HomePage() {
  // Try to detect user (optional)
  const token = (await cookies()).get('auth_token')?.value;
  let auth: any = null;
  if (token) {
    try { auth = verifyJWT(token); } catch {}
  }

  // Preload minimal data for Resume CTA (if logged in) and top courses
  let nextTarget: { course: any, module: any } | null = null;
  let topCourses: any[] = [];
  const placeholderCourses = [
    { id: 'placeholder-1', title: 'Master Basics of Java, Python, C & C++', description: 'Unlock the Power of Four Languages: Complete C, C++, Java, and Python Programming Course for All Levels.' },
    { id: 'placeholder-2', title: 'JavaScript Fundamentals for Beginners', description: 'Learn JavaScript Basics in Under 6 Hours' },
    { id: 'placeholder-3', title: 'Complete MERN Stack ', description: 'Build production grade fullstack web applications with the power of MongoDB, Express.js, React.js, Node.js.' },
    { id: 'placeholder-4', title: 'Flutter Masterclass - (Dart, Api & More)', description: 'Complete No-Nonsense Masterclass on Flutter for Native Android and IOS App Development.' },
    { id: 'placeholder-5', title: 'Complete Web & Mobile Designer : UI/UX, Figma', description: 'Bootcamp for mastering web design, mobile design, Figma, UI & UX, and HTML + CSS.' },
  ];
  try {
    await ensureMongooseConnection();
    const courseList = await CourseService.list({ isPublished: true }, { page: 1, limit: 50 }).then((r) => r.items);
    topCourses = (courseList || []).slice(0, 2);
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
      {/* Auto Login handler: parses ?studentId= and attempts autologin */}
      <AutoLogin />
      {/* Single Pane Poster */}
      <section className="relative min-h-[60vh] flex items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/10" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <div className="text-sm text-muted-foreground mb-2 uppercase">dynamit</div>
            {auth?.name ? <h1 className="text-2xl sm:text-2xl font-extrabold tracking-tight">Welcome{auth?.name ? `, ${auth.name}` : (auth?.sub ? `, ${auth.sub}` : '')}</h1> : <h1 className="text-lg sm:text-lg font-extrabold tracking-tight">Login to continue</h1>}
            <p className="mt-4 text-md sm:text-md text-muted-foreground">A minimal, fast and focused learning space.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {auth?.sub ? (
                nextTarget ? (
                  <a href="https://avsec-it.vercel.app/" className="inline-flex items-center border rounded-full px-5 py-2.5 bg-black text-white hover:bg-primary/90">Back to Home</a>
                ) : (
                  <a href="/profile" className="inline-flex items-center rounded-full px-5 py-2.5 bg-black text-white hover:bg-primary/90">Go to Profile</a>
                )
              ) : (
                <a href="/login" className="inline-flex items-center rounded-full px-5 py-2.5 bg-black text-white hover:bg-primary/90">Sign In</a>
              )}
              {nextTarget ? (
                <a href={`/courses/${nextTarget.course.id}/${nextTarget.module.id}`} className="inline-flex items-center border rounded-full px-5 py-2.5 bg-muted text-foreground hover:bg-muted/80">Resume Journey</a>
              ) : (
                <a href="/courses" className="inline-flex items-center border rounded-full px-5 py-2.5 bg-muted text-foreground hover:bg-muted/80">Preview Courses</a>
              )}
            </div>
          </div>

          {/* Locked Course Teasers */}
          <h2 className="text-xl mt-10 mb-6">Upcoming Courses</h2>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
            {(placeholderCourses).map((c: any) => (
              <Card key={c.id} className="rounded-2xl shadow-sm border">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base sm:text-lg font-semibold truncate">{c.title}</div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description || 'This course is being prepared. Stay tuned!'}</p>
                      <div className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        <span>Locked • Coming soon</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
