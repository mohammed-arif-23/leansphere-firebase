"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function applyWrap(value: string, selStart: number, selEnd: number, prefix: string, suffix?: string) {
  const sfx = suffix ?? prefix;
  const before = value.slice(0, selStart);
  const selected = value.slice(selStart, selEnd) || "text";
  const after = value.slice(selEnd);
  const result = `${before}${prefix}${selected}${sfx}${after}`;
  const pos = selStart + prefix.length + selected.length + sfx.length;
  return { value: result, caret: pos };
}

function applyHeading(value: string, selStart: number, selEnd: number, level: number) {
  const hashes = "#".repeat(Math.min(6, Math.max(1, level)));
  // Insert heading marker at the start of the current line
  const lineStart = value.lastIndexOf("\n", selStart - 1) + 1;
  const before = value.slice(0, lineStart);
  const after = value.slice(lineStart);
  const result = `${before}${hashes} ${after}`;
  const caret = lineStart + hashes.length + 1;
  return { value: result, caret };
}

export default function MarkdownEditor({ label = "Markdown", value, onChange, placeholder }: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string; }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const apply = (fn: (v: string, s: number, e: number) => { value: string; caret: number }) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const { value: next, caret } = fn(value, start, end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => apply((v,s,e)=>applyWrap(v,s,e,"**"))}><b>B</b></Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply((v,s,e)=>applyWrap(v,s,e,"*"))}><i>I</i></Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply((v,s,e)=>applyWrap(v,s,e,"`"))}>Code</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply((v,s,e)=>applyHeading(v,s,e,1))}>H1</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply((v,s,e)=>applyHeading(v,s,e,2))}>H2</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply((v,s,e)=>applyHeading(v,s,e,3))}>H3</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply((v,s,e)=>applyWrap(v,s,e,"["," ](url)"))}>Link</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange((value||"") + "\n\n- item 1\n- item 2")}>List</Button>
      </div>
      <Textarea ref={ref} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
