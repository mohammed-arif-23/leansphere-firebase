"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopied(true);
      toast({ title: "Copied", description: "Code copied to clipboard." });
      setTimeout(() => setCopied(false), 1500);
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
      className={`bg-white text-black border-white/30 hover:bg-white/90 ${className || ''}`}
      title={copied ? "Copied" : "Copy code"}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}
