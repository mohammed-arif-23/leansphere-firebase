"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // initialize based on document class
    const has = document.documentElement.classList.contains('dark');
    setDark(has);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('prefers-dark', next ? '1' : '0'); } catch {}
  };

  useEffect(() => {
    // auto-apply saved preference on hydration
    try {
      const saved = localStorage.getItem('prefers-dark');
      if (saved === '1') {
        document.documentElement.classList.add('dark');
        setDark(true);
      }
    } catch {}
  }, []);

  return (
    <Button variant="outline" size="sm" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      {dark ? (<Sun className="h-4 w-4" />) : (<Moon className="h-4 w-4" />)}
    </Button>
  );
}
