import { ModuleListSkeleton, SkeletonTitle } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <SkeletonTitle className="mb-6" />
      <ModuleListSkeleton />
    </div>
  );
}
