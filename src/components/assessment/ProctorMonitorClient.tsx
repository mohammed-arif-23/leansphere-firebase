"use client";

import React from "react";
import ProctorMonitor from "./ProctorMonitor";
import { useAnalytics } from "@/hooks/useAnalytics";

export type ProctorMonitorClientProps = {
  examId: string;
  studentId: string;
  isActive: boolean;
  strictMode?: boolean;
};

export default function ProctorMonitorClient({ examId, studentId, isActive, strictMode }: ProctorMonitorClientProps) {
  const { trackEvent } = useAnalytics();

  const handleViolation = (violation: any) => {
    // Track violations client-side
    trackEvent("proctor_violation", {
      examId,
      studentId,
      type: violation?.type,
      severity: violation?.severity,
      timestamp: violation?.timestamp,
    });
  };

  return (
    <ProctorMonitor
      examId={examId}
      studentId={studentId}
      isActive={isActive}
      strictMode={strictMode}
      onViolation={handleViolation}
    />
  );
}
