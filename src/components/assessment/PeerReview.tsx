"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Star, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  Eye,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Award
} from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  levels: {
    points: number;
    label: string;
    description: string;
  }[];
}

interface PeerSubmission {
  id: string;
  studentId: string;
  studentName: string;
  content: string;
  submittedAt: number;
  attachments?: string[];
}

interface PeerReview {
  id: string;
  reviewerId: string;
  reviewerName: string;
  submissionId: string;
  scores: Record<string, number>;
  feedback: string;
  overallRating: number;
  isComplete: boolean;
  submittedAt?: number;
  isHelpful?: boolean;
}

interface PeerReviewProps {
  assignmentId: string;
  currentUserId: string;
  currentUserName: string;
  rubric: RubricCriterion[];
  mode: 'review' | 'view_reviews' | 'manage';
  submissionToReview?: PeerSubmission;
  receivedReviews?: PeerReview[];
  onReviewSubmit: (review: Omit<PeerReview, 'id'>) => void;
  onHelpfulnessVote?: (reviewId: string, isHelpful: boolean) => void;
}

export default function PeerReview({
  assignmentId,
  currentUserId,
  currentUserName,
  rubric,
  mode,
  submissionToReview,
  receivedReviews = [],
  onReviewSubmit,
  onHelpfulnessVote
}: PeerReviewProps) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');
  const [overallRating, setOverallRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null);
  
  const { trackEvent } = useAnalytics();

  const handleScoreChange = (criterionId: string, points: number) => {
    setScores(prev => ({ ...prev, [criterionId]: points }));
    
    trackEvent('peer_review_score_changed', {
      assignmentId,
      criterionId,
      points,
      reviewerId: currentUserId
    });
  };

  const handleSubmitReview = async () => {
    if (!submissionToReview) return;
    
    // Validate all criteria are scored
    const missingScores = rubric.filter(criterion => !scores[criterion.id]);
    if (missingScores.length > 0) {
      alert(`Please score all criteria: ${missingScores.map(c => c.name).join(', ')}`);
      return;
    }
    
    if (!feedback.trim()) {
      alert('Please provide written feedback');
      return;
    }
    
    if (overallRating === 0) {
      alert('Please provide an overall rating');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const review: Omit<PeerReview, 'id'> = {
        reviewerId: currentUserId,
        reviewerName: currentUserName,
        submissionId: submissionToReview.id,
        scores,
        feedback,
        overallRating,
        isComplete: true,
        submittedAt: Date.now()
      };
      
      await onReviewSubmit(review);
      
      trackEvent('peer_review_submitted', {
        assignmentId,
        submissionId: submissionToReview.id,
        reviewerId: currentUserId,
        totalScore: Object.values(scores).reduce((sum, score) => sum + score, 0),
        overallRating,
        feedbackLength: feedback.length
      });
      
      // Reset form
      setScores({});
      setFeedback('');
      setOverallRating(0);
      
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotalScore = () => {
    return Object.values(scores).reduce((sum, score) => sum + score, 0);
  };

  const getMaxPossibleScore = () => {
    return rubric.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  };

  const getScorePercentage = (score: number, maxScore: number) => {
    return maxScore > 0 ? (score / maxScore) * 100 : 0;
  };

  const getOverallGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A', color: 'text-green-600' };
    if (percentage >= 80) return { grade: 'B', color: 'text-blue-600' };
    if (percentage >= 70) return { grade: 'C', color: 'text-yellow-600' };
    if (percentage >= 60) return { grade: 'D', color: 'text-orange-600' };
    return { grade: 'F', color: 'text-red-600' };
  };

  if (mode === 'review' && submissionToReview) {
    const totalScore = calculateTotalScore();
    const maxScore = getMaxPossibleScore();
    const scorePercentage = getScorePercentage(totalScore, maxScore);
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Peer Review Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You are reviewing a submission by {submissionToReview.studentName}. 
                Provide constructive feedback to help your peer improve their work.
              </AlertDescription>
            </Alert>
            
            {/* Submission Content */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Submission to Review</h3>
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="whitespace-pre-wrap text-sm">
                    {submissionToReview.content}
                  </div>
                  {submissionToReview.attachments && submissionToReview.attachments.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-muted-foreground mb-2">Attachments:</div>
                      {submissionToReview.attachments.map((attachment, index) => (
                        <Badge key={index} variant="outline" className="mr-2">
                          📎 {attachment}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Scoring Progress */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Review Progress</span>
                <span className="text-sm text-muted-foreground">
                  {totalScore}/{maxScore} points ({scorePercentage.toFixed(1)}%)
                </span>
              </div>
              <Progress value={(Object.keys(scores).length / rubric.length) * 100} className="mb-2" />
              <div className="text-xs text-muted-foreground">
                {Object.keys(scores).length}/{rubric.length} criteria scored
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rubric Scoring */}
        <Card>
          <CardHeader>
            <CardTitle>Scoring Rubric</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rubric.map((criterion) => (
              <div key={criterion.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{criterion.name}</h4>
                  <Badge variant={scores[criterion.id] ? "default" : "outline"}>
                    {scores[criterion.id] || 0}/{criterion.maxPoints} pts
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">{criterion.description}</p>
                
                <RadioGroup
                  value={scores[criterion.id]?.toString() || ''}
                  onValueChange={(value) => handleScoreChange(criterion.id, parseInt(value))}
                >
                  {criterion.levels.map((level) => (
                    <div key={level.points} className="flex items-start space-x-2 p-2 rounded border">
                      <RadioGroupItem value={level.points.toString()} id={`${criterion.id}-${level.points}`} />
                      <div className="flex-1">
                        <Label htmlFor={`${criterion.id}-${level.points}`} className="cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{level.label}</span>
                            <Badge variant="secondary">{level.points} pts</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {level.description}
                          </div>
                        </Label>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Overall Rating */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Overall Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setOverallRating(rating)}
                    className={`p-1 rounded transition-colors ${
                      rating <= overallRating 
                        ? 'text-yellow-400' 
                        : 'text-gray-300 hover:text-yellow-200'
                    }`}
                  >
                    <Star className="h-6 w-6 fill-current" />
                  </button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {overallRating > 0 && `${overallRating}/5 stars`}
              </div>
            </div>
            
            <div>
              <Label htmlFor="feedback" className="text-sm font-medium mb-2 block">
                Written Feedback
              </Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide constructive feedback on strengths, areas for improvement, and suggestions..."
                className="min-h-32"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {feedback.length}/500 characters recommended
              </div>
            </div>
            
            <Button 
              onClick={handleSubmitReview}
              disabled={isSubmitting || Object.keys(scores).length !== rubric.length || !feedback.trim() || overallRating === 0}
              className="w-full"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === 'view_reviews') {
    const averageScore = receivedReviews.length > 0 
      ? receivedReviews.reduce((sum, review) => {
          const reviewTotal = Object.values(review.scores).reduce((s, score) => s + score, 0);
          return sum + reviewTotal;
        }, 0) / receivedReviews.length
      : 0;
    
    const maxScore = getMaxPossibleScore();
    const averagePercentage = getScorePercentage(averageScore, maxScore);
    const gradeInfo = getOverallGrade(averagePercentage);
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Your Peer Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {receivedReviews.length > 0 ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${gradeInfo.color}`}>
                      {gradeInfo.grade}
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Grade</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {averageScore.toFixed(1)}/{maxScore}
                    </div>
                    <div className="text-sm text-muted-foreground">Average Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{receivedReviews.length}</div>
                    <div className="text-sm text-muted-foreground">Reviews Received</div>
                  </div>
                </div>

                {/* Individual Reviews */}
                {receivedReviews.map((review) => {
                  const reviewTotal = Object.values(review.scores).reduce((sum, score) => sum + score, 0);
                  const reviewPercentage = getScorePercentage(reviewTotal, maxScore);
                  
                  return (
                    <Card key={review.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Review by {review.reviewerName}</span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= review.overallRating 
                                      ? 'fill-yellow-400 text-yellow-400' 
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {reviewTotal}/{maxScore} pts ({reviewPercentage.toFixed(1)}%)
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Criterion Scores */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {rubric.map((criterion) => (
                            <div key={criterion.id} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                              <span className="text-sm">{criterion.name}</span>
                              <Badge variant="secondary">
                                {review.scores[criterion.id] || 0}/{criterion.maxPoints}
                              </Badge>
                            </div>
                          ))}
                        </div>
                        
                        {/* Feedback */}
                        <div>
                          <h4 className="font-medium mb-2">Feedback</h4>
                          <div className="text-sm bg-muted/30 p-3 rounded">
                            {review.feedback}
                          </div>
                        </div>
                        
                        {/* Helpfulness Voting */}
                        {onHelpfulnessVote && (
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <span className="text-sm text-muted-foreground">Was this review helpful?</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onHelpfulnessVote(review.id, true)}
                              className="h-8 px-2"
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onHelpfulnessVote(review.id, false)}
                              className="h-8 px-2"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div>No peer reviews received yet</div>
                <div className="text-sm">Reviews will appear here once your peers submit them</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="text-center py-8 text-muted-foreground">
      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <div>Peer Review Component</div>
      <div className="text-sm">Select a mode to get started</div>
    </div>
  );
}
