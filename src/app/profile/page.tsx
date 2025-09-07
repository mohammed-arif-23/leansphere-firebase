import { notFound, redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Mail, Trophy } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AchievementCard } from "@/components/dashboard/AchievementCard";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";
import { ensureMongooseConnection } from "@/lib/mongodb";
import { CourseService, ProgressService, AchievementService } from "@/lib/services/database";
import { Achievement } from "@/types";
import StreakTracker from '@/components/StreakTracker';
// SkillTree removed per request

export default async function ProfilePage() {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) redirect('/login?redirect=/profile');
  let auth: any;
  try { auth = verifyJWT(token); } catch { redirect('/login?redirect=/profile'); }

  await ensureMongooseConnection();
  const [coursesRaw, progressRaw, achievementsRaw] = await Promise.all([
    CourseService.list({ isPublished: true }, { page: 1, limit: 100 }).then(r => r.items),
    ProgressService.getByStudent(auth.sub),
    AchievementService.getForStudent(auth.sub).catch(() => []),
  ]);
  const courses = JSON.parse(JSON.stringify(coursesRaw));
  const progress = JSON.parse(JSON.stringify(progressRaw));
  const achievements = JSON.parse(JSON.stringify(achievementsRaw));

  const completedModules = new Set<string>((progress?.completedModules) || progress?.flatMap?.((p: any) => p.completedModules) || []);
  const enrolledCourses = courses.filter((course: any) => (course.modules || []).some((m: any) => completedModules.has(m.id)) || (course.modules || []).length > 0);


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column for profile info and stats */}
        <div className="md:col-span-1 space-y-6">
           <Card className="rounded-xl shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-24 h-24 mb-4 border-4 border-primary">
                  <AvatarImage src={auth.picture || ''} alt={auth.name || auth.sub} />
                  <AvatarFallback>{(auth.name || auth.sub || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-bold leading-tight">{auth.name || auth.sub}</h1>
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4"/> {auth.email || ''}
                </p>
              </div>
            </CardContent>
          </Card>
           <Card className="rounded-xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Daily Streak</CardTitle>
              <Flame className="w-5 h-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progress?.streak || 0} days</div>
              <p className="text-xs text-muted-foreground">Keep it going to earn rewards!</p>
            </CardContent>
          </Card>
           <Card className="rounded-xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Badge Collection</CardTitle>
              <Trophy className="w-5 h-5 text-amber-500" />
            </CardHeader>
            <CardContent className="space-y-4">
              {achievements.slice(0, 5).map((achievement: Achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
              {achievements.length > 5 && (
                <Button variant="link" className="p-0 h-auto">View all badges</Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column for enrolled courses */}
        <div className="md:col-span-2 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <StreakTracker />
            <Card className="rounded-xl shadow-sm md:col-span-2">
              <CardHeader>
                <CardTitle>My Courses</CardTitle>
                <CardDescription>Courses you have started or completed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                 {enrolledCourses.map((course: any) => {
                   const completedModulesInCourse = (course.modules || []).filter((m: any) => completedModules.has(m.id)).length;
                   const totalModules = (course.modules || []).length;
                   const progressPercentage = totalModules > 0 ? (completedModulesInCourse / totalModules) * 100 : 0;
                   
                   return (
                     <div key={course.id} className="rounded-xl border bg-card p-4 sm:p-5">
                       <div className="flex items-start justify-between gap-4">
                         <div className="min-w-0">
                           <h3 className="font-semibold text-lg truncate">{course.title}</h3>
                           <p className="text-sm text-muted-foreground mt-1 mb-3 line-clamp-2">{course.description}</p>
                           <div className="w-full">
                             <div className="flex justify-between text-sm text-muted-foreground mb-1">
                               <span>Progress</span>
                               <span>{Math.round(progressPercentage)}%</span>
                             </div>
                             <Progress value={progressPercentage} className="h-2" />
                             <p className="text-xs text-muted-foreground mt-1">
                              {completedModulesInCourse} of {totalModules} modules completed.
                             </p>
                           </div>
                         </div>
                         <div className="shrink-0">
                           <Link href={`/courses/${course.id}`} aria-label={`Open course ${course.title}`}>
                             <Button 
                               variant="premium"
                               className="group-hover:shadow-premium transition-all duration-300"
                             >
                               {progressPercentage > 0 && progressPercentage < 100 ? 'Continue' : 'View'}
                             </Button>
                           </Link>
                         </div>
                       </div>
                     </div>
                   )
                 })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}