"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

type Props = {
  courseId: string;
  moduleId: string;
  href: string;
  disabled?: boolean;
  label?: string;
};

export default function NextModuleButton({ courseId, moduleId, href, disabled, label = 'Next Module' }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const goNext = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    setLoading(true);
    try {
      await fetch('/api/learning/progress/complete-module', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, moduleId })
      });
    } catch {}
    setLoading(false);
    router.push(href);
  };

  return (
    <Button asChild disabled={disabled || loading}>
      <Link href={href} onClick={goNext}>
        {label}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </Button>
  );
}
