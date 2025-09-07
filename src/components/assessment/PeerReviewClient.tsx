"use client";

import React from "react";
import PeerReview from "./PeerReview";
import { useAnalytics } from "@/hooks/useAnalytics";

type RubricCriterion = {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  levels: { points: number; label: string; description: string }[];
};

type Props = {
  assignmentId: string;
  currentUserId: string;
  currentUserName: string;
  rubric: RubricCriterion[];
  mode: 'review' | 'view_reviews' | 'manage';
  submissionToReview?: {
    id: string;
    studentId: string;
    studentName: string;
    content: string;
    submittedAt: number;
    attachments?: string[];
  };
};

export default function PeerReviewClient(props: Props) {
  const { trackEvent } = useAnalytics();

  const handleSubmit = async (review: any) => {
    trackEvent("peer_review_submitted", {
      assignmentId: props.assignmentId,
      reviewerId: props.currentUserId,
      submissionId: review?.submissionId,
      totalScore: Object.values(review?.scores || {}).reduce((s: number, v: unknown) => s + (typeof v === 'number' ? v : Number(v) || 0), 0),
      overallRating: review?.overallRating,
    });
    // you can call an API here to persist the review
  };

  return (
    <PeerReview
      assignmentId={props.assignmentId}
      currentUserId={props.currentUserId}
      currentUserName={props.currentUserName}
      rubric={props.rubric}
      mode={props.mode}
      submissionToReview={props.submissionToReview}
      onReviewSubmit={handleSubmit}
    />
  );
}
