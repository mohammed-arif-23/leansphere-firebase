"use client";

import HtmlRenderer from '@/components/HtmlRenderer';

export default function CourseCustomHtml({ html }: { html: string }) {
  // HtmlRenderer already sanitizes and uses suppressHydrationWarning
  return <HtmlRenderer html={html} />;
}
