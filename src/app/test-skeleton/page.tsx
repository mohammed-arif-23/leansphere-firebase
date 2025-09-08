"use client";

import { 
  Skeleton, 
  SkeletonText, 
  SkeletonTitle, 
  SkeletonAvatar, 
  SkeletonCard, 
  SkeletonButton,
  CourseCardSkeleton,
  ModuleListSkeleton,
  DashboardSkeleton,
  StreakTrackerSkeleton,
  HeaderSkeleton
} from "@/components/ui/skeleton";

export default function TestSkeletonPage() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-8">Skeleton Loading Test Page</h1>
      
      {/* Basic Skeleton Components */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Basic Skeleton Components</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Enhanced Skeleton</h3>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Skeleton Variants</h3>
            <SkeletonTitle />
            <SkeletonText />
            <SkeletonText className="w-2/3" />
            <div className="flex items-center space-x-4">
              <SkeletonAvatar />
              <div className="flex-1">
                <SkeletonText className="w-1/3" />
                <SkeletonText className="w-1/2" />
              </div>
              <SkeletonButton />
            </div>
          </div>
        </div>
      </section>

      {/* Card Skeleton */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Card Skeleton</h2>
        <SkeletonCard />
      </section>

      {/* Course Card Skeleton */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Course Card Skeleton</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </div>
      </section>

      {/* Module List Skeleton */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Module List Skeleton</h2>
        <ModuleListSkeleton />
      </section>

      {/* Dashboard Skeleton */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Dashboard Skeleton</h2>
        <DashboardSkeleton />
      </section>

      {/* Complex Skeleton Layouts */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Complex Skeleton Layouts</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Header Skeleton</h3>
            <HeaderSkeleton />
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Course Card Skeleton</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CourseCardSkeleton />
              <CourseCardSkeleton />
              <CourseCardSkeleton />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Module List Skeleton</h3>
            <ModuleListSkeleton />
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Streak Tracker Skeleton</h3>
            <div className="max-w-md">
              <StreakTrackerSkeleton />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Dashboard Skeleton</h3>
            <DashboardSkeleton />
          </div>
        </div>
      </section>

      {/* CSS Class Test */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Direct CSS Class Test</h2>
        <div className="skeleton-enhanced h-12 w-full"></div>
        <div className="skeleton-text"></div>
        <div className="skeleton-title"></div>
        <div className="skeleton-avatar"></div>
        <div className="skeleton-card"></div>
        <div className="skeleton-button"></div>
      </section>
    </div>
  );
}
