"use client";

import { sanitizeHtml } from '@/lib/sanitize';

export default function HtmlRenderer({ html, className }: { html: string; className?: string }) {
  const safe = sanitizeHtml(html || '');
  return <div className={className} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: safe }} />;
}
