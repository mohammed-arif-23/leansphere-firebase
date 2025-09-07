"use client";

import React from "react";
import AdaptiveQuiz from "./AdaptiveQuiz";
import { useAnalytics } from "@/hooks/useAnalytics";

type Props = {
  courseId: string;
  moduleId: string;
  contentBlockId: string;
  questionPool: any[];
  timeLimit?: number;
};

export default function AdaptiveQuizClient({ courseId, moduleId, contentBlockId, questionPool, timeLimit }: Props) {
  const { trackEvent } = useAnalytics();

  const handleComplete = (results: any) => {
    trackEvent("adaptive_quiz_completed", {
      courseId,
      moduleId,
      score: results?.score,
      totalQuestions: results?.totalQuestions,
      timeSpent: results?.timeSpent,
    });
  };

  return (
    <AdaptiveQuiz
      courseId={courseId}
      moduleId={moduleId}
      contentBlockId={contentBlockId}
      questionPool={questionPool}
      timeLimit={timeLimit}
      onComplete={handleComplete}
    />
  );
}
