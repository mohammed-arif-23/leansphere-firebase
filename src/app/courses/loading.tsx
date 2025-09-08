import { SkeletonTitle, SkeletonText, SkeletonButton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <SkeletonTitle className="text-3xl sm:text-4xl font-bold w-32 mb-1" />
        <SkeletonText className="w-48" />
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-card/70 backdrop-blur-glass ring-1 ring-black/10 shadow-large p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <SkeletonTitle className="font-semibold text-lg w-48 mb-1" />
                <SkeletonText className="text-sm mb-1" />
                <SkeletonText className="text-sm w-3/4 mb-2" />
                <SkeletonText className="text-xs w-20" />
              </div>
              <div className="shrink-0">
                <SkeletonButton className="rounded-full w-16 h-9" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
