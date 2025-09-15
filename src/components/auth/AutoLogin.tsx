"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/hooks/use-toast";

type AutoLoginProps = {
  studentId?: string; // optional: override query param
  redirect?: string;  // optional: override redirect target
};

/**
 * AutoLogin detects a `studentId` query parameter and attempts to auto-login
 * by calling `/api/auth/autologin`. On success, it sets the session cookie and
 * redirects to `redirect` param or home. On failure, it leaves the user on the
 * current page to proceed with normal login.
 */
export default function AutoLogin({ studentId: propStudentId, redirect: propRedirect }: AutoLoginProps) {
  const router = useRouter();
  const search = useSearchParams();
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    const studentId = propStudentId || search.get("studentId");
    if (!studentId || attempted) return;

    const redirectTo = propRedirect || search.get("redirect") || "/";

    const doLogin = async () => {
      setAttempted(true);
      try {
        // 1) If already logged in, skip autologin and inform user
        const me = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' });
        if (me.ok) {
          // Clean query param if present
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete("studentId");
            window.history.replaceState({}, "", url.toString());
          } catch {}
          return;
        }

        // 2) Not logged in: perform autologin
        const res = await fetch(`/api/auth/autologin?studentId=${encodeURIComponent(studentId)}`, { method: "GET", credentials: "include" });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success) {
          toast({ title: "Signed in", description: "Auto-login successful." });
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete("studentId");
            window.history.replaceState({}, "", url.toString());
          } catch {}
          router.replace(redirectTo);
        } else {
          toast({ title: "Auto-login failed", description: json?.error?.message || "Please sign in manually.", variant: "destructive" as any });
        }
      } catch (e) {
        toast({ title: "Network error", description: "Please sign in manually.", variant: "destructive" as any });
      }
    };

    void doLogin();
  }, [attempted, router, search, propStudentId, propRedirect]);

  return null;
}
