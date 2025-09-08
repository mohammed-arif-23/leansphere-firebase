"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const legacyCopy = (value: string) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      // Prevent scrolling to bottom on iOS
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      ta.setAttribute('readonly', '');
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const onCopy = async () => {
    const value = text ?? "";
    if (!value) {
      toast({ title: "Nothing to copy", description: "The content is empty.", variant: "destructive" });
      return;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast({ title: "Copied", description: "Copied to clipboard." });
        setTimeout(() => setCopied(false), 1500);
        return;
      }
      // Fallback for insecure contexts or unsupported browsers
      const ok = legacyCopy(value);
      if (ok) {
        setCopied(true);
        toast({ title: "Copied", description: "Copied to clipboard." });
        setTimeout(() => setCopied(false), 1500);
      } else {
        throw new Error('execCommand failed');
      }
    } catch (e) {
      toast({ title: "Copy failed", description: "Unable to copy to clipboard.", variant: "destructive" });
    }
  };
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      onClick={onCopy}
      className={`bg-white text-black border-black/10 hover:bg-white/90 ${className || ''}`}
      title={copied ? "Copied" : "Copy code"}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}
