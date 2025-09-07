"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Prefetch({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    if (href) {
      try { router.prefetch(href); } catch {}
    }
  }, [href, router]);
  return null;
}
