"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string;
  courseId: string;
  moduleId: string;
  contentBlockId: string;
  required?: boolean;
  requiredPercent?: number; // 0..1
};

export default function VideoBlock({ src, poster, courseId, moduleId, contentBlockId, required, requiredPercent = 0.8 }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [firedComplete, setFiredComplete] = useState(false);
  const isDrivePreview = /https?:\/\/drive\.google\.com\/.+\/preview/.test(src);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const normalizedRequired = (() => {
    const p = Number(requiredPercent);
    if (!Number.isFinite(p) || p <= 0) return 0;
    return p > 1 ? Math.min(1, p / 100) : Math.min(1, p);
  })();

  const fmt = (s: number) => {
    const sec = Math.max(0, Math.floor(s));
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    return m > 0 ? `${m}m ${r}s` : `${r}s`;
  };

  useEffect(() => {
    if (isDrivePreview) {
      // Progress tracking is not available for Google Drive iframe embeds.
      // We keep the gate controlled by other required blocks or manual progression.
      return;
    }
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = async () => {
      if (!v || !v.duration || Number.isNaN(v.duration) || v.duration === Infinity) return;
      const percent = v.currentTime / v.duration;
      if (required) {
        const targetTime = normalizedRequired * v.duration;
        setRemainingSec(Math.ceil(Math.max(0, targetTime - v.currentTime)));
      }
      // send heartbeat occasionally
      try {
        if (Math.floor(v.currentTime) % 10 === 0) {
          await fetch('/api/learning/progress/update-self', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId, moduleId, contentBlockId, update: { videoProgress: { watchedDuration: Math.floor(v.currentTime), totalDuration: Math.floor(v.duration), lastPosition: Math.floor(v.currentTime) } } })
          });
        }
      } catch {}

      if (required && !firedComplete && percent >= normalizedRequired) {
        setFiredComplete(true);
        try {
          await fetch('/api/learning/progress/complete', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId, moduleId, contentBlockId })
          });
          // Update DOM so gating can unlock instantly
          try {
            const el = document.querySelector(`[data-block-id="${contentBlockId}"]`);
            if (el) (el as HTMLElement).setAttribute('data-completed', 'true');
          } catch {}
          try { window.dispatchEvent(new CustomEvent('blockCompleted')); } catch {}
          try { window.dispatchEvent(new CustomEvent('module-unlock')); } catch {}
        } catch {}
      }
    };

    const onLoadedMetadata = () => {
      if (!v || !v.duration || Number.isNaN(v.duration) || v.duration === Infinity) return;
      if (required) {
        const targetTime = normalizedRequired * v.duration;
        setRemainingSec(Math.ceil(Math.max(0, targetTime - v.currentTime)));
      }
    };

    const onEnded = async () => {
      if (!required || firedComplete) return;
      // If ended, we certainly crossed any threshold <= 1.0
      setFiredComplete(true);
      try {
        await fetch('/api/learning/progress/complete', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, moduleId, contentBlockId })
        });
        try {
          const el = document.querySelector(`[data-block-id="${contentBlockId}"]`);
          if (el) (el as HTMLElement).setAttribute('data-completed', 'true');
        } catch {}
        try { window.dispatchEvent(new CustomEvent('blockCompleted')); } catch {}
        try { window.dispatchEvent(new CustomEvent('module-unlock')); } catch {}
        setRemainingSec(0);
      } catch {}
    };

    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('loadedmetadata', onLoadedMetadata);
    v.addEventListener('ended', onEnded);
    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
      v.removeEventListener('ended', onEnded);
    };
  }, [courseId, moduleId, contentBlockId, required, normalizedRequired, firedComplete, isDrivePreview]);

  if (isDrivePreview) {
    const markWatched = async () => {
      if (firedComplete) return;
      try {
        await fetch('/api/learning/progress/complete', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, moduleId, contentBlockId })
        });
        // Update DOM flag so ModuleNextGate sees completion immediately
        try {
          const el = document.querySelector(`[data-block-id="${contentBlockId}"]`);
          if (el) (el as HTMLElement).setAttribute('data-completed', 'true');
        } catch {}
        try { window.dispatchEvent(new CustomEvent('blockCompleted')); } catch {}
        setFiredComplete(true);
        setRemainingSec(0);
      } catch {}
    };

    return (
      <div className="w-full rounded overflow-hidden">
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <iframe
            src={src}
            className="absolute inset-0 h-full w-full rounded"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
        {required && (
          <div className="mt-3">
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm ${firedComplete ? 'bg-green-600 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'}`}
              onClick={markWatched}
              disabled={firedComplete}
            >
              {firedComplete ? 'Marked as watched' : 'Mark as watched'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <video ref={videoRef} controls poster={poster} className="w-full rounded" src={src} />
      {required && !firedComplete && remainingSec !== null && (
        <div className="mt-2 text-xs text-muted-foreground">Watch approximately {fmt(remainingSec)} more to unlock</div>
      )}
    </div>
  );
}
