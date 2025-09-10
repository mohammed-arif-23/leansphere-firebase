"use client";

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CourseCustomHtml from '@/components/CourseCustomHtml';

export default function CourseOverviewHeader(props: {
  title: string;
  description: string;
  customHtml?: string;
  courseId: string;
  nextModuleId?: string | null;
  totalModules: number;
  completedModulesInCourse: number;
}) {
  const {
    title,
    description,
    customHtml,
    courseId,
    nextModuleId,
    totalModules,
    completedModulesInCourse,
  } = props;
  return (
    <section className="mb-6 animate-slide-up" style={{ animationDelay: '80ms' }}>
      <Card className="rounded-2xl">
        <CardContent className="p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground line-clamp-3">{description}</p>
          {customHtml ? (
            <div className="mt-4">
              <CourseCustomHtml html={customHtml} />
            </div>
          ) : null}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {totalModules} modules
            </div>
            {nextModuleId && (
              <Link href={`/courses/${courseId}/${nextModuleId}`} prefetch>
                <Button size="sm" className="bg-white text-black border border-black hover:bg-grey/90 rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]">
                  {completedModulesInCourse === 0 ? 'Start Course' : (completedModulesInCourse < totalModules ? 'Resume' : 'Review')}
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
