"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pause, Play, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ModuleTimerProps {
  // Uncontrolled countdown mode (defaults):
  seconds?: number; // initial seconds
  // Controlled display mode (video-driven):
  remainingSeconds?: number; // if provided, shows this remaining time (mm:ss)
  progressPercent?: number; // 0..100 overrides computed percent
  showControls?: boolean; // hide/play/pause/reset controls when false
  title?: string;
  compact?: boolean; // compact display: no border, no percent ring, left label + right timer
}

export default function ModuleTimer({ seconds = 60, remainingSeconds, progressPercent, showControls = true, title = "Focus timer", compact = false }: ModuleTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const [NumberFlowComp, setNumberFlowComp] = useState<null | ((props: any) => JSX.Element)>(null);
  const computedPercent = useMemo(() => {
    if (typeof progressPercent === 'number') return Math.max(0, Math.min(100, progressPercent));
    return Math.max(0, Math.min(100, (remaining / seconds) * 100));
  }, [progressPercent, remaining, seconds]);

  useEffect(() => {
    // Skip internal ticking when in controlled mode
    if (typeof remainingSeconds === 'number') return;
    if (paused) return;
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [paused, remaining, remainingSeconds]);

  // Try to lazily load NumberFlow for nicer digit animations; fallback if not installed
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod: any = await import("@number-flow/react");
        if (!cancelled) setNumberFlowComp(() => (mod?.default || mod?.NumberFlow));
      } catch {
        // keep fallback
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const baseRemaining = typeof remainingSeconds === 'number' ? Math.max(0, Math.floor(remainingSeconds)) : remaining;
  const mm = String(Math.floor(baseRemaining / 60)).padStart(2, "0");
  const ss = String(baseRemaining % 60).padStart(2, "0");

  const reset = () => setRemaining(seconds);
  const toggle = () => setPaused((p) => !p);

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase text-muted-foreground">{title}</div>
        <div className="text-xl font-semibold tabular-nums">
          {NumberFlowComp ? (
            <div className="flex items-baseline gap-1">
              <span className="inline-flex">
                <NumberFlowComp value={Number(mm[0])} />
                <NumberFlowComp value={Number(mm[1])} />
              </span>
              <span>:</span>
              <span className="inline-flex">
                <NumberFlowComp value={Number(ss[0])} />
                <NumberFlowComp value={Number(ss[1])} />
              </span>
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={baseRemaining}
                initial={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                transition={{ duration: 0.18 }}
              >
                {mm}:{ss}
              </motion.span>
            </AnimatePresence>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="rounded-2xl border bg-card/80 backdrop-blur">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-8 ">
            {/* Progress Ring */}
            <div
              className="relative h-14 w-14 shrink-0 rounded-full"
              style={{
                background: `conic-gradient(var(--primary) ${computedPercent * 3.6}deg, hsl(var(--muted)) 0)`,
              }}
              aria-label={`Timer progress ${Math.round(computedPercent)}%`}
            >
              <div className="absolute inset-1 rounded-full bg-background/90" />
              <div className="absolute inset-0 grid place-items-center text-sm font-semibold">
                {Math.round(computedPercent)}%
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">{title}</div>
              <div className="mt-0.5 text-2xl font-bold tabular-nums">
                {NumberFlowComp ? (
                  <div className="flex items-baseline gap-1">
                    <span className="inline-flex">
                      <NumberFlowComp value={Number(mm[0])} />
                      <NumberFlowComp value={Number(mm[1])} />
                    </span>
                    <span>:</span>
                    <span className="inline-flex">
                      <NumberFlowComp value={Number(ss[0])} />
                      <NumberFlowComp value={Number(ss[1])} />
                    </span>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={baseRemaining}
                      initial={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                      transition={{ duration: 0.18 }}
                    >
                      {mm}:{ss}
                    </motion.span>
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
          {showControls && (
            <div className="flex items-center gap-2">
              <Button size="icon" variant="default" className="rounded-full" onClick={toggle} aria-label={paused ? "Resume" : "Pause"}>
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="secondary" className="rounded-full" onClick={reset} aria-label="Reset">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
