"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  language: 'java' | 'python' | 'javascript';
  starterCode: string;
  mode: 'illustrative' | 'exam';
  testCases: Array<{ input: string; expectedOutput?: string }>;
  // optional identifiers to mark completion
  courseId?: string;
  moduleId?: string;
  contentBlockId?: string;
  onPass?: () => void;
};

export default function CodeRunnerClient({ language, starterCode, mode, testCases, courseId, moduleId, contentBlockId, onPass }: Props) {
  const storageKeyBase = useMemo(() => {
    const base = `runner:${courseId || 'c'}:${moduleId || 'm'}:${contentBlockId || 'b'}`;
    return base;
  }, [courseId, moduleId, contentBlockId]);
  const [code, setCode] = useState(starterCode || '');
  const [stdin, setStdin] = useState('');
  const [lang, setLang] = useState<Props['language']>(language || 'javascript');
  const saveTimer = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch('/api/code/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'exam' && testCases?.length ? { language: lang, code, testCases } : { language: lang, code, input: stdin })
      });
      const json = await res.json();
      setResult(json);
      // If in exam mode and all tests passed, mark completion
      try {
        if (mode === 'exam' && json?.success) {
          const passed = json.data?.mode === 'batch' ? (json.data.results || []).every((r: any) => r.pass === true) : !!json.data?.stdout && !json.data?.stderr;
          if (passed && courseId && moduleId && contentBlockId) {
            await fetch('/api/learning/progress/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ courseId, moduleId, contentBlockId })
            });
            try { window.dispatchEvent(new CustomEvent('module-unlock')); } catch {}
            onPass && onPass();
          }
        }
      } catch {}
    } finally {
      setRunning(false);
    }
  };

  // Restore persisted state
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem(storageKeyBase + ':lang');
      const savedCode = localStorage.getItem(storageKeyBase + ':code');
      if (savedLang) setLang(savedLang as Props['language']);
      if (savedCode && !starterCode) setCode(savedCode);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKeyBase]);

  // Persist changes (debounced)
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(storageKeyBase + ':lang', String(lang));
        localStorage.setItem(storageKeyBase + ':code', code);
      } catch {}
    }, 400);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [code, lang, storageKeyBase]);

  return (
    <Card className="bg-white">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="p-3 border-r">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Language</div>
              <Select value={lang} onValueChange={(v) => setLang(v as any)}>
                <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea value={code} onChange={(e) => setCode(e.target.value)} className="min-h-[260px] font-mono text-sm" />
            {mode !== 'exam' && (
              <div className="mt-2">
                <div className="text-sm text-muted-foreground mb-1">Standard Input</div>
                <Textarea value={stdin} onChange={(e) => setStdin(e.target.value)} className="min-h-[80px] font-mono text-sm" />
              </div>
            )}
            <div className="mt-2 flex justify-end">
              <Button onClick={run} disabled={running} className="bg-accent text-accent-foreground hover:bg-accent/90">{running ? 'Running...' : 'Run Code'}</Button>
            </div>
          </div>
          <div className="p-3">
            <div className="text-sm text-muted-foreground mb-1">Results</div>
            <div className="rounded border bg-white p-2 min-h-[260px] text-sm font-mono whitespace-pre-wrap">
              {result ? (
                result.success ? (
                  result.data?.mode === 'batch' ? (
                    result.data.results.map((r: any, idx: number) => (
                      <div key={idx} className="mb-2">
                        <div className="text-xs text-muted-foreground">Case {idx + 1}</div>
                        <div>stdout: {r.stdout || ''}</div>
                        {typeof r.pass !== 'undefined' && <div>pass: {String(r.pass)}</div>}
                        {r.expectedOutput && <div>expected: {r.expectedOutput}</div>}
                        {r.stderr && <div className="text-red-600">stderr: {r.stderr}</div>}
                      </div>
                    ))
                  ) : (
                    <>
                      <div>stdout: {result.data.stdout || ''}</div>
                      {result.data.stderr && <div className="text-red-600">stderr: {result.data.stderr}</div>}
                    </>
                  )
                ) : (
                  <div className="text-red-600">{result.error?.message || 'Execution failed'}</div>
                )
              ) : (
                <div className="text-muted-foreground">Run your code to see output.</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
