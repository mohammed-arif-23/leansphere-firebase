"use client";

import { useEffect, useMemo, useState } from "react";

type TOCItem = {
  id: string; // element id in DOM (e.g., block-123)
  title: string;
  displayIndex?: string;
  type?: string;
};

export default function ModuleTOC({ items }: { items: TOCItem[] }) {
  const [active, setActive] = useState<string | null>(null);

  const ids = useMemo(() => items.map((i) => i.id), [items]);

  useEffect(() => {
    if (!ids.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top > b.boundingClientRect.top ? 1 : -1));
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: [0, 0.1, 0.25, 0.5, 1] }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cleanItems = items.filter((i) => (i.title || '').trim().length > 0);

  if (cleanItems.length === 0) return null;

  return (
    <nav className="hidden lg:block sticky top-24">
      <ul className="space-y-1">
        {cleanItems.map((it) => {
          const isActive = active === it.id;
          return (
            <li key={it.id}>
              <button
                onClick={() => scrollTo(it.id)}
                className={`w-full text-left text-sm truncate rounded px-2 py-1 transition ${
                  isActive ? 'bg-muted text-foreground' : 'hover:bg-muted/60 text-muted-foreground'
                }`}
                title={it.title}
              >
                <span className="truncate inline-block align-middle max-w-[14rem]">{it.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
