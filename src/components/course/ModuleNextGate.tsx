"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import NextModuleButton from "@/components/course/NextModuleButton";

type Props = {
  courseId: string;
  moduleId: string;
  prevHref?: string | null;
  nextHref: string;
  initiallyLocked: boolean;
};

export default function ModuleNextGate({ courseId, moduleId, prevHref, nextHref, initiallyLocked }: Props) {
  const [locked, setLocked] = useState(initiallyLocked);

  useEffect(() => {
    const onUnlock = () => setLocked(false);
    window.addEventListener('module-unlock', onUnlock as any);
    return () => window.removeEventListener('module-unlock', onUnlock as any);
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 bg-white/90 backdrop-blur border-t">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
        {prevHref ? (
          <Button asChild variant="outline" size="sm">
            <Link href={prevHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Link>
          </Button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-3">
          {locked && (
            <span className="text-xs text-muted-foreground">Complete required tasks to unlock</span>
          )}
          <NextModuleButton
            courseId={courseId}
            moduleId={moduleId}
            href={nextHref}
            disabled={locked}
            label={locked ? 'Locked' : 'Next Module'}
          />
        </div>
      </div>
    </div>
  );
}
