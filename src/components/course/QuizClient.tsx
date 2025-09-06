"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type QuizOption = { id: string; text: string };

type QuizQuestion = {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank';
  options?: QuizOption[];
  correctOptionId?: string;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  points?: number;
};

type Quiz = {
  questions: QuizQuestion[];
  passingScore: number;
  allowRetakes?: boolean;
  maxAttempts?: number;
};

type Props = { quiz: Quiz; courseId?: string; moduleId?: string; contentBlockId?: string; onPass?: () => void };

export default function QuizClient({ quiz, courseId, moduleId, contentBlockId, onPass }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const totalPoints = useMemo(() => {
    return (quiz.questions || []).reduce((acc, q) => acc + (q.points || 1), 0);
  }, [quiz]);

  const onSubmit = async () => {
    let s = 0;
    for (const q of quiz.questions || []) {
      const ans = (answers[q.id] || '').trim();
      if (q.type === 'multiple-choice' || q.type === 'true-false') {
        if (q.correctOptionId && ans === q.correctOptionId) s += (q.points || 1);
      } else if (q.type === 'fill-blank') {
        // For now, treat correctOptionId as expected text (case-insensitive)
        if (q.correctOptionId && ans.toLowerCase() === q.correctOptionId.toLowerCase()) s += (q.points || 1);
      }
    }
    setScore(s);
    setSubmitted(true);
    const passed = s >= (quiz.passingScore || 0);
    if (passed && courseId && moduleId && contentBlockId) {
      try {
        await fetch('/api/learning/progress/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, moduleId, contentBlockId })
        });
      } catch {}
      try { window.dispatchEvent(new CustomEvent('module-unlock')); } catch {}
      onPass && onPass();
    }
  };

  const canRetake = quiz.allowRetakes !== false;

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {(quiz.questions || []).map((q) => (
          <div key={q.id} className="space-y-2">
            <div className="font-medium">{q.question}</div>
            {q.type !== 'fill-blank' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(q.options || []).map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 border rounded p-2 cursor-pointer">
                    <input
                      type="radio"
                      className="h-4 w-4"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === opt.id}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                      disabled={submitted}
                    />
                    <span>{opt.text}</span>
                  </label>
                ))}
              </div>
            )}
            {q.type === 'fill-blank' && (
              <div>
                <Label>Your answer</Label>
                <Input
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  disabled={submitted}
                />
              </div>
            )}
            {submitted && q.explanation && (
              <div className="text-sm text-muted-foreground">Explanation: {q.explanation}</div>
            )}
          </div>
        ))}

        {!submitted ? (
          <div className="flex justify-end">
            <Button onClick={onSubmit} className="bg-accent text-accent-foreground hover:bg-accent/90">Submit</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm">Score: {score} / {totalPoints} {score >= quiz.passingScore ? '✓ Passed' : '✗ Not Passed'}</div>
            {canRetake && (
              <Button variant="outline" onClick={() => { setAnswers({}); setSubmitted(false); setScore(0); }}>Retake</Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
