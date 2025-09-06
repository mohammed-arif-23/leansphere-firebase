import { getCourses, getUserProgress, getAchievementsByStudentId } from '@/lib/data';
import { CourseCard } from '@/components/dashboard/CourseCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpenCheck, Trophy } from 'lucide-react';
import { AchievementCard } from '@/components/dashboard/AchievementCard';

export default function Dashboard() {
  const courses = getCourses();
  const userProgress = getUserProgress('student1');
  const achievements = getAchievementsByStudentId('student1');

  if (!userProgress) {
    // Or handle this case more gracefully
    return <div>Could not load user progress.</div>
  }

  const completedModulesCount = userProgress.completedModules.length;
  const totalModulesCount = courses.reduce((acc, course) => acc + course.modules.length, 0);
  const overallCompletion = totalModulesCount > 0 ? (completedModulesCount / totalModulesCount) * 100 : 0;


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Welcome back, Alex!
        </h1>
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
                        <div className="text-2xl font-bold">2</div>
                        <p className="text-xs text-muted-foreground">
                           Keep up the great work!
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Overall Completion</CardTitle>
                        <Trophy className="w-4 h-4 text-muted-foreground" />
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


            <h2 className="text-2xl font-semibold mb-4" id="courses">My Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} userProgress={userProgress} />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Recent Achievements</CardTitle>
              <Trophy className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 {achievements.map((achievement) => (
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
