"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import { useAnalytics } from "../../hooks/useAnalytics";

interface RequiredBlock {
  id: string;
  title: string;
  type: string;
  completed: boolean;
}

interface ModuleNextGateProps {
  courseId: string;
  moduleId: string;
  prevHref: string | null;
  nextHref: string | null;
  initiallyLocked: boolean;
  requiredBlocks?: RequiredBlock[];
}

export default function ModuleNextGate({
  courseId,
  moduleId,
  prevHref,
  nextHref,
  initiallyLocked,
  requiredBlocks = [],
}: ModuleNextGateProps) {
  const [isLocked, setIsLocked] = useState(initiallyLocked);
  const [currentRequiredBlocks, setCurrentRequiredBlocks] = useState<RequiredBlock[]>(requiredBlocks);
  const { trackResumeClick } = useAnalytics();

  useEffect(() => {
    const handleProgressUpdate = () => {
      // Check if all required blocks are completed
      const requiredBlockElements = document.querySelectorAll('[data-required="true"]');
      const completedBlockElements = document.querySelectorAll('[data-completed="true"][data-required="true"]');
      
      // Update required blocks state from DOM
      const updatedBlocks: RequiredBlock[] = [];
      requiredBlockElements.forEach((element) => {
        const blockId = element.getAttribute('data-block-id');
        const blockTitle = element.getAttribute('data-block-title') || 'Untitled Block';
        const blockType = element.getAttribute('data-block-type') || 'content';
        const isCompleted = element.getAttribute('data-completed') === 'true';
        
        if (blockId) {
          updatedBlocks.push({
            id: blockId,
            title: blockTitle,
            type: blockType,
            completed: isCompleted,
          });
        }
      });
      
      setCurrentRequiredBlocks(updatedBlocks);
      
      if (requiredBlockElements.length === 0) {
        // No required tasks — gate should be unlocked
        setIsLocked(false);
      } else if (completedBlockElements.length === requiredBlockElements.length) {
        // All required tasks completed — unlock
        setIsLocked(false);
      } else {
        setIsLocked(true);
      }
    };

    // Initial check
    handleProgressUpdate();

    // Listen for progress updates from multiple events
    window.addEventListener('blockCompleted', handleProgressUpdate);
    window.addEventListener('module-unlock', handleProgressUpdate);

    // Observe DOM attribute changes for data-completed flips
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && (m.attributeName === 'data-completed' || m.attributeName === 'data-required')) {
          handleProgressUpdate();
          break;
        }
      }
    });
    try {
      observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['data-completed','data-required'] });
    } catch {}

    return () => {
      window.removeEventListener('blockCompleted', handleProgressUpdate);
      window.removeEventListener('module-unlock', handleProgressUpdate);
      try { observer.disconnect(); } catch {}
    };
  }, []);

  const handleNextClick = () => {
    // Attempt to mark current module as completed in background
    try {
      const payload = JSON.stringify({ courseId, moduleId });
      const blob = new Blob([payload], { type: 'application/json' });
      // Prefer sendBeacon for reliability during navigation
      const ok = (navigator as any).sendBeacon?.('/api/learning/progress/complete-module', blob);
      if (!ok) {
        // Fallback to fetch with keepalive
        fetch('/api/learning/progress/complete-module', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {}

    if (nextHref) {
      const nextModuleId = nextHref.split('/').pop();
      if (nextModuleId) {
        trackResumeClick(courseId, nextModuleId);
      }
    }
  };

  const handlePrevClick = () => {
    if (prevHref) {
      const prevModuleId = prevHref.split('/').pop();
      if (prevModuleId) {
        trackResumeClick(courseId, prevModuleId);
      }
    }
  };

  const totalRequired = currentRequiredBlocks.length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t md:hidden">
      {/* Progress indicator when locked */}
      {isLocked && totalRequired > 0 && (
        <Card className="mx-4 mb-2 -mt-2 border-amber-300 bg-amber-50/90 shadow-lg ring-1 ring-amber-300">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-[13px]">
              <Lock className="h-4 w-4 text-amber-700" />
              <span className="font-semibold text-amber-900">
                Complete required items in this module to unlock the next
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between p-4">
        {prevHref ? (
          <Link href={prevHref} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrevClick}
              aria-label="Go to previous module"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
          </Link>
        ) : (
          <div />
        )}

        {nextHref ? (
          isLocked ? (
            <Button 
              variant="outline" 
              size="sm" 
              disabled 
              aria-label={`Next module locked - complete required items`}
              aria-describedby="next-locked-description"
            >
              <Lock className="mr-2 h-4 w-4" />
              Locked
            </Button>
          ) : (
            <Link href={nextHref} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]">
              <Button 
                size="sm" 
                onClick={handleNextClick}
                aria-label="Continue to next module"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )
        ) : (
          <Link href={`/courses/${courseId}`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]">
            <Button size="sm" aria-label="Return to course overview">
              Finish Course
            </Button>
          </Link>
        )}
      </div>
      
      {isLocked && (
        <div id="next-locked-description" className="sr-only">
          Complete required items in this module to unlock the next module
        </div>
      )}
    </div>
  );
}
