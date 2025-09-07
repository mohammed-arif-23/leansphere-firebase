"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type BlockInfo = {
  id: string; // contentBlockId
  elementId: string; // DOM element id (e.g., block-<id>)
  type: string;
  required: boolean;
};

type Props = {
  courseId: string;
  moduleId: string;
  blocks: BlockInfo[];
  initiallyCompletedIds: string[];
};

export default function ModuleProgressClient({ courseId, moduleId, blocks, initiallyCompletedIds }: Props) {
  const completed = useRef<Set<string>>(new Set(initiallyCompletedIds));
  const [activeId, setActiveId] = useState<string | null>(null);
  const timeSpent = useRef<Map<string, number>>(new Map());
  const lastTick = useRef<number>(Date.now());
  const tickingId = useRef<number | null>(null);
  const storageKey = `lastActiveBlock:${courseId}:${moduleId}`;
  const retryTimer = useRef<number | null>(null);
  const pendingQueue = useRef<Array<{ id: string; update: any }>>([]);

  const sendUpdate = (id: string, update: any) => {
    pendingQueue.current.push({ id, update });
    const attempt = async (delay = 0) => {
      if (retryTimer.current) window.clearTimeout(retryTimer.current);
      retryTimer.current = window.setTimeout(async () => {
        const payloads = pendingQueue.current.splice(0, pendingQueue.current.length);
        if (payloads.length === 0) return;
        try {
          await Promise.all(payloads.map(p => fetch('/api/learning/progress/update-self', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId, moduleId, contentBlockId: p.id, update: p.update })
          })));
        } catch {
          // requeue and backoff
          pendingQueue.current.unshift(...payloads);
          attempt(Math.min((delay || 500) * 2, 8000));
        }
      }, delay);
    };
    attempt(0);
  };

  const requiredQueue = useMemo(() => blocks.filter(b => b.required).map(b => b.id), [blocks]);

  // Intersection observer to detect active block
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) {
        setActiveId(visible[0].target.id.replace('block-', ''));
      }
    }, { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.1, 0.25, 0.5] });

    blocks.forEach(b => {
      const el = document.getElementById(b.elementId);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [blocks]);

  // Smart resume: on mount, scroll to ?block=... or last active from localStorage
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const qblock = url.searchParams.get('block');
      const targetId = qblock || localStorage.getItem(storageKey) || '';
      if (targetId) {
        const el = document.getElementById('block-' + targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch {}
  }, []);

  // Mark text/image blocks as completed when first in view
  useEffect(() => {
    if (!activeId) return;
    const block = blocks.find(b => b.id === activeId);
    if (!block) return;
    try { localStorage.setItem(storageKey, activeId); } catch {}
    const isSimple = block.type === 'text' || block.type === 'image' || block.type === 'bullets' || block.type === 'markdown';
    if (isSimple && !completed.current.has(block.id)) {
      completed.current.add(block.id);
      // update chip UI
      updateChip(block.id, true);
      // mark completed in DB
      sendUpdate(block.id, { status: 'completed', completedAt: new Date().toISOString() });
      // fire lightweight analytics
      try { navigator.sendBeacon?.('/api/analytics/track', JSON.stringify({ type: 'viewed', courseId, moduleId, contentBlockId: block.id })); } catch {}
    }
  }, [activeId, blocks, courseId, moduleId]);

  // Autosave time spent on the current visible block
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const dt = Math.max(0, Math.round((now - lastTick.current) / 1000));
      lastTick.current = now;
      if (activeId) {
        const prev = timeSpent.current.get(activeId) || 0;
        timeSpent.current.set(activeId, prev + dt);
      }
    };

    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [activeId]);

  // Flush time spent every 10s to server for the active block
  useEffect(() => {
    const flush = () => {
      const id = activeId;
      if (!id) return;
      const seconds = timeSpent.current.get(id) || 0;
      if (seconds <= 0) return;
      timeSpent.current.set(id, 0);
      sendUpdate(id, { timeSpent: seconds });
    };
    const h = window.setInterval(flush, 10000);
    return () => window.clearInterval(h);
  }, [activeId, courseId, moduleId]);

  // Listen for unlock events and auto-scroll to next required block that isn't completed
  useEffect(() => {
    const onUnlock = () => {
      const nextId = requiredQueue.find(id => !completed.current.has(id));
      if (!nextId) return;
      const el = document.getElementById('block-' + nextId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // also update chip if this was completed client-side elsewhere
      updateChip(nextId, true);
    };
    window.addEventListener('module-unlock', onUnlock);
    return () => window.removeEventListener('module-unlock', onUnlock);
  }, [requiredQueue]);

  // Helper to update per-block chip UI
  const updateChip = (id: string, done: boolean) => {
    try {
      const chip = document.getElementById('chip-' + id);
      if (!chip) return;
      chip.textContent = done ? 'Completed' : 'In progress';
      chip.className = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs ' + (done ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700');
    } catch {}
  };

  return null;
}
