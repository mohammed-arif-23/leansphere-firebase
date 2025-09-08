"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconHome(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 9l9-7 9 7" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

function IconLayers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconUser(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const tabs = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/courses", label: "Courses", icon: IconLayers },
  { href: "/profile", label: "Profile", icon: IconUser },
];

export default function BottomTabs() {
  const pathname = usePathname();

  // Hide tabs on deep lesson pages to avoid covering actions
  if (pathname && /^\/courses\/[^/]+\/[^/]+/.test(pathname)) {
    return null;
  }

  // Hide on desktop; show on mobile
  // Determine active index for sliding indicator
  const activeIndex = Math.max(
    0,
    tabs.findIndex(({ href }) => pathname === href || (href !== "/" && pathname?.startsWith(href)))
  );

  return (
    <nav
      className="sticky bottom-0 z-50 bg-white relative"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="grid grid-cols-3">
        {tabs.map(({ href, label, icon: Icon }, idx) => {
          const active = idx === activeIndex;
          const linkCls = `flex flex-col items-center justify-center gap-1 py-2 text-xs ${active ? "text-foreground" : "text-foreground/60"}`;
          const pillCls = `inline-flex items-center justify-center h-8 w-16 rounded-full transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-transparent"}`;
          return (
            <li key={href} className="relative">
              <Link href={href} className={linkCls} aria-current={active ? "page" : undefined}>
                <span className={pillCls}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="font-medium">{label}</span>
              </Link>
              {/* Per-tab indicator bar (left-to-right full-width animation) */}
              <div
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-16 rounded-full bg-black origin-left transform transition-transform duration-500 ease-in-out ${
                  active ? 'scale-x-100' : 'scale-x-0'
                }`}
                aria-hidden="true"
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
