import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CourseCard } from '@/components/dashboard/CourseCard';
import { AchievementCard } from '@/components/dashboard/AchievementCard';
import { BookOpenCheck, Trophy, CheckCircle } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJWT } from '@/lib/auth';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { CourseService, ProgressService, AchievementService } from '@/lib/services/database';

export default async function Dashboard() {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) redirect('/login?redirect=/');

  let auth: any = null;
  try {
    auth = verifyJWT(token);
  } catch {
    redirect('/login?redirect=/');
  }

  await ensureMongooseConnection();
  const [courseListRaw, progressListRaw, achievementsRaw] = await Promise.all([
    CourseService.list({ isPublished: true }, { page: 1, limit: 50 }).then((r) => r.items),
    ProgressService.getByStudent(auth.sub),
    AchievementService.getForStudent(auth.sub),
  ]);
  // Deep-clone to plain JSON to strip ObjectId/Date prototypes
  const courseList = JSON.parse(JSON.stringify(courseListRaw));
  const progressList = JSON.parse(JSON.stringify(progressListRaw));
  const achievements = JSON.parse(JSON.stringify(achievementsRaw));

  const completedModulesCount = progressList.reduce((acc: number, p: any) => acc + (p.completedModules?.length || 0), 0);
  const totalModulesCount = courseList?.reduce((acc: number, c: any) => acc + (c.modules?.length || 0), 0) || 0;
  const overallCompletion = totalModulesCount > 0 ? (completedModulesCount / totalModulesCount) * 100 : 0;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Welcome back, {auth.name || auth.sub}!</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Continue your learning journey and explore new topics.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Courses in Progress</CardTitle>
                        <BookOpenCheck className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{progressList.length}</div>
                        <p className="text-xs text-muted-foreground">
                           Keep up the great work!
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Overall Completion</CardTitle>
                        <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(overallCompletion)}%</div>
                         <p className="text-xs text-muted-foreground">
                           {completedModulesCount} of {totalModulesCount} modules completed
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Achievements Unlocked</CardTitle>
                        <Trophy className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{achievements.length}</div>
                         <p className="text-xs text-muted-foreground">
                           New badges to show off
                        </p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-2xl font-semibold" id="courses">My Courses</h2>
            </div>
            <Separator className="mb-6"/>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courseList?.map((course: any) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  userProgress={{ completedModules: progressList.flatMap((p: any) => p.completedModules || []) } as any}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <Card className="bg-card/80 backdrop-blur-sm sticky top-24">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Recent Achievements</CardTitle>
              <Trophy className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 {achievements.map((achievement: any) => (
                   <AchievementCard key={achievement.id} achievement={achievement} />
                 ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
