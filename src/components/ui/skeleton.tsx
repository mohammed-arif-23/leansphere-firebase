import { cn } from "@/lib/utils"

function Skeleton({
  className,
  variant = "enhanced",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "enhanced" | "text" | "title" | "avatar" | "card" | "button"
}) {
  const variantClasses = {
    default: "animate-pulse rounded-md bg-muted",
    enhanced: "skeleton-enhanced",
    text: "skeleton-text",
    title: "skeleton-title", 
    avatar: "skeleton-avatar",
    card: "skeleton-card",
    button: "skeleton-button"
  }

  return (
    <div
      className={cn(variantClasses[variant], className)}
      {...props}
    />
  )
}

// Specialized skeleton components
function SkeletonText({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton variant="text" className={className} {...props} />
}

function SkeletonTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton variant="title" className={className} {...props} />
}

function SkeletonAvatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton variant="avatar" className={className} {...props} />
}

function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton variant="card" className={className} {...props} />
}

function SkeletonButton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton variant="button" className={className} {...props} />
}

// Complex skeleton layouts
function CourseCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl flex flex-col bg-card/80 backdrop-blur-sm border border-white/20 shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-600/10 dark:from-blue-500/20 dark:to-purple-600/20" />
      {/* Header with image */}
      <div className="relative p-0">
        <div className="relative h-48 w-full">
          <SkeletonCard className="w-full h-full rounded-none" />
        </div>
      </div>
      {/* Content */}
      <div className="relative flex-grow p-6">
        <div className="flex items-center justify-between mb-2">
          <SkeletonTitle className="text-xl w-3/4" />
        </div>
        <SkeletonText className="mb-2" />
        <SkeletonText className="w-4/5" />
      </div>
      {/* Footer */}
      <div className="relative flex flex-col items-start gap-4 p-6 pt-0 mt-auto">
        <div className="w-full">
          <div className="flex justify-between text-sm mb-1">
            <SkeletonText className="w-16 h-3" />
            <SkeletonText className="w-8 h-3" />
          </div>
          <SkeletonText className="h-2 w-full mb-1" />
          <SkeletonText className="w-24 h-3" />
        </div>
        <SkeletonButton className="w-full h-10" />
      </div>
    </div>
  )
}

function ModuleListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center p-4 border rounded-lg transition-all duration-200 bg-background">
          <div className="flex-shrink-0 mr-4">
            <SkeletonAvatar className="h-6 w-6 rounded-full" />
          </div>
          <div className="flex-grow">
            <SkeletonText className="font-medium w-3/4 h-5" />
          </div>
          <div className="ml-4 flex-shrink-0">
            <SkeletonAvatar className="h-5 w-5 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <SkeletonTitle className="w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Specific component skeletons
function StreakTrackerSkeleton() {
  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200 rounded-lg border p-6">
      <div className="pb-3">
        <div className="flex items-center gap-2">
          <SkeletonAvatar className="h-5 w-5 rounded-sm" />
          <SkeletonText className="w-32 h-5" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="text-center">
          <SkeletonTitle className="text-3xl w-16 mx-auto mb-1" />
          <SkeletonText className="w-24 mx-auto" />
          <SkeletonText className="w-20 mx-auto mt-1" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <SkeletonAvatar className="h-4 w-4 rounded-sm" />
              <SkeletonText className="w-20" />
            </div>
            <SkeletonButton className="h-auto p-1 w-12" />
          </div>
          <SkeletonText className="h-2 w-full rounded-full" />
          <SkeletonText className="w-32 mx-auto" />
        </div>
        <div className="text-center p-2 bg-orange-100 rounded-lg">
          <SkeletonText className="w-24 mx-auto" />
        </div>
      </div>
    </div>
  )
}

function HeaderSkeleton() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white border-b border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-center">
          <SkeletonCard className="h-12 w-[300px] sm:w-[360px] rounded-xl" />
        </div>
      </div>
    </header>
  )
}

function HomeSkeleton() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
          <div className="max-w-3xl">
            <SkeletonTitle className="text-4xl sm:text-6xl font-extrabold w-48 mb-4" />
            <SkeletonText className="text-lg sm:text-xl mb-2" />
            <SkeletonText className="text-lg sm:text-xl w-4/5 mb-6" />
            <div className="flex flex-wrap gap-3">
              <SkeletonButton className="rounded-full px-5 py-2.5 w-36" />
              <SkeletonButton className="rounded-full px-5 py-2.5 w-32" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <SkeletonTitle className="text-2xl sm:text-3xl font-bold w-24 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="rounded-xl shadow-sm p-6">
              <SkeletonTitle className="text-lg font-semibold w-32 mb-1" />
              <SkeletonText className="text-sm mb-1" />
              <SkeletonText className="text-sm w-4/5" />
            </SkeletonCard>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div>
            <SkeletonTitle className="text-2xl sm:text-3xl font-bold w-40 mb-3" />
            <SkeletonText className="text-sm sm:text-base mb-2" />
            <SkeletonText className="text-sm sm:text-base w-4/5 mb-4" />
            <div className="space-y-1">
              <SkeletonText className="text-sm sm:text-base w-5/6" />
              <SkeletonText className="text-sm sm:text-base w-4/5" />
              <SkeletonText className="text-sm sm:text-base w-3/4" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <SkeletonTitle className="text-2xl sm:text-3xl font-bold w-32 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <SkeletonText className="text-sm sm:text-base mb-1" />
              <SkeletonText className="text-sm sm:text-base w-4/5" />
            </div>
          ))}
        </div>
        <div className="mt-6">
          <SkeletonButton className="rounded-full border px-5 py-2.5 w-32" />
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="border-t bg-background/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <SkeletonTitle className="text-xl font-semibold w-40 mb-1" />
              <SkeletonText className="text-sm w-64" />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export { 
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
  HeaderSkeleton,
  HomeSkeleton
}
