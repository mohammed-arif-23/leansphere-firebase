"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function MarkCompleteButton({ courseId, moduleId, contentBlockId, initialCompleted }: { courseId: string; moduleId: string; contentBlockId: string; initialCompleted?: boolean; }) {
  const [completed, setCompleted] = useState(!!initialCompleted);
  const [saving, setSaving] = useState(false);

  const onClick = async () => {
    if (completed) return;
    setSaving(true);
    try {
      const res = await fetch('/api/learning/progress/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, moduleId, contentBlockId }),
      });
      if (res.ok) {
        setCompleted(true);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button size="sm" onClick={onClick} disabled={completed || saving} variant={completed ? 'outline' : 'default'} className={completed ? '' : 'bg-accent text-accent-foreground hover:bg-accent/90'}>
      {completed ? 'Completed' : (saving ? 'Marking...' : 'Mark complete')}
    </Button>
  );
}
