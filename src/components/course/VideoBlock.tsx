"use client";

import { useEffect, useRef, useState } from "react";
import ModuleTimer from '@/components/course/ModuleTimer';

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
  const [unlockProgress, setUnlockProgress] = useState<number>(0); // 0..1 toward required threshold
  const isHlsManifest = /\.m3u8(\?.*)?$/i.test(src);
  const isTsFile = /\.ts(\?.*)?$/i.test(src);
  const [tsDirectFallback, setTsDirectFallback] = useState(false);
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
  const fmtClock = (s: number) => {
    const sec = Math.max(0, Math.floor(s));
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const r = (sec % 60).toString().padStart(2, '0');
    return `${m}:${r}`;
  };

  useEffect(() => {
    if (isDrivePreview) {
      // Progress tracking is not available for Google Drive iframe embeds.
      // We keep the gate controlled by other required blocks or manual progression.
      return;
    }
    const v = videoRef.current;
    if (!v) return;

    // Setup HLS playback for .m3u8 URLs when needed
    let hls: any | null = null;
    let hlsDestroyed = false;
    // Setup MPEG-TS playback for standalone .ts via mpegts.js
    let mpegts: any | null = null;
    let mpegtsPlayer: any | null = null;

    const setupHlsIfNeeded = async () => {
      // If browser has native HLS support, let the <video> element handle it
      const canNativeHls = (v.canPlayType('application/vnd.apple.mpegurl') || '').length > 0;
      if (isHlsManifest) {
        if (canNativeHls) {
          // Use native playback (mainly Safari/iOS)
          if (v.src !== src) v.src = src;
          return;
        }
        try {
          const mod = await import('hls.js');
          const Hls = (mod as any).default || (mod as any);
          if (Hls && Hls.isSupported && Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(src);
            hls.attachMedia(v);
          } else {
            // Fallback: try assigning directly; some browsers might still handle certain streams
            if (v.src !== src) v.src = src;
          }
        } catch {
          // If hls.js failed to load, fallback to direct src
          if (v.src !== src) v.src = src;
        }
      } else {
        // Non-HLS sources: regular assignment handled by JSX
      }
    };

    setupHlsIfNeeded();

    const setupMpegTsIfNeeded = async () => {
      if (!isTsFile || isHlsManifest) return;
      // Many browsers cannot play raw .ts directly; try mpegts.js via MSE
      try {
        const mod = await import('mpegts.js');
        mpegts = (mod as any).default || (mod as any);
        if (mpegts && mpegts.isSupported && mpegts.isSupported()) {
          mpegtsPlayer = mpegts.createPlayer({ type: 'mpegts', isLive: false, url: src });
          // If network errors happen (e.g., 404), fall back to direct source rendering
          try {
            mpegtsPlayer.on(mpegts.Events.ERROR, (type: any, detail: any, data: any) => {
              if (type === mpegts.ErrorTypes.NETWORK_ERROR) {
                console.warn('[mpegts.js] network error; falling back to direct <source>', { detail, data });
                setTsDirectFallback(true);
                try { mpegtsPlayer?.destroy?.(); } catch {}
              }
            });
          } catch {}
          mpegtsPlayer.attachMediaElement(v);
          mpegtsPlayer.load();
          // Do not autoplay; respect user gesture policies
          setTsDirectFallback(false);
        } else {
          setTsDirectFallback(true);
        }
      } catch (e) {
        console.warn('[mpegts.js] dynamic import failed; falling back to direct <source>', e);
        // Fall back to direct <source>, which we render below
        setTsDirectFallback(true);
      }
    };

    setupMpegTsIfNeeded();

    const onTimeUpdate = async () => {
      if (!v || !v.duration || Number.isNaN(v.duration) || v.duration === Infinity) return;
      const percent = v.currentTime / v.duration;
      if (required) {
        const targetTime = normalizedRequired * v.duration;
        setRemainingSec(Math.ceil(Math.max(0, targetTime - v.currentTime)));
        setUnlockProgress(Math.max(0, Math.min(1, v.currentTime / targetTime)));
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
        setUnlockProgress(Math.max(0, Math.min(1, v.currentTime / targetTime)));
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
      try {
        if (hls && typeof hls.destroy === 'function' && !hlsDestroyed) {
          hls.destroy();
          hlsDestroyed = true;
        }
      } catch {}
      try {
        if (mpegtsPlayer && typeof mpegtsPlayer.destroy === 'function') {
          mpegtsPlayer.destroy();
          mpegtsPlayer = null;
        }
      } catch {}
    };
  }, [courseId, moduleId, contentBlockId, required, normalizedRequired, firedComplete, isDrivePreview, isHlsManifest, isTsFile, src]);

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
          <div className="mt-3 flex items-center gap-6 justify-between">
            <ModuleTimer title="Required Watch time to Unlock next" compact showControls={false} progressPercent={firedComplete ? 100 : 0} />
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
      {/* For HLS (.m3u8), the src is attached programmatically (hls.js or native). For others, we use <source> elements. */}
      <video
        ref={videoRef}
        controls
        poster={poster}
        className="w-full rounded"
        playsInline
        crossOrigin="anonymous"
      >
        {/* Only render a direct source when not using HLS. For .ts, render only if mpegts.js is unavailable */}
        {!isHlsManifest && !isTsFile && (
          <source src={src} />
        )}
        {!isHlsManifest && isTsFile && tsDirectFallback && (
          <source src={src} type="video/mp2t" />
        )}
        {/* Optional fallback text */}
        Your browser does not support the video tag.
      </video>
      {required && (
        <div className="mt-2">
          <ModuleTimer
            title="Required Watch time to Unlock next"
            compact
            showControls={false}
            remainingSeconds={remainingSec ?? 0}
            progressPercent={Math.round((firedComplete ? 1 : unlockProgress) * 100)}
          />
        </div>
      )}
    </div>
  );
}
