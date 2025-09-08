import { 
  SkeletonText, 
  SkeletonTitle, 
  SkeletonAvatar, 
  SkeletonCard, 
  SkeletonButton,
  StreakTrackerSkeleton
} from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ProfileLoading() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column for profile info and stats */}
        <div className="md:col-span-1 space-y-6">
          {/* Profile Card */}
          <Card className="rounded-xl shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <SkeletonAvatar className="w-24 h-24 mb-4 border-4 border-primary" />
                <SkeletonTitle className="text-2xl w-32 mb-1" />
                <div className="flex items-center gap-2 mt-1">
                  <SkeletonAvatar className="w-4 h-4" />
                  <SkeletonText className="w-40" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Daily Streak Card */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <SkeletonText className="w-20" />
              <SkeletonAvatar className="w-5 h-5" />
            </CardHeader>
            <CardContent>
              <SkeletonTitle className="text-2xl w-16 mb-1" />
              <SkeletonText className="w-48" />
            </CardContent>
          </Card>
          
          {/* Badge Collection Card */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <SkeletonText className="w-28" />
              <SkeletonAvatar className="w-5 h-5" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <SkeletonAvatar className="w-10 h-10" />
                  <div className="flex-1">
                    <SkeletonText className="w-24 mb-1" />
                    <SkeletonText className="w-32" />
                  </div>
                </div>
              ))}
              <SkeletonButton className="p-0 h-auto w-24" />
            </CardContent>
          </Card>
        </div>

        {/* Right column for enrolled courses */}
        <div className="md:col-span-2 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Streak Tracker */}
            <StreakTrackerSkeleton />
            
            {/* My Courses Card */}
            <Card className="rounded-xl shadow-sm md:col-span-2">
              <CardHeader>
                <SkeletonTitle className="w-24" />
                <SkeletonText className="w-64" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border bg-card p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <SkeletonTitle className="text-lg w-48 mb-1" />
                        <SkeletonText className="mb-3 w-full" />
                        <SkeletonText className="mb-3 w-3/4" />
                        <div className="w-full">
                          <div className="flex justify-between text-sm mb-1">
                            <SkeletonText className="w-16" />
                            <SkeletonText className="w-8" />
                          </div>
                          <SkeletonText className="h-2 w-full mb-1" />
                          <SkeletonText className="w-32" />
                        </div>
                      </div>
                      <div className="shrink-0">
                        <SkeletonButton className="w-20 h-10" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
