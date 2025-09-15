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
  completed?: boolean; // whether this block is already completed
  moduleCompleted?: boolean; // whether module is already completed (server-side)
  studentId?: string; // current logged-in student id for per-user persistence
};

export default function VideoBlock({ src, poster, courseId, moduleId, contentBlockId, required, requiredPercent = 0.8, completed = false, moduleCompleted = false, studentId }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [firedComplete, setFiredComplete] = useState(false);
  const isDrivePreview = /https?:\/\/drive\.google\.com\/.+\/preview/.test(src);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [unlockProgress, setUnlockProgress] = useState<number>(0); // 0..1 toward required threshold
  const isHlsManifest = /\.m3u8(\?.*)?$/i.test(src);
  const isTsFile = /\.ts(\?.*)?$/i.test(src);
  const [tsDirectFallback, setTsDirectFallback] = useState(false);
  const [allowSeek, setAllowSeek] = useState<boolean>(Boolean(completed || moduleCompleted));
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const storageKey = (suffix: string) => `lsf:video:${studentId || 'anon'}:${courseId}:${moduleId}:${contentBlockId}:${suffix}`;
  const lastSavedRef = useRef<number>(-1);
  const lastBeatAtRef = useRef<number>(0);
  const normalizedRequired = (() => {
    const p = Number(requiredPercent);
    if (!Number.isFinite(p) || p <= 0) return 0;
    return p > 1 ? Math.min(1, p / 100) : Math.min(1, p);
  })();

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
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

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
      // send heartbeat at most once per minute
      try {
        const now = Date.now();
        if (!lastBeatAtRef.current || now - lastBeatAtRef.current >= 60000) {
          lastBeatAtRef.current = now;
          await fetch('/api/learning/progress/update-self', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId, moduleId, contentBlockId, update: { videoProgress: { watchedDuration: Math.floor(v.currentTime), totalDuration: Math.floor(v.duration), lastPosition: Math.floor(v.currentTime) } } })
          });
        }
      } catch {}

      if (required && !firedComplete && percent >= normalizedRequired) {
        setFiredComplete(true);
        setAllowSeek(true);
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
      // Restore last saved position for this student if available
      try {
        const saved = Number(localStorage.getItem(storageKey('lastPosition')) || '0');
        if (Number.isFinite(saved) && saved > 0 && saved < v.duration) {
          // Jump to saved and set boundaries so guard doesn't snap back
          v.currentTime = saved;
     
        }
      } catch {}
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
    // Also listen to a global module unlock event to allow seeking immediately
    const onModuleUnlock = () => setAllowSeek(true);
    try { window.addEventListener('module-unlock', onModuleUnlock as any); } catch {}
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);

    // Save playback position every 500ms (0.5s resolution)
    const saveInterval = window.setInterval(() => {
      try {
        if (!v || !Number.isFinite(v.currentTime) || !Number.isFinite(v.duration)) return;
        const pos = Math.round(v.currentTime * 2) / 2; // nearest 0.5s
        if (pos !== lastSavedRef.current) {
          localStorage.setItem(storageKey('lastPosition'), String(pos));
          localStorage.setItem(storageKey('totalDuration'), String(Math.round((v.duration || 0) * 2) / 2));
          lastSavedRef.current = pos;
        }
      } catch {}
    }, 500);
    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
      v.removeEventListener('ended', onEnded);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      try { window.removeEventListener('module-unlock', onModuleUnlock as any); } catch {}
      try { window.clearInterval(saveInterval); } catch {}
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
  }, [courseId, moduleId, contentBlockId, required, normalizedRequired, firedComplete, isDrivePreview, isHlsManifest, isTsFile, src, allowSeek]);

  // Removed JS seek-lock and double-tap handlers per CSS-only approach

  // If server indicates completion initially (block or module), allow seeking immediately
  useEffect(() => {
    if (completed || moduleCompleted) setAllowSeek(true);
  }, [completed, moduleCompleted]);

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
      <div className={`relative w-full rounded-2xl overflow-hidden bg-black ${!allowSeek ? 'no-timeline' : ''}`}>
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/10" />
        <video
          ref={videoRef}
          controls
          poster={poster}
          className="w-full aspect-video object-contain bg-black"
          playsInline
          crossOrigin="anonymous"
          controlsList="nodownload"
          disablePictureInPicture
        >
          {!isHlsManifest && !isTsFile && (
            <source src={src} />
          )}
          {!isHlsManifest && isTsFile && tsDirectFallback && (
            <source src={src} type="video/mp2t" />
          )}
          {/* Optional fallback text */}
          Your browser does not support the video tag.
        </video>

        

        {/* Subtle bottom gradient for aesthetics */}
      </div>

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
