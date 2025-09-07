"use client";

import React from "react";
import PlagiarismDetector from "./PlagiarismDetector";
import { useAnalytics } from "@/hooks/useAnalytics";

type Props = {
  assignmentId: string;
  studentId: string;
  submissionText?: string;
  autoAnalyze?: boolean;
};

export default function PlagiarismDetectorClient({ assignmentId, studentId, submissionText = "", autoAnalyze }: Props) {
  const { trackEvent } = useAnalytics();

  const handleComplete = (result: any) => {
    trackEvent("plagiarism_analysis_completed", {
      assignmentId,
      studentId,
      overallSimilarity: result?.overallSimilarity,
      riskLevel: result?.riskLevel,
      matchCount: result?.matches?.length,
      analysisTime: result?.analysisTime,
    });
  };

  return (
    <PlagiarismDetector
      assignmentId={assignmentId}
      studentId={studentId}
      submissionText={submissionText}
      onAnalysisComplete={handleComplete}
      autoAnalyze={autoAnalyze}
    />
  );
}
