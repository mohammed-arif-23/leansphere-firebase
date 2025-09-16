"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Brain, TrendingUp, TrendingDown, Target, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AdaptiveQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  options?: string[];
  correctAnswer: string | string[];
  difficulty: 1 | 2 | 3 | 4 | 5; // 1=easiest, 5=hardest
  topic: string;
  timeEstimate: number; // seconds
  explanation?: string;
  hints?: string[];
}

interface StudentResponse {
  questionId: string;
  answer: string;
  timeSpent: number;
  isCorrect: boolean;
  difficulty: number;
  timestamp: number;
}

interface AdaptiveQuizProps {
  courseId: string;
  moduleId: string;
  contentBlockId: string;
  questionPool: AdaptiveQuestion[];
  targetQuestions?: number;
  passingScore?: number;
  timeLimit?: number; // minutes
  onComplete: (results: QuizResults) => void;
}

interface QuizResults {
  score: number;
  totalQuestions: number;
  timeSpent: number;
  difficultyProgression: number[];
  responses: StudentResponse[];
  estimatedAbility: number;
  topicPerformance: Record<string, number>;
}

export default function AdaptiveQuiz({
  courseId,
  moduleId,
  contentBlockId,
  questionPool,
  targetQuestions = 10,
  passingScore = 70,
  timeLimit,
  onComplete
}: AdaptiveQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedQuestions, setSelectedQuestions] = useState<AdaptiveQuestion[]>([]);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [estimatedAbility, setEstimatedAbility] = useState(3); // Start at medium difficulty
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const { trackEvent } = useAnalytics();

  // Item Response Theory (IRT) parameters
  const calculateAbility = useCallback((responses: StudentResponse[]) => {
    if (responses.length === 0) return 3;
    
    let totalWeight = 0;
    let weightedSum = 0;
    
    responses.forEach(response => {
      const weight = 1; // Could be based on question discrimination
      const performance = response.isCorrect ? 1 : 0;
      const difficultyAdjustment = response.difficulty / 5; // Normalize to 0-1
      
      weightedSum += weight * (performance + difficultyAdjustment);
      totalWeight += weight;
    });
    
    const rawAbility = weightedSum / totalWeight;
    return Math.max(1, Math.min(5, rawAbility * 5));
  }, []);

  // Select next question based on current ability estimate
  const selectNextQuestion = useCallback((ability: number, usedQuestions: string[]) => {
    const availableQuestions = questionPool.filter(q => !usedQuestions.includes(q.id));
    
    if (availableQuestions.length === 0) return null;
    
    // Find questions closest to current ability level
    const targetDifficulty = Math.round(ability);
    const sortedByDifficulty = availableQuestions.sort((a, b) => {
      const diffA = Math.abs(a.difficulty - targetDifficulty);
      const diffB = Math.abs(b.difficulty - targetDifficulty);
      return diffA - diffB;
    });
    
    // Add some randomness to prevent predictable patterns
    const topCandidates = sortedByDifficulty.slice(0, Math.min(3, sortedByDifficulty.length));
    return topCandidates[Math.floor(Math.random() * topCandidates.length)];
  }, [questionPool]);

  // Initialize quiz
  useEffect(() => {
    const firstQuestion = selectNextQuestion(estimatedAbility, []);
    if (firstQuestion) {
      setSelectedQuestions([firstQuestion]);
      setStartTime(Date.now());
      setQuestionStartTime(Date.now());
      
      if (timeLimit) {
        setTimeRemaining(timeLimit * 60);
      }
      
      trackEvent('adaptive_quiz_started', {
        courseId,
        moduleId,
        contentBlockId,
        targetQuestions,
        estimatedStartingAbility: estimatedAbility
      });
    }
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || isComplete) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining, isComplete]);

  const handleTimeUp = () => {
    if (!isComplete) {
      completeQuiz();
    }
  };

  const submitAnswer = () => {
    const currentQuestion = selectedQuestions[currentQuestionIndex];
    if (!currentQuestion || !currentAnswer.trim()) return;
    
    const timeSpent = Date.now() - questionStartTime;
    const isCorrect = checkAnswer(currentQuestion, currentAnswer);
    
    const response: StudentResponse = {
      questionId: currentQuestion.id,
      answer: currentAnswer,
      timeSpent,
      isCorrect,
      difficulty: currentQuestion.difficulty,
      timestamp: Date.now()
    };
    
    const newResponses = [...responses, response];
    setResponses(newResponses);
    
    // Update ability estimate
    const newAbility = calculateAbility(newResponses);
    setEstimatedAbility(newAbility);
    
    trackEvent('adaptive_question_answered', {
      courseId,
      moduleId,
      contentBlockId,
      questionId: currentQuestion.id,
      isCorrect,
      difficulty: currentQuestion.difficulty,
      timeSpent,
      newAbilityEstimate: newAbility
    });
    
    setShowExplanation(true);
  };

  const checkAnswer = (question: AdaptiveQuestion, answer: string): boolean => {
    if (Array.isArray(question.correctAnswer)) {
      return question.correctAnswer.some(correct => 
        answer.toLowerCase().trim() === correct.toLowerCase().trim()
      );
    }
    return answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
  };

  const nextQuestion = () => {
    setShowExplanation(false);
    setCurrentAnswer('');
    
    if (responses.length >= targetQuestions) {
      completeQuiz();
      return;
    }
    
    const usedQuestionIds = selectedQuestions.map(q => q.id);
    const nextQ = selectNextQuestion(estimatedAbility, usedQuestionIds);
    
    if (!nextQ) {
      completeQuiz();
      return;
    }
    
    setSelectedQuestions(prev => [...prev, nextQ]);
    setCurrentQuestionIndex(prev => prev + 1);
    setQuestionStartTime(Date.now());
  };

  const completeQuiz = () => {
    const totalTime = Date.now() - startTime;
    const correctAnswers = responses.filter(r => r.isCorrect).length;
    const score = Math.round((correctAnswers / responses.length) * 100);
    
    // Calculate topic performance
    const topicPerformance: Record<string, number> = {};
    const topicCounts: Record<string, number> = {};
    
    responses.forEach(response => {
      const question = questionPool.find(q => q.id === response.questionId);
      if (question) {
        if (!topicPerformance[question.topic]) {
          topicPerformance[question.topic] = 0;
          topicCounts[question.topic] = 0;
        }
        topicPerformance[question.topic] += response.isCorrect ? 1 : 0;
        topicCounts[question.topic]++;
      }
    });
    
    Object.keys(topicPerformance).forEach(topic => {
      topicPerformance[topic] = Math.round((topicPerformance[topic] / topicCounts[topic]) * 100);
    });
    
    const results: QuizResults = {
      score,
      totalQuestions: responses.length,
      timeSpent: totalTime,
      difficultyProgression: responses.map(r => r.difficulty),
      responses,
      estimatedAbility,
      topicPerformance
    };
    
    // Persist quiz progress and completion status
    (async () => {
      try {
        await fetch('/api/learning/progress/update-self', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            moduleId,
            contentBlockId,
            update: {
              quizProgress: {
                score,
                maxScore: 100,
                attempts: 1,
                lastAttemptAt: new Date().toISOString(),
              },
              status: score >= passingScore ? 'completed' : 'in-progress',
              completedAt: score >= passingScore ? new Date().toISOString() : undefined,
            },
          }),
        });
      } catch {}
      // For compatibility, mark as completed via legacy endpoint when passed
      if (score >= passingScore) {
        try {
          await fetch('/api/learning/progress/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId, moduleId, contentBlockId }),
          });
        } catch {}
        try { window.dispatchEvent(new CustomEvent('module-unlock')); } catch {}
      }
    })();

    setIsComplete(true);
    onComplete(results);
    
    trackEvent('adaptive_quiz_completed', {
      courseId,
      moduleId,
      contentBlockId,
      score,
      totalQuestions: responses.length,
      timeSpent: totalTime,
      finalAbilityEstimate: estimatedAbility,
      passed: score >= passingScore
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = selectedQuestions[currentQuestionIndex];
  const progress = ((responses.length) / targetQuestions) * 100;

  if (isComplete) {
    const score = Math.round((responses.filter(r => r.isCorrect).length / responses.length) * 100);
    const passed = score >= passingScore;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {passed ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
            Quiz Complete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">{score}%</div>
            <Badge variant={passed ? "default" : "destructive"} className="mb-4">
              {passed ? "Passed" : "Failed"}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Correct Answers: {responses.filter(r => r.isCorrect).length}/{responses.length}</div>
            <div>Time Spent: {formatTime(Math.floor((Date.now() - startTime) / 1000))}</div>
            <div>Final Ability: {estimatedAbility.toFixed(1)}/5.0</div>
            <div>Avg Difficulty: {(responses.reduce((sum, r) => sum + r.difficulty, 0) / responses.length).toFixed(1)}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Progress and Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="text-sm font-medium">Adaptive Quiz</span>
            </div>
            {timeRemaining !== null && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-mono">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
          
          <Progress value={progress} className="mb-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Question {responses.length + 1} of {targetQuestions}</span>
            <span>Ability: {estimatedAbility.toFixed(1)}/5.0</span>
          </div>
          
          <div className="flex items-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span>Difficulty: {currentQuestion.difficulty}/5</span>
            </div>
            <div className="flex items-center gap-1">
              {estimatedAbility > 3 ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
              <span>Performance: {responses.length > 0 ? Math.round((responses.filter(r => r.isCorrect).length / responses.length) * 100) : 0}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{currentQuestion.topic}</Badge>
            <Badge variant="secondary">~{Math.ceil(currentQuestion.timeEstimate / 60)} min</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showExplanation ? (
            <>
              {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                <RadioGroup value={currentAnswer} onValueChange={setCurrentAnswer}>
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              
              {currentQuestion.type === 'true_false' && (
                <RadioGroup value={currentAnswer} onValueChange={setCurrentAnswer}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="true" />
                    <Label htmlFor="true" className="cursor-pointer">True</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="false" />
                    <Label htmlFor="false" className="cursor-pointer">False</Label>
                  </div>
                </RadioGroup>
              )}
              
              {(currentQuestion.type === 'short_answer' || currentQuestion.type === 'essay') && (
                <Textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Enter your answer..."
                  className={currentQuestion.type === 'essay' ? 'min-h-32' : ''}
                />
              )}
              
              <Button 
                onClick={submitAnswer} 
                disabled={!currentAnswer.trim()}
                className="w-full"
              >
                Submit Answer
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  {responses[responses.length - 1]?.isCorrect ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">
                    {responses[responses.length - 1]?.isCorrect ? 'Correct!' : 'Incorrect'}
                  </span>
                </div>
                
                {!responses[responses.length - 1]?.isCorrect && (
                  <div className="text-sm text-muted-foreground mb-2">
                    Correct answer: {Array.isArray(currentQuestion.correctAnswer) 
                      ? currentQuestion.correctAnswer.join(' or ') 
                      : currentQuestion.correctAnswer}
                  </div>
                )}
                
                {currentQuestion.explanation && (
                  <div className="text-sm">{currentQuestion.explanation}</div>
                )}
              </div>
              
              <Button onClick={nextQuestion} className="w-full">
                {responses.length >= targetQuestions ? 'Complete Quiz' : 'Next Question'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
