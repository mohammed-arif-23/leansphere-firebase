"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import 'prismjs/themes/prism.css';

export default function MarkdownRender({ markdown }: { markdown: string }) {
  const prismRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      // Load Prism core and desired languages dynamically to avoid SSR/Turbopack issues
      const Prism = (await import('prismjs')).default;
      prismRef.current = Prism;
      await Promise.all([
        import('prismjs/components/prism-markup'),
        import('prismjs/components/prism-css'),
        import('prismjs/components/prism-javascript'),
        import('prismjs/components/prism-typescript'),
        import('prismjs/components/prism-jsx'),
        import('prismjs/components/prism-python'),
        import('prismjs/components/prism-java'),
        import('prismjs/components/prism-sql'),
        import('prismjs/components/prism-bash'),
        // TSX may not exist in all versions; ignore if missing
        import('prismjs/components/prism-tsx').catch(() => {}),
      ]);
      Prism.highlightAll();
    })();
  }, [markdown]);

  return (
    <div className="prose max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown || ''}</ReactMarkdown>
    </div>
  );
}
