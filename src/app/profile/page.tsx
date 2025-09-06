import { getAchievementsByStudentId, getCourses, getUserById, getUserProgress } from "@/lib/data";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Mail, Trophy } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AchievementCard } from "@/components/dashboard/AchievementCard";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  const studentId = 'student1'; // In a real app, this would come from the session
  const user = getUserById(studentId);
  const userProgress = getUserProgress(studentId);
  const courses = getCourses();
  const achievements = getAchievementsByStudentId(studentId);

  if (!user || !userProgress) {
    notFound();
  }
  
  const enrolledCourses = courses.filter(course => 
    userProgress.completedModules.some(moduleId => course.modules.some(m => m.id === moduleId)) ||
    // A better check for "in-progress" would be needed in a real app
    course.modules.length > 0 
  );


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column for profile info and stats */}
        <div className="md:col-span-1 space-y-6">
           <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-24 h-24 mb-4 border-4 border-primary">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-bold">{user.name}</h1>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4"/> {user.email}
                </p>
              </div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Daily Streak</CardTitle>
              <Flame className="w-5 h-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userProgress.streak} days</div>
              <p className="text-xs text-muted-foreground">Keep it going to earn rewards!</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Achievements</CardTitle>
              <Trophy className="w-5 h-5 text-amber-500" />
            </CardHeader>
            <CardContent className="space-y-4">
              {achievements.slice(0, 5).map(achievement => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
              {achievements.length > 5 && (
                <Button variant="link" className="p-0 h-auto">View all achievements</Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column for enrolled courses */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Courses</CardTitle>
              <CardDescription>Courses you have started or completed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               {enrolledCourses.map(course => {
                 const completedModulesInCourse = userProgress.completedModules.filter(moduleId =>
                   course.modules.some(module => module.id === moduleId)
                 ).length;
                 const totalModules = course.modules.length;
                 const progressPercentage = totalModules > 0 ? (completedModulesInCourse / totalModules) * 100 : 0;
                 
                 return (
                   <Card key={course.id} className="overflow-hidden">
                     <div className="grid grid-cols-1 sm:grid-cols-3">
                       <div className="sm:col-span-2 p-4">
                         <h3 className="font-semibold text-lg">{course.title}</h3>
                         <p className="text-sm text-muted-foreground mt-1 mb-3">{course.description}</p>
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
                        <div className="bg-muted/50 p-4 flex flex-col justify-center items-center text-center">
                          <p className="text-sm font-medium">Difficulty</p>
                          <p className="capitalize text-muted-foreground">{course.difficulty}</p>
                          <Separator className="my-2"/>
                           <Button asChild className="mt-2 w-full">
                            <Link href={`/courses/${course.id}`}>
                                {progressPercentage > 0 && progressPercentage < 100 ? 'Continue' : 'View Course'}
                            </Link>
                          </Button>
                       </div>
                     </div>
                   </Card>
                 )
               })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}