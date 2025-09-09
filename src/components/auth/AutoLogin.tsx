"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/hooks/use-toast";

/**
 * AutoLogin detects a `studentId` query parameter and attempts to auto-login
 * by calling `/api/auth/autologin`. On success, it sets the session cookie and
 * redirects to `redirect` param or home. On failure, it leaves the user on the
 * current page to proceed with normal login.
 */
export default function AutoLogin() {
  const router = useRouter();
  const search = useSearchParams();
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    const studentId = search.get("studentId");
    if (!studentId || attempted) return;

    const redirectTo = search.get("redirect") || "/";

    const doLogin = async () => {
      setAttempted(true);
      try {
        const res = await fetch(`/api/auth/autologin?studentId=${encodeURIComponent(studentId)}`, {
          method: "GET",
          credentials: "include",
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success) {
          toast({ title: "Signed in", description: "Auto-login successful." });
          // Clean query params by replacing URL before navigating
          const url = new URL(window.location.href);
          url.searchParams.delete("studentId");
          window.history.replaceState({}, "", url.toString());
          // Navigate
          router.replace(redirectTo);
        } else {
          toast({ title: "Auto-login failed", description: json?.error?.message || "Please sign in manually.", variant: "destructive" as any });
        }
      } catch (e) {
        toast({ title: "Network error", description: "Please sign in manually.", variant: "destructive" as any });
      }
    };

    void doLogin();
  }, [attempted, router, search]);

  return null;
}
