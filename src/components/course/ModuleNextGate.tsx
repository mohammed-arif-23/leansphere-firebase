"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Lock, CheckCircle, Circle } from "lucide-react";
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

  const completedCount = currentRequiredBlocks.filter(block => block.completed).length;
  const totalRequired = currentRequiredBlocks.length;
  const progressPercentage = totalRequired > 0 ? (completedCount / totalRequired) * 100 : 100;

  const getBlockTypeEmoji = (type: string) => {
    switch (type) {
      case 'quiz': return '❓';
      case 'assignment': return '📚';
      case 'code': return '💻';
      case 'video': return '🎥';
      default: return '📝';
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t md:hidden">
      {/* Progress indicator when locked */}
      {isLocked && totalRequired > 0 && (
        <Card className="mx-4 mb-2 -mt-2 border-amber-200 bg-amber-50">
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-amber-800">
                  Complete required tasks to unlock next module
                </span>
                <span className="text-amber-600">
                  {completedCount}/{totalRequired}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {currentRequiredBlocks.map((block) => (
                  <div key={block.id} className="flex items-center gap-2 text-xs">
                    {block.completed ? (
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="h-3 w-3 text-amber-600 flex-shrink-0" />
                    )}
                    <span className="flex-shrink-0">{getBlockTypeEmoji(block.type)}</span>
                    <span className={`truncate ${block.completed ? 'text-green-800 line-through' : 'text-amber-800'}`}>
                      {block.title}
                    </span>
                  </div>
                ))}
              </div>
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
              aria-label={`Next module locked - complete ${Math.max(totalRequired - completedCount, 0)} more required tasks`}
              aria-describedby="next-locked-description"
            >
              <Lock className="mr-2 h-4 w-4" />
              Locked ({Math.max(totalRequired - completedCount, 0)} left)
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
          Complete {totalRequired - completedCount} more required tasks in this module to unlock the next module
        </div>
      )}
    </div>
  );
}
