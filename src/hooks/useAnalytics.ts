import { useCallback } from 'react';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
}

export function useAnalytics() {
  const track = useCallback(async ({ event, properties = {} }: AnalyticsEvent) => {
    try {
      // Send to our analytics endpoint
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          properties: {
            ...properties,
            url: typeof window !== 'undefined' ? window.location.href : '',
            timestamp: new Date().toISOString(),
          },
        }),
      });

      // Also send to Google Analytics if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', event, properties);
      }
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }, []);

  // Generic trackEvent method for custom events
  const trackEvent = useCallback(async (event: string, properties?: Record<string, any>) => {
    await track({ event, properties: properties || {} });
  }, [track]);

  // Convenience methods for common events
  const trackResumeClick = useCallback((courseId: string, moduleId: string) => {
    track({
      event: 'resume_click',
      properties: { course_id: courseId, module_id: moduleId }
    });
  }, [track]);

  const trackCheckpointComplete = useCallback((courseId: string, moduleId: string, checkpointId: string) => {
    track({
      event: 'checkpoint_complete',
      properties: { course_id: courseId, module_id: moduleId, checkpoint_id: checkpointId }
    });
  }, [track]);

  const trackQuizSubmit = useCallback((courseId: string, moduleId: string, score: number, totalQuestions: number) => {
    track({
      event: 'quiz_submit',
      properties: { 
        course_id: courseId, 
        module_id: moduleId, 
        score, 
        total_questions: totalQuestions,
        percentage: Math.round((score / totalQuestions) * 100)
      }
    });
  }, [track]);

  const trackLessonStart = useCallback((courseId: string, moduleId: string) => {
    track({
      event: 'lesson_start',
      properties: { course_id: courseId, module_id: moduleId }
    });
  }, [track]);

  const trackLessonComplete = useCallback((courseId: string, moduleId: string, timeSpent: number) => {
    track({
      event: 'lesson_complete',
      properties: { 
        course_id: courseId, 
        module_id: moduleId, 
        time_spent_seconds: timeSpent 
      }
    });
  }, [track]);

  return {
    track,
    trackEvent,
    trackResumeClick,
    trackCheckpointComplete,
    trackQuizSubmit,
    trackLessonStart,
    trackLessonComplete,
  };
}

// Export the type for use in other components
export type { AnalyticsEvent };
