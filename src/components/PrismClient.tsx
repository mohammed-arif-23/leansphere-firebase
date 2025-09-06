"use client";

import { useEffect } from "react";

export default function PrismClient({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (async () => {
      try {
        const Prism = await import("prismjs");
        // Load additional languages commonly used
        await Promise.all([
          import("prismjs/components/prism-javascript"),
          import("prismjs/components/prism-typescript"),
          import("prismjs/components/prism-python"),
          import("prismjs/components/prism-java"),
          import("prismjs/components/prism-c"),
          import("prismjs/components/prism-cpp"),
          import("prismjs/components/prism-go"),
          import("prismjs/components/prism-ruby"),
          import("prismjs/components/prism-markup"),
          import("prismjs/components/prism-css"),
        ]);
        Prism.highlightAll();
      } catch (e) {
        // no-op
      }
    })();
  }, []);

  return <>{children}</>;
}
