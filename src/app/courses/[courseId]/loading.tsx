import { SkeletonTitle, SkeletonCard, SkeletonText, SkeletonButton, SkeletonAvatar } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      {/* Back button */}
      <div className="flex items-center gap-2 mb-4">
        <SkeletonButton className="h-9 w-36" />
      </div>

      {/* Image card */}
      <section className="mb-4 animate-slide-up">
        <SkeletonCard className="rounded-2xl overflow-hidden w-full aspect-video" />
      </section>

      {/* Course info card */}
      <section className="mb-6 animate-slide-up">
        <SkeletonCard className="rounded-2xl p-6 sm:p-8">
          <SkeletonTitle className="text-2xl sm:text-3xl font-bold w-64 mb-3" />
          <SkeletonText className="text-sm sm:text-base mb-1" />
          <SkeletonText className="text-sm sm:text-base w-4/5 mb-1" />
          <SkeletonText className="text-sm sm:text-base w-3/5 mb-4" />
          <div className="flex items-center justify-between">
            <SkeletonText className="text-xs w-20" />
            <SkeletonButton className="h-8 w-24 rounded-full" />
          </div>
        </SkeletonCard>
      </section>

      {/* Course modules */}
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          <div className="rounded-2xl bg-card/70 backdrop-blur-glass ring-1 ring-black/10 shadow-large">
            <div className="p-6 pb-0">
              <SkeletonTitle className="w-32 mb-6" />
            </div>
            <div className="p-6 pt-0">
              <div className="rounded-xl">
                <div className="divide-y divide-white/10">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className="p-4">
                      <div className="flex items-start gap-3">
                        <SkeletonAvatar className="h-6 w-6 rounded-full" />
                        <div className="min-w-0 flex-1">
                          <SkeletonText className="font-medium w-48" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
