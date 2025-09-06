
'use client';

import { useState } from 'react';
import type { Module } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, ArrowRight, RefreshCw, Trophy } from 'lucide-react';
import { Progress } from '../ui/progress';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface QuizProps {
  module: Module;
}

export function Quiz({ module }: QuizProps) {
  const { toast } = useToast();
  const questions = module.quiz ?? [];
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizFinished, setIsQuizFinished] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isCorrect = selectedOptionId === currentQuestion?.correctOptionId;

  const handleCheckAnswer = () => {
    if (!selectedOptionId) {
      toast({
        variant: 'destructive',
        title: 'No answer selected',
        description: 'Please select an option before checking.',
      });
      return;
    }
    setIsAnswered(true);
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOptionId(null);
      setIsAnswered(false);
    } else {
      setIsQuizFinished(true);
      // Here you would typically report the score to the backend
      // fetch('/api/learning/progress/update', { ... });
      toast({
        title: 'Quiz Complete!',
        description: `You scored ${score + (isCorrect ? 1 : 0)} out of ${questions.length}.`,
      });
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOptionId(null);
    setIsAnswered(false);
    setScore(0);
    setIsQuizFinished(false);
  };

  if (!currentQuestion) {
    return <Card><CardHeader><CardTitle>Quiz Error</CardTitle></CardHeader><CardContent>No questions found for this quiz.</CardContent></Card>;
  }

  if (isQuizFinished) {
    const finalScore = score;
    const totalQuestions = questions.length;
    const percentage = (finalScore / totalQuestions) * 100;

    return (
        <Card className="text-center">
            <CardHeader>
                <CardTitle>Quiz Completed!</CardTitle>
                <CardDescription>You have finished the quiz for "{module.title}".</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Trophy className="mx-auto h-24 w-24 text-amber-500" />
                <p className="text-2xl font-bold">Your Score: {finalScore} / {totalQuestions}</p>
                <div className="w-full max-w-sm mx-auto">
                   <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Overall Score</span>
                        <span>{Math.round(percentage)}%</span>
                    </div>
                    <Progress value={percentage} className="h-4" />
                </div>
                 <p className="text-muted-foreground">
                    {percentage >= 80 ? "Excellent work!" : "Good effort, try again to improve your score!"}
                </p>
            </CardContent>
            <CardFooter className="justify-center">
                <Button onClick={handleRestartQuiz}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retake Quiz
                </Button>
            </CardFooter>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
           <CardTitle>Knowledge Check</CardTitle>
            <div className="text-sm text-muted-foreground font-medium">
                Question {currentQuestionIndex + 1} of {questions.length}
            </div>
        </div>
         <Progress value={((currentQuestionIndex) / questions.length) * 100} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-lg font-semibold">{currentQuestion.question}</p>
        <RadioGroup
          value={selectedOptionId ?? ''}
          onValueChange={setSelectedOptionId}
          disabled={isAnswered}
        >
          {currentQuestion.options.map((option) => {
             const isThisOptionCorrect = option.id === currentQuestion.correctOptionId;
             const isThisOptionSelected = option.id === selectedOptionId;
            return (
              <Label
                key={option.id}
                htmlFor={option.id}
                className={cn(
                  "flex items-center space-x-3 p-4 border rounded-md transition-all cursor-pointer",
                  "hover:border-primary",
                  isAnswered && isThisOptionCorrect && "border-green-500 bg-green-500/10",
                  isAnswered && !isThisOptionCorrect && isThisOptionSelected && "border-red-500 bg-red-500/10",
                  isAnswered && !isThisOptionCorrect && "text-muted-foreground"
                )}
              >
                <RadioGroupItem value={option.id} id={option.id} />
                <span>{option.text}</span>
                 {isAnswered && isThisOptionCorrect && <CheckCircle className="ml-auto h-5 w-5 text-green-500" />}
                 {isAnswered && !isThisOptionCorrect && isThisOptionSelected && <XCircle className="ml-auto h-5 w-5 text-red-500" />}
              </Label>
            )
          })}
        </RadioGroup>
      </CardContent>
      <CardFooter>
        {isAnswered ? (
          <Button onClick={handleNextQuestion} className="w-full">
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleCheckAnswer} className="w-full">
            Check Answer
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
