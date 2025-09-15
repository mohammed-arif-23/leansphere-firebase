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
  const [correctness, setCorrectness] = useState<Record<string, boolean>>({});

  // Normalize quiz data: support admin shape {text, options: string[], correctIndex}
  const normalized = useMemo(() => {
    const srcQs: any[] = Array.isArray(quiz?.questions) ? quiz.questions : [];
    const qs = srcQs.map((q: any, qi: number) => {
      const id = String(q.id || `q-${qi}`);
      const question = String(q.question || q.text || '');
      const type: any = q.type || 'multiple-choice';
      const rawOpts: any[] = Array.isArray(q.options) ? q.options : [];
      const options: QuizOption[] = rawOpts.map((opt: any, oi: number) => ({ id: String(opt?.id || `o-${qi}-${oi}`), text: String(typeof opt === 'string' ? opt : (opt?.text ?? '')) }));
      const correctOptionId: string | undefined = (() => {
        if (q.correctOptionId) return String(q.correctOptionId);
        const idx = Number(q.correctIndex);
        if (Number.isFinite(idx) && idx >= 0 && idx < options.length) return options[idx].id;
        return undefined;
      })();
      const points = Number.isFinite(Number(q.points)) ? Number(q.points) : 1;
      return { id, question, type, options, correctOptionId, explanation: q.explanation, difficulty: q.difficulty, points } as QuizQuestion;
    });
    const totalPoints = qs.reduce((acc, q) => acc + (q.points || 1), 0);
    return { questions: qs, passingScore: Number(quiz?.passingScore) || 0, allowRetakes: quiz?.allowRetakes !== false, maxAttempts: quiz?.maxAttempts, totalPoints } as Quiz & { totalPoints: number };
  }, [quiz]);

  const totalPoints = normalized.totalPoints;

  const onSubmit = async () => {
    let s = 0;
    const corr: Record<string, boolean> = {};
    for (const q of normalized.questions || []) {
      const ans = (answers[q.id] || '').trim();
      if (q.type === 'multiple-choice' || q.type === 'true-false') {
        if (q.correctOptionId && ans === q.correctOptionId) {
          s += (q.points || 1);
          corr[q.id] = true;
        } else {
          corr[q.id] = false;
        }
      } else if (q.type === 'fill-blank') {
        // For now, treat correctOptionId as expected text (case-insensitive)
        if (q.correctOptionId && ans.toLowerCase() === q.correctOptionId.toLowerCase()) {
          s += (q.points || 1);
          corr[q.id] = true;
        } else {
          corr[q.id] = false;
        }
      }
    }
    setScore(s);
    setSubmitted(true);
    setCorrectness(corr);
    const passed = s >= (normalized.passingScore || 0);
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

  const canRetake = normalized.allowRetakes !== false;

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {(normalized.questions || []).map((q) => (
          <div key={q.id} className="space-y-2">
            <div className="font-medium flex items-center gap-2">
              <span>{q.question}</span>
              {submitted && (
                correctness[q.id] ? (
                  <span className="text-green-600 text-xs">Correct</span>
                ) : (
                  <span className="text-red-600 text-xs">Incorrect</span>
                )
              )}
            </div>
            {q.type !== 'fill-blank' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(q.options || []).map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 border rounded p-2 cursor-pointer" aria-label={`Option ${opt.text}`}>
                    <input
                      type="radio"
                      className="h-4 w-4"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === opt.id}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                      disabled={submitted}
                      aria-checked={answers[q.id] === opt.id}
                      aria-labelledby={`label-${q.id}-${opt.id}`}
                    />
                    <span id={`label-${q.id}-${opt.id}`}>{opt.text}</span>
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
                  aria-label="Enter your answer"
                  aria-describedby={`answer-${q.id}`}
                />
                <div id={`answer-${q.id}`} className="text-sm text-muted-foreground mb-1">Type your answer and submit</div>
              </div>
            )}
            {submitted && !correctness[q.id] && q.correctOptionId && (
              <div className="text-sm text-muted-foreground">Correct answer: {q.type === 'fill-blank' ? q.correctOptionId : (q.options || []).find(o => o.id === q.correctOptionId)?.text}</div>
            )}
            {submitted && q.explanation && (
              <div className="text-sm text-muted-foreground">Explanation: {q.explanation}</div>
            )}
          </div>
        ))}

        {!submitted ? (
          <div className="flex justify-end">
            <Button onClick={onSubmit} aria-label="Submit quiz" className="bg-accent text-accent-foreground hover:bg-accent/90 focus:ring-accent focus:ring-2 focus:outline-none">Submit</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm">Score: {score} / {totalPoints} {score >= normalized.passingScore ? '✓ Passed' : '✗ Not Passed'}</div>
            {canRetake && (
              <Button variant="outline" aria-label="Retake quiz" onClick={() => { setAnswers({}); setSubmitted(false); setScore(0); }}>Retake</Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
