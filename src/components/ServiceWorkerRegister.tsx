"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      const register = async () => {
        try {
          await navigator.serviceWorker.register('/sw.js');
        } catch (e) {
          // noop
        }
      };
      // Delay registration slightly to avoid blocking initial UI
      const t = window.setTimeout(register, 1000);
      return () => window.clearTimeout(t);
    }
  }, []);
  return null;
}
