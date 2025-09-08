import { SkeletonTitle, SkeletonCard, SkeletonButton, SkeletonAvatar, SkeletonText } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 animate-fade-in">
      {/* Navigation */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <SkeletonButton className="h-9 w-20" />
          <SkeletonText className="w-32" />
        </div>
      </div>

      {/* Header */}
      <header className="mb-6">
        <SkeletonTitle className="text-3xl sm:text-4xl font-bold w-96 mb-1" />
        <SkeletonText className="text-base sm:text-lg w-48 mb-3" />
        
        {/* Progress section */}
        <div className="mt-3">
          <div className="flex justify-between text-sm mb-1">
            <SkeletonText className="w-24" />
            <SkeletonText className="w-8" />
          </div>
          <SkeletonText className="h-2 w-full mb-1" />
          <SkeletonText className="text-xs w-20" />
        </div>
      </header>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content blocks */}
        <div className="lg:col-span-2">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} className="rounded-2xl border-0 bg-card shadow-sm p-3 sm:p-4">
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <SkeletonTitle className="text-xl sm:text-2xl font-semibold w-64" />
                </div>
                <div className="space-y-2">
                  <SkeletonText className="w-full" />
                  <SkeletonText className="w-4/5" />
                  <SkeletonText className="w-3/5" />
                </div>
              </SkeletonCard>
            ))}
          </div>
          <div className="h-10 mt-5" />
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-4 lg:sticky lg:top-20 self-start">
          {/* Study Panel */}
          <SkeletonCard className="p-4">
            <SkeletonTitle className="w-20 mb-3" />
            <div className="space-y-2">
              <SkeletonText className="w-full" />
              <SkeletonText className="w-3/4" />
            </div>
            <SkeletonButton className="w-full mt-3 h-9" />
          </SkeletonCard>

          {/* Assessment components */}
          <SkeletonCard className="p-4">
            <SkeletonTitle className="w-24 mb-3" />
            <div className="space-y-2">
              <SkeletonText className="w-full" />
              <SkeletonText className="w-2/3" />
            </div>
          </SkeletonCard>
        </aside>
      </div>

      {/* Next module section */}
      <div className="container py-6 mx-auto px-4 sm:px-6 lg:px-8 mb-4">
        <div className="mx-auto w-full max-w-2xl">
          <SkeletonCard className="rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <SkeletonText className="text-xs w-16 mb-1" />
                <SkeletonTitle className="text-lg w-48 mb-2" />
                <SkeletonText className="text-sm w-full" />
                <SkeletonText className="text-sm w-3/4" />
              </div>
            </div>
          </SkeletonCard>
        </div>
      </div>

      {/* Footer spacer */}
      <div className="h-40 sm:h-32 md:h-24" />
    </div>
  );
}
