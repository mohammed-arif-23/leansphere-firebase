import { getCourses, getUserProgress } from '@/lib/data';
import { CourseCard } from '@/components/dashboard/CourseCard';
import { Recommendations } from '@/components/dashboard/Recommendations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpenCheck } from 'lucide-react';

export default function Dashboard() {
  const courses = getCourses();
  const userProgress = getUserProgress('student1');

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
            <h2 className="text-2xl font-semibold mb-4">My Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} userProgress={userProgress} />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <Recommendations />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Activity</CardTitle>
              <BookOpenCheck className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">A</div>
                    <div className="ml-4 flex-1">
                        <p className="text-sm">You completed <span className="font-semibold">"Intro to Variables"</span> in Python Basics.</p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                </div>
                 <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">A</div>
                    <div className="ml-4 flex-1">
                        <p className="text-sm">You started the <span className="font-semibold">"Java Fundamentals"</span> course.</p>
                        <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
