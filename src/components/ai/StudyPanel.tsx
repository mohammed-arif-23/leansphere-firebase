"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Lightbulb } from "lucide-react";

export default function StudyPanel({ courseId, moduleId, contextTitle }: { courseId: string; moduleId: string; contextTitle?: string; }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  // Only Ask AI and Hints are supported.

  useEffect(() => {
    if (!cooldown) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const runCooldown = () => setCooldown(3);

  const askAI = async () => {
    try {
      setLoading(true);
      setError(null);
      setAnswer(null);
      
      // Analytics hook for AI ask interaction
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'ai_ask', {
          course_id: courseId,
          module_id: moduleId,
          context: contextTitle
        });
      }
      
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: contextTitle || '' }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to get answer');
      setAnswer(json.answer);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
      runCooldown();
    }
  };

  const getHint = async () => {
    try {
      setLoading(true);
      setError(null);
      setHint(null);
      
      // Analytics hook for AI hint interaction
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'ai_hint', {
          course_id: courseId,
          module_id: moduleId,
          context: contextTitle
        });
      }
      
      const res = await fetch('/api/ai/hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '', assignmentPrompt: contextTitle || 'Lesson', programmingLanguage: 'javascript' }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to get hint');
      setHint(json.hint);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
      runCooldown();
    }
  };

  // Summary removed per request.

  return (
    <Card className="rounded-xl border bg-card" role="region" aria-labelledby="ai-assistant-title">
      <CardHeader>
        <CardTitle id="ai-assistant-title" className="text-lg">AI Assistant</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-3">
          Ask concise questions or request a small hint for the current lesson.
        </div>
        <Tabs defaultValue="ask" className="w-full" aria-labelledby="ai-assistant-title">
          <TabsList className="grid grid-cols-2 w-full" role="tablist" aria-label="Study assistant options">
            <TabsTrigger 
              value="ask" 
              className="gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2" 
              role="tab"
              aria-controls="ask-panel"
              aria-selected="true"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Ask AI
            </TabsTrigger>
            <TabsTrigger 
              value="hints" 
              className="gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2" 
              role="tab"
              aria-controls="hints-panel"
              aria-selected="false"
            >
              <Lightbulb className="h-4 w-4" aria-hidden="true" /> Hints
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ask" className="mt-3" role="tabpanel" id="ask-panel" aria-labelledby="ask-tab">
            <div className="space-y-3">
              <Textarea
                placeholder={`Ask about: ${contextTitle || "this lesson"}`}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                aria-label={`Ask a question about ${contextTitle || "this lesson"}`}
                aria-describedby="ask-instructions"
              />
              <div id="ask-instructions" className="sr-only">
                Type your question and press the Ask button to get an AI-powered answer
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="flex gap-2 w-full">
                <Button 
                  onClick={askAI} 
                  disabled={loading || !question.trim() || cooldown > 0} 
                  aria-label="Submit question to AI assistant"
                  aria-describedby={cooldown > 0 ? "cooldown-timer" : undefined}
                >
                  {loading ? "Thinking..." : "Ask"}
                </Button>
                {cooldown > 0 && (
                  <div id="cooldown-timer" className="text-xs text-muted-foreground flex items-center" aria-live="polite">
                    {cooldown}s cooldown remaining
                  </div>
                )}
                </div>
                <div className="flex gap-2 text-xs" role="group" aria-label="Quick question templates">
                  <Button type="button" variant="outline" onClick={() => setQuestion(`Explain: ${contextTitle || 'this lesson'} in simple terms`)}>Explain</Button>
                  <Button type="button" variant="outline" onClick={() => setQuestion(`Give a short example related to ${contextTitle || 'this lesson'}`)}>Example</Button>
                  <Button type="button" variant="outline" onClick={() => setQuestion(`Common mistakes in ${contextTitle || 'this topic'}`)}>Mistakes</Button>
                </div>
              </div>
              {answer && (
                <div className="rounded-md border p-3 bg-card" role="region" aria-labelledby="answer-heading">
                  <h4 id="answer-heading" className="sr-only">AI Answer</h4>
                  <p className="text-sm whitespace-pre-wrap">{answer}</p>
                </div>
              )}
              {error && (
                <div className="rounded-md border p-3 bg-card" role="alert" aria-labelledby="error-heading">
                  <h4 id="error-heading" className="sr-only">Error</h4>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="hints" className="mt-3" role="tabpanel" id="hints-panel" aria-labelledby="hints-tab">
            <div className="space-y-3">
              <Button 
                variant="outline" 
                onClick={getHint} 
                disabled={loading || cooldown > 0} 
                aria-label="Get a smart hint for the current lesson"
                aria-describedby={cooldown > 0 ? "hint-cooldown-timer" : "hint-instructions"}
              >
                {loading ? "Preparing hint..." : "Get smart hint"}
              </Button>
              <div id="hint-instructions" className="sr-only">
                Click to get a helpful hint about the current lesson content
              </div>
              {cooldown > 0 && (
                <div id="hint-cooldown-timer" className="text-xs text-muted-foreground" aria-live="polite">
                  {cooldown}s cooldown remaining
                </div>
              )}
              {hint && (
                <div className="rounded-md border p-3 bg-card" role="region" aria-labelledby="hint-heading">
                  <h4 id="hint-heading" className="sr-only">Smart Hint</h4>
                  <p className="text-sm">{hint}</p>
                </div>
              )}
              {error && (
                <div className="rounded-md border p-3 bg-card" role="alert" aria-labelledby="hint-error-heading">
                  <h4 id="hint-error-heading" className="sr-only">Error</h4>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Simplified per request: only Ask AI and Hints are available.
