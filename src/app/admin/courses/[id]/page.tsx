"use client";

import useSWR from "swr";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Markdown removed from admin UI

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then(r => r.json());

type Block = any;
type Module = any;

export default function AdminCourseEditorPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, mutate } = useSWR(`/api/admin/courses/${encodeURIComponent(params.id)}`, fetcher);
  const [course, setCourse] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveMs, setAutoSaveMs] = useState(1500);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const collapsed = useRef<Record<string, boolean>>({});
  const saveTimer = useRef<any>(null);
  const ignoreNextAutoSave = useRef(false);

  useEffect(() => {
    if (data?.success && data?.data?.course) setCourse(structuredClone(data.data.course));
    if (data?.success && data?.data?.course) ignoreNextAutoSave.current = true;
  }, [data]);

  // Highlight code blocks in preview using Prism after render
  useEffect(() => {
    (async () => {
      try {
        const Prism = await import("prismjs");
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
      } catch {}
    })();
  });

  const onSave = async () => {
    if (!course) return;
    setSaving(true);
    const res = await fetch(`/api/admin/courses/${encodeURIComponent(params.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(course),
    });
    setSaving(false);
    if (res.ok) {
      mutate();
      setLastSavedAt(Date.now());
    }
  };

  // Composite helpers
  const moveCompositeItem = (mid: string, bid: string, from: number, to: number) => {
    setCourse((c: any) => ({
      ...c,
      modules: (c.modules || []).map((m: any) => {
        if (m.id !== mid) return m;
        const blocks = (m.contentBlocks || []).map((b: any) => {
          if (b.id !== bid) return b;
          const items = [...(b.items || [])];
          if (from < 0 || to < 0 || from >= items.length || to >= items.length) return b;
          const [it] = items.splice(from, 1);
          items.splice(to, 0, it);
          return { ...b, items };
        });
        return { ...m, contentBlocks: blocks };
      })
    }));
  };

  const convertBlockToComposite = (mid: string, bid: string) => {
    setCourse((c: any) => ({
      ...c,
      modules: (c.modules || []).map((m: any) => {
        if (m.id !== mid) return m;
        const blocks = (m.contentBlocks || []).map((b: any) => {
          if (b.id !== bid) return b;
          const base = { id: `ci-${Date.now()}`, content: b.content || '' };
          let items: any[] = [];
          switch (b.type) {
            case 'text':
              items = [{ ...base, kind: 'text' }];
              break;
            case 'bullets':
              items = [{ id: `ci-${Date.now()}-bl`, kind: 'bullets', bullets: b.bullets || [] }];
              break;
            case 'image':
              items = [{ id: `ci-${Date.now()}-im`, kind: 'image', imageUrl: b.imageUrl || '', alt: b.alt || '', caption: b.caption || '' }];
              break;
            case 'video':
              items = [{ id: `ci-${Date.now()}-vd`, kind: 'video', videoUrl: b.videoUrl || '' }];
              break;
            case 'code':
              items = [{ id: `ci-${Date.now()}-cd`, kind: 'code', codeLanguage: b.codeLanguage || 'javascript', codeContent: b.codeContent || b.codeTemplate || '' }];
              break;
            default:
              items = [{ ...base, kind: 'text' }];
          }
          return { ...b, type: 'composite', items };
        });
        return { ...m, contentBlocks: blocks };
      })
    }));
  };

  // Debounced autosave
  useEffect(() => {
    if (!autoSaveEnabled) return;
    if (!course) return;
    if (ignoreNextAutoSave.current) {
      ignoreNextAutoSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onSave();
    }, autoSaveMs);
    return () => saveTimer.current && clearTimeout(saveTimer.current);
  }, [course, autoSaveEnabled, autoSaveMs]);

  // Helper to move a block up/down within a module
  const moveBlock = (mid: string, bid: string, dir: -1 | 1) => {
    setCourse((c: any) => {
      const modules = (c.modules || []).map((m: any) => {
        if (m.id !== mid) return m;
        const blocks = [...(m.contentBlocks || [])].sort((a: any, b: any) => a.order - b.order);
        const idx = blocks.findIndex((b: any) => b.id === bid);
        if (idx < 0) return m;
        const target = idx + dir;
        if (target < 0 || target >= blocks.length) return m;
        const tmp = blocks[idx].order;
        blocks[idx].order = blocks[target].order;
        blocks[target].order = tmp;
        return { ...m, contentBlocks: blocks };
      });
      return { ...c, modules };
    });
  };

  const moveModule = (mid: string, dir: -1 | 1) => {
    setCourse((c: any) => {
      const mods = [...(c.modules || [])].sort((a, b) => a.order - b.order);
      const idx = mods.findIndex(m => m.id === mid);
      if (idx < 0) return c;
      const target = idx + dir;
      if (target < 0 || target >= mods.length) return c;
      const tmp = mods[idx].order;
      mods[idx].order = mods[target].order;
      mods[target].order = tmp;
      return { ...c, modules: mods };
    });
  };

  const addModule = () => {
    setCourse((c: any) => ({
      ...c,
      modules: [...(c.modules || []), { id: `m-${Date.now()}`, title: 'New Module', description: '', order: (c.modules?.length || 0) + 1, estimatedHours: 1, displayIndex: '', contentBlocks: [] }],
    }));
  };

  const removeModule = (mid: string) => {
    setCourse((c: any) => ({ ...c, modules: (c.modules || []).filter((m: any) => m.id !== mid) }));
  };

  const duplicateModule = (mid: string) => {
    setCourse((c: any) => {
      const mods = [...(c.modules || [])].sort((a, b) => a.order - b.order);
      const idx = mods.findIndex(m => m.id === mid);
      if (idx < 0) return c;
      const orig = mods[idx];
      const newId = `m-${Date.now()}`;
      const cloneBlocks = (orig.contentBlocks || []).map((b: any, i: number) => ({ ...structuredClone(b), id: `b-${Date.now()}-${i}`, order: i + 1 }));
      const dupe = { ...structuredClone(orig), id: newId, title: `${orig.title} (Copy)`, order: idx + 2, contentBlocks: cloneBlocks };
      // Insert after
      const head = mods.slice(0, idx + 1);
      const tail = mods.slice(idx + 1);
      const next = [...head, dupe, ...tail].map((m, i2) => ({ ...m, order: i2 + 1 }));
      return { ...c, modules: next };
    });
  };

  const updateModule = (mid: string, patch: Partial<Module>) => {
    setCourse((c: any) => ({
      ...c,
      modules: (c.modules || []).map((m: any) => (m.id === mid ? { ...m, ...patch } : m)),
    }));
  };

  const addBlock = (mid: string) => {
    setCourse((c: any) => ({
      ...c,
      modules: (c.modules || []).map((m: any) => (m.id === mid ? {
        ...m,
        contentBlocks: [...(m.contentBlocks || []), {
          id: `b-${Date.now()}`,
          title: 'New Block',
          type: 'text',
          order: (m.contentBlocks?.length || 0) + 1,
          content: '',
          displayIndex: '',
          estimatedMinutes: 5,
        }],
      } : m)),
    }));
  };

  const addBlockOfType = (mid: string, type: string) => {
    setCourse((c: any) => ({
      ...c,
      modules: (c.modules || []).map((m: any) => (m.id === mid ? {
        ...m,
        contentBlocks: [...(m.contentBlocks || []), {
          id: `b-${Date.now()}`,
          title: type === 'text' ? 'Text' : type === 'bullets' ? 'Bullet List' : type === 'image' ? 'Image' : type === 'code' ? 'Code Snippet' : type,
          type,
          order: (m.contentBlocks?.length || 0) + 1,
          displayIndex: '',
          estimatedMinutes: 5,
          ...(type === 'text' ? { content: '' } : {}),
          ...(type === 'bullets' ? { bullets: [] } : {}),
          ...(type === 'image' ? { imageUrl: '', alt: '', caption: '' } : {}),
          ...(type === 'code' ? { codeLanguage: 'javascript', codeTemplate: '', codeContent: '' } : {}),
        }],
      } : m)),
    }));
  };

  const removeBlock = (mid: string, bid: string) => {
    setCourse((c: any) => ({
      ...c,
      modules: (c.modules || []).map((m: any) => (m.id === mid ? { ...m, contentBlocks: (m.contentBlocks || []).filter((b: any) => b.id !== bid) } : m)),
    }));
  };

  const updateBlock = (mid: string, bid: string, patch: Partial<Block>) => {
    setCourse((c: any) => ({
      ...c,
      modules: (c.modules || []).map((m: any) => (m.id === mid ? {
        ...m,
        contentBlocks: (m.contentBlocks || []).map((b: any) => (b.id === bid ? { ...b, ...patch } : b)),
      } : m)),
    }));
  };

  const duplicateBlock = (mid: string, bid: string) => {
    setCourse((c: any) => ({
      ...c,
      modules: (c.modules || []).map((m: any) => {
        if (m.id !== mid) return m;
        const blocks = [...(m.contentBlocks || [])].sort((a: any, b: any) => a.order - b.order);
        const idx = blocks.findIndex((b: any) => b.id === bid);
        if (idx < 0) return m;
        const source = blocks[idx];
        const copy = { ...structuredClone(source), id: `b-${Date.now()}`, title: `${source.title} (Copy)`, order: idx + 2 };
        const head = blocks.slice(0, idx + 1);
        const tail = blocks.slice(idx + 1);
        const next = [...head, copy, ...tail].map((b, i2) => ({ ...b, order: i2 + 1 }));
        return { ...m, contentBlocks: next };
      }),
    }));
  };

  const autoGenerateIndices = () => {
    setCourse((c: any) => {
      const modules = [...(c.modules || [])]
        .sort((a, b) => a.order - b.order)
        .map((m: any, mi: number) => ({
          ...m,
          displayIndex: m.displayIndex && m.displayIndex.trim() ? m.displayIndex : `${mi + 1}`,
          contentBlocks: [...(m.contentBlocks || [])]
            .sort((a: any, b: any) => a.order - b.order)
            .map((b: any, bi: number) => ({
              ...b,
              displayIndex: b.displayIndex && b.displayIndex.trim() ? b.displayIndex : `${(m.displayIndex && m.displayIndex.trim()) ? m.displayIndex : (mi + 1)}.${bi + 1}`,
            })),
        }));
      return { ...c, modules };
    });
  };

  if (isLoading || !course) return <div className="p-6">Loading...</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="sticky top-0 z-10 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-white/80 backdrop-blur border-b">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-semibold">Edit Course</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={autoGenerateIndices}>Auto Index</Button>
            <Button size="sm" onClick={onSave} className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString()}` : 'Not yet saved'} • Auto-save {autoSaveEnabled ? 'On' : 'Off'}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-xl shadow-sm">
            <CardHeader><CardTitle>Course Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={course.description} onChange={(e) => setCourse({ ...course, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Language</Label>
                  <Select value={course.language} onValueChange={(v) => setCourse({ ...course, language: v })}>
                    <SelectTrigger><SelectValue placeholder="Language" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="Java">Java</SelectItem>
                      <SelectItem value="Python">Python</SelectItem>
                      <SelectItem value="JavaScript">JavaScript</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select value={course.difficulty} onValueChange={(v) => setCourse({ ...course, difficulty: v })}>
                    <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estimated Hours</Label>
                  <Input type="number" value={course.estimatedHours} onChange={(e) => setCourse({ ...course, estimatedHours: Number(e.target.value) })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modules Editor */}

          {/* Quick controls */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader><CardTitle>Editor Tools</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>Search Modules</Label>
                  <Input placeholder="Search by title, index or description" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {search && <Button variant="outline" onClick={() => setSearch("")}>Clear</Button>}
              </div>
              <div>
                <Label>Auto-Save</Label>
                <div className="flex items-center gap-2">
                  <Button variant={autoSaveEnabled ? 'default' : 'outline'} size="sm" onClick={() => setAutoSaveEnabled(v => !v)}>{autoSaveEnabled ? 'On' : 'Off'}</Button>
                  <Input type="number" className="w-28" value={autoSaveMs} onChange={(e) => setAutoSaveMs(Math.max(500, Number(e.target.value) || 0))} />
                  <span className="text-xs text-muted-foreground">ms</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground flex items-end">{lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString()}` : 'Not yet saved'}</div>
            </CardContent>
          </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Modules</CardTitle><Button onClick={addModule} size="sm">Add Module</Button></CardHeader>
          <CardContent className="space-y-4">
            {(course.modules || [])
              .sort((a: any, b: any) => a.order - b.order)
              .filter((m: any) => {
                if (!search.trim()) return true;
                const q = search.toLowerCase();
                return (
                  String(m.displayIndex || '').toLowerCase().includes(q) ||
                  String(m.title || '').toLowerCase().includes(q) ||
                  String(m.description || '').toLowerCase().includes(q)
                );
              })
              .map((m: any, i: number, arr: any[]) => (
              <div key={m.id} className="border rounded-xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-medium">{m.displayIndex ? `${m.displayIndex} ` : ''}{m.title}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => { collapsed.current[m.id] = !collapsed.current[m.id]; setCourse({ ...course }); }}>{collapsed.current[m.id] ? 'Expand' : 'Collapse'}</Button>
                    <Button variant="outline" size="sm" onClick={() => duplicateModule(m.id)}>Duplicate</Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <Label>Display Index</Label>
                    <Input value={m.displayIndex || ''} onChange={(e) => updateModule(m.id, { displayIndex: e.target.value })} placeholder="e.g. 1 or 2.1" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Title</Label>
                    <Input value={m.title} onChange={(e) => updateModule(m.id, { title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Order</Label>
                    <Input type="number" value={m.order} onChange={(e) => updateModule(m.id, { order: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={m.description || ''} onChange={(e) => updateModule(m.id, { description: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => moveModule(m.id, -1)} disabled={i === 0}>Up</Button>
                  <Button variant="outline" size="sm" onClick={() => moveModule(m.id, +1)} disabled={i === arr.length - 1}>Down</Button>
                </div>
                {!collapsed.current[m.id] && (
                <>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Content Blocks</h4>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" onClick={() => addBlock(m.id)}>Add Block</Button>
                    <Button variant="outline" size="sm" onClick={() => addBlockOfType(m.id, 'text')}>+ Text</Button>
                    <Button variant="outline" size="sm" onClick={() => addBlockOfType(m.id, 'bullets')}>+ Bullets</Button>
                    <Button variant="outline" size="sm" onClick={() => addBlockOfType(m.id, 'image')}>+ Image</Button>
                    <Button variant="outline" size="sm" onClick={() => addBlockOfType(m.id, 'code')}>+ Code</Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {(m.contentBlocks || []).sort((a: any, b: any) => a.order - b.order).map((b: any, bi: number, barr: any[]) => (
                    <div key={b.id} className="border rounded-lg p-3">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                        <div>
                          <Label>Idx</Label>
                          <Input value={b.displayIndex || ''} onChange={(e) => updateBlock(m.id, b.id, { displayIndex: e.target.value })} placeholder={`${m.displayIndex || ''}.1`} />
                        </div>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          <Button variant="outline" size="sm" onClick={() => moveBlock(m.id, b.id, -1)} disabled={bi === 0}>Up</Button>
                          <Button variant="outline" size="sm" onClick={() => moveBlock(m.id, b.id, +1)} disabled={bi === barr.length - 1}>Down</Button>
                          <Button variant="outline" size="sm" onClick={() => duplicateBlock(m.id, b.id)}>Duplicate</Button>
                        </div>
                        <div>
                          <Label>Type</Label>
                          <Select value={b.type} onValueChange={(v) => updateBlock(m.id, b.id, { type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="code">Code</SelectItem>
                              <SelectItem value="bullets">Bullets</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                              <SelectItem value="composite">Composite</SelectItem>
                              <SelectItem value="quiz">Quiz</SelectItem>
                              <SelectItem value="assignment">Assignment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {b.type !== 'composite' && (
                          <div className="mt-2">
                            <Button variant="outline" size="sm" onClick={() => convertBlockToComposite(m.id, b.id)}>Convert to Composite</Button>
                          </div>
                        )}
                        <div className="md:col-span-3">
                          <Label>Title</Label>
                          <Input value={b.title} onChange={(e) => updateBlock(m.id, b.id, { title: e.target.value })} />
                        </div>
                        <div>
                          <Label>Order</Label>
                          <Input type="number" value={b.order} onChange={(e) => updateBlock(m.id, b.id, { order: Number(e.target.value) })} />
                        </div>
                        <div>
                          <Label>Est. Minutes</Label>
                          <Input type="number" value={b.estimatedMinutes ?? 5} onChange={(e) => updateBlock(m.id, b.id, { estimatedMinutes: Number(e.target.value) })} />
                        </div>
                      </div>
                      {/* Conditional editors */}
                      {b.type === 'text' && (
                        <div className="mt-2 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div>
                              <Label>Heading Level</Label>
                              <Select value={String(b.textHeadingLevel ?? 'none')} onValueChange={(v) => updateBlock(m.id, b.id, { textHeadingLevel: v === 'none' ? undefined : Number(v) })}>
                                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="1">H1</SelectItem>
                                  <SelectItem value="2">H2</SelectItem>
                                  <SelectItem value="3">H3</SelectItem>
                                  <SelectItem value="4">H4</SelectItem>
                                  <SelectItem value="5">H5</SelectItem>
                                  <SelectItem value="6">H6</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Font Size</Label>
                              <Select value={b.textFontSize || 'default'} onValueChange={(v) => updateBlock(m.id, b.id, { textFontSize: v === 'default' ? undefined : v })}>
                                <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="default">Default</SelectItem>
                                  <SelectItem value="text-sm">Small</SelectItem>
                                  <SelectItem value="text-base">Base</SelectItem>
                                  <SelectItem value="text-lg">Large</SelectItem>
                                  <SelectItem value="text-xl">XL</SelectItem>
                                  <SelectItem value="text-2xl">2XL</SelectItem>
                                  <SelectItem value="text-3xl">3XL</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label>Content</Label>
                            <Textarea value={b.content || ''} onChange={(e) => updateBlock(m.id, b.id, { content: e.target.value })} />
                          </div>
                        </div>
                      )}
                      {b.type === 'composite' && (
                        <div className="mt-2 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium">Composite Items</h5>
                            <div className="flex gap-2 flex-wrap">
                              <Button size="sm" variant="outline" onClick={() => updateBlock(m.id, b.id, { items: [...(b.items || []), { id: `ci-${Date.now()}`, kind: 'text', content: '' }] })}>+ Text</Button>
                              <Button size="sm" variant="outline" onClick={() => updateBlock(m.id, b.id, { items: [...(b.items || []), { id: `ci-${Date.now()}`, kind: 'bullets', bullets: [] }] })}>+ Bullets</Button>
                              <Button size="sm" variant="outline" onClick={() => updateBlock(m.id, b.id, { items: [...(b.items || []), { id: `ci-${Date.now()}`, kind: 'image', imageUrl: '', alt: '', caption: '' }] })}>+ Image</Button>
                              <Button size="sm" variant="outline" onClick={() => updateBlock(m.id, b.id, { items: [...(b.items || []), { id: `ci-${Date.now()}`, kind: 'video', videoUrl: '' }] })}>+ Video</Button>
                              <Button size="sm" variant="outline" onClick={() => updateBlock(m.id, b.id, { items: [...(b.items || []), { id: `ci-${Date.now()}`, kind: 'code', codeLanguage: 'javascript', codeContent: '' }] })}>+ Code</Button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {(b.items || []).map((it: any, ii: number, arr2: any[]) => (
                              <div key={it.id || ii} className="border rounded p-3 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                                  <div>
                                    <Label>Kind</Label>
                                    <Select value={it.kind} onValueChange={(v) => {
                                      const items = [...(b.items || [])];
                                      items[ii] = { ...it, kind: v } as any;
                                      updateBlock(m.id, b.id, { items });
                                    }}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="text">Text</SelectItem>
                                        <SelectItem value="bullets">Bullets</SelectItem>
                                        <SelectItem value="image">Image</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                        <SelectItem value="code">Code</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex gap-2 md:col-span-2">
                                    <Button size="sm" variant="outline" onClick={() => moveCompositeItem(m.id, b.id, ii, ii - 1)} disabled={ii === 0}>Up</Button>
                                    <Button size="sm" variant="outline" onClick={() => moveCompositeItem(m.id, b.id, ii, ii + 1)} disabled={ii === arr2.length - 1}>Down</Button>
                                    <Button size="sm" variant="destructive" onClick={() => updateBlock(m.id, b.id, { items: (b.items || []).filter((_: any, idx: number) => idx !== ii) })}>Remove</Button>
                                  </div>
                                </div>
                                {/* Markdown removed */}
                                {it.kind === 'text' && (
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                      <div>
                                        <Label>Heading Level</Label>
                                        <Select value={String(it.textHeadingLevel ?? 'none')} onValueChange={(v) => {
                                          const items = [...(b.items || [])];
                                          items[ii] = { ...it, textHeadingLevel: v === 'none' ? undefined : Number(v) };
                                          updateBlock(m.id, b.id, { items });
                                        }}>
                                          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            <SelectItem value="1">H1</SelectItem>
                                            <SelectItem value="2">H2</SelectItem>
                                            <SelectItem value="3">H3</SelectItem>
                                            <SelectItem value="4">H4</SelectItem>
                                            <SelectItem value="5">H5</SelectItem>
                                            <SelectItem value="6">H6</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label>Font Size</Label>
                                        <Select value={it.textFontSize || 'default'} onValueChange={(v) => {
                                          const items = [...(b.items || [])];
                                          items[ii] = { ...it, textFontSize: v === 'default' ? undefined : v };
                                          updateBlock(m.id, b.id, { items });
                                        }}>
                                          <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="default">Default</SelectItem>
                                            <SelectItem value="text-sm">Small</SelectItem>
                                            <SelectItem value="text-base">Base</SelectItem>
                                            <SelectItem value="text-lg">Large</SelectItem>
                                            <SelectItem value="text-xl">XL</SelectItem>
                                            <SelectItem value="text-2xl">2XL</SelectItem>
                                            <SelectItem value="text-3xl">3XL</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    <div>
                                      <Label>Text</Label>
                                      <Textarea value={it.content || ''} onChange={(e) => {
                                        const items = [...(b.items || [])];
                                        items[ii] = { ...it, content: e.target.value };
                                        updateBlock(m.id, b.id, { items });
                                      }} />
                                    </div>
                                  </div>
                                )}
                                {it.kind === 'bullets' && (
                                  <div>
                                    <Label>Bullets (newline = new item)</Label>
                                    <Textarea value={(it.bullets || []).join("\n")} onChange={(e) => {
                                      const items = [...(b.items || [])];
                                      items[ii] = { ...it, bullets: (e.target.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean) };
                                      updateBlock(m.id, b.id, { items });
                                    }} />
                                  </div>
                                )}
                                {it.kind === 'image' && (
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <div className="md:col-span-2">
                                      <Label>Image URL</Label>
                                      <Input value={it.imageUrl || ''} onChange={(e) => {
                                        const items = [...(b.items || [])];
                                        items[ii] = { ...it, imageUrl: e.target.value };
                                        updateBlock(m.id, b.id, { items });
                                      }} />
                                    </div>
                                    <div>
                                      <Label>Alt</Label>
                                      <Input value={it.alt || ''} onChange={(e) => {
                                        const items = [...(b.items || [])];
                                        items[ii] = { ...it, alt: e.target.value };
                                        updateBlock(m.id, b.id, { items });
                                      }} />
                                    </div>
                                    <div className="md:col-span-3">
                                      <Label>Caption</Label>
                                      <Input value={it.caption || ''} onChange={(e) => {
                                        const items = [...(b.items || [])];
                                        items[ii] = { ...it, caption: e.target.value };
                                        updateBlock(m.id, b.id, { items });
                                      }} />
                                    </div>
                                  </div>
                                )}
                                {it.kind === 'video' && (
                                  <div>
                                    <Label>Video URL</Label>
                                    <Input value={it.videoUrl || ''} onChange={(e) => {
                                      const items = [...(b.items || [])];
                                      items[ii] = { ...it, videoUrl: e.target.value };
                                      updateBlock(m.id, b.id, { items });
                                    }} />
                                  </div>
                                )}
                                {it.kind === 'code' && (
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <div>
                                      <Label>Language</Label>
                                      <Select value={it.codeLanguage || 'javascript'} onValueChange={(v) => {
                                        const items = [...(b.items || [])];
                                        items[ii] = { ...it, codeLanguage: v };
                                        updateBlock(m.id, b.id, { items });
                                      }}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="javascript">JavaScript</SelectItem>
                                          <SelectItem value="python">Python</SelectItem>
                                          <SelectItem value="java">Java</SelectItem>
                                          <SelectItem value="typescript">TypeScript</SelectItem>
                                          <SelectItem value="c">C</SelectItem>
                                          <SelectItem value="cpp">C++</SelectItem>
                                          <SelectItem value="go">Go</SelectItem>
                                          <SelectItem value="ruby">Ruby</SelectItem>
                                          <SelectItem value="html">HTML</SelectItem>
                                          <SelectItem value="css">CSS</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label>Font Size</Label>
                                      <Select value={it.codeFontSize || '12'} onValueChange={(v) => {
                                        const items = [...(b.items || [])];
                                        items[ii] = { ...it, codeFontSize: v };
                                        updateBlock(m.id, b.id, { items });
                                      }}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="10">10px</SelectItem>
                                          <SelectItem value="12">12px</SelectItem>
                                          <SelectItem value="14">14px</SelectItem>
                                          <SelectItem value="16">16px</SelectItem>
                                          <SelectItem value="18">18px</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="md:col-span-3">
                                      <Label>Code</Label>
                                      <Textarea value={it.codeContent || ''} onChange={(e) => {
                                        const items = [...(b.items || [])];
                                        items[ii] = { ...it, codeContent: e.target.value };
                                        updateBlock(m.id, b.id, { items });
                                      }} className="font-mono" style={{ fontSize: (it.codeFontSize ? Number(it.codeFontSize) : 12) + 'px' }} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {b.type === 'video' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          <div>
                            <Label>Video URL</Label>
                            <Input value={b.videoUrl || ''} onChange={(e) => updateBlock(m.id, b.id, { videoUrl: e.target.value })} />
                          </div>
                          <div>
                            <Label>Duration (sec)</Label>
                            <Input type="number" value={b.videoDuration || 0} onChange={(e) => updateBlock(m.id, b.id, { videoDuration: Number(e.target.value) })} />
                          </div>
                        </div>
                      )}
                      {b.type === 'code' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                          <div>
                            <Label>Kind</Label>
                            <Select value={b.codeKind || 'illustrative'} onValueChange={(v) => updateBlock(m.id, b.id, { codeKind: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="illustrative">Illustrative</SelectItem>
                                <SelectItem value="exam">Exam (runnable)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Language</Label>
                            <Select value={b.codeLanguage || 'javascript'} onValueChange={(v) => updateBlock(m.id, b.id, { codeLanguage: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="javascript">JavaScript</SelectItem>
                                <SelectItem value="python">Python</SelectItem>
                                <SelectItem value="java">Java</SelectItem>
                                <SelectItem value="typescript">TypeScript</SelectItem>
                                <SelectItem value="c">C</SelectItem>
                                <SelectItem value="cpp">C++</SelectItem>
                                <SelectItem value="go">Go</SelectItem>
                                <SelectItem value="ruby">Ruby</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Time Limit (ms)</Label>
                            <Input type="number" value={b.timeLimitMs || 2000} onChange={(e) => updateBlock(m.id, b.id, { timeLimitMs: Number(e.target.value) })} />
                          </div>
                          <div>
                            <Label>Memory (MB)</Label>
                            <Input type="number" value={b.memoryLimitMb || 256} onChange={(e) => updateBlock(m.id, b.id, { memoryLimitMb: Number(e.target.value) })} />
                          </div>
                          <div className="md:col-span-3">
                            <Label>Starter Code</Label>
                            <Textarea value={b.codeTemplate || ''} onChange={(e) => updateBlock(m.id, b.id, { codeTemplate: e.target.value })} />
                          </div>
                          <div className="md:col-span-3">
                            <Label>Code Content</Label>
                            <Textarea value={b.codeContent || ''} onChange={(e) => updateBlock(m.id, b.id, { codeContent: e.target.value })} className="font-mono" style={{ fontSize: (b.codeFontSize ? Number(b.codeFontSize) : 12) + 'px' }} />
                          </div>
                          <div className="md:col-span-3">
                            <Label>Test Cases (JSON)</Label>
                            <Textarea value={JSON.stringify(b.testCases || [], null, 2)} onChange={(e) => {
                              try { updateBlock(m.id, b.id, { testCases: JSON.parse(e.target.value) }); } catch {}
                            }} />
                          </div>
                        </div>
                      )}
                      {b.type === 'bullets' && (
                        <div className="mt-2 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Bullet Points</Label>
                            <Button size="sm" onClick={() => {
                              const items = [...(b.bullets || [])];
                              items.push('New bullet');
                              updateBlock(m.id, b.id, { bullets: items });
                            }}>Add Bullet</Button>
                          </div>
                          <div>
                            <Label>List (newline = new bullet)</Label>
                            <Textarea value={(b.bullets || []).join("\n")} onChange={(e) => {
                              const lines = (e.target.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                              updateBlock(m.id, b.id, { bullets: lines });
                            }} placeholder={"First item\nSecond item\nThird item"} />
                          </div>
                          {(b.bullets || []).map((item: string, ii: number) => (
                            <div key={ii} className="flex gap-2 items-center">
                              <Input className="flex-1" value={item} onChange={(e) => {
                                const items = [...(b.bullets || [])];
                                items[ii] = e.target.value;
                                updateBlock(m.id, b.id, { bullets: items });
                              }} onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const items = [...(b.bullets || [])];
                                  items.splice(ii + 1, 0, '');
                                  updateBlock(m.id, b.id, { bullets: items });
                                }
                              }} />
                              <Button variant="outline" size="sm" onClick={() => {
                                if (ii === 0) return;
                                const items = [...(b.bullets || [])];
                                const tmp = items[ii - 1];
                                items[ii - 1] = items[ii];
                                items[ii] = tmp;
                                updateBlock(m.id, b.id, { bullets: items });
                              }}>Up</Button>
                              <Button variant="outline" size="sm" onClick={() => {
                                const items = [...(b.bullets || [])];
                                if (ii >= items.length - 1) return;
                                const tmp = items[ii + 1];
                                items[ii + 1] = items[ii];
                                items[ii] = tmp;
                                updateBlock(m.id, b.id, { bullets: items });
                              }}>Down</Button>
                              <Button variant="destructive" size="sm" onClick={() => {
                                const items = (b.bullets || []).filter((_: string, idx: number) => idx !== ii);
                                updateBlock(m.id, b.id, { bullets: items });
                              }}>Remove</Button>
                            </div>
                          ))}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                            <div>
                              <Label>Mode</Label>
                              <Select value={String(b.bulletsMarkdown ?? false)} onValueChange={(v) => updateBlock(m.id, b.id, { bulletsMarkdown: v === 'true' })}>
                                <SelectTrigger><SelectValue placeholder="Plain" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="false">Plain Inputs</SelectItem>
                                  <SelectItem value="true">Markdown List</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {b.bulletsMarkdown && (
                            <div>
                              <Label>Markdown List</Label>
                              <Textarea value={(b.bullets || []).map((x: string) => `- ${x}`).join("\n")} onChange={(e) => {
                                const lines = (e.target.value || '').split(/\r?\n/).map(l => l.replace(/^[-*]\s?/, '')).filter(Boolean);
                                updateBlock(m.id, b.id, { bullets: lines });
                              }} placeholder="- First item\n- Second item" />
                            </div>
                          )}
                        </div>
                      )}
                      {b.type === 'image' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                          <div className="md:col-span-2">
                            <Label>Image URL</Label>
                            <Input value={b.imageUrl || ''} onChange={(e) => updateBlock(m.id, b.id, { imageUrl: e.target.value })} />
                          </div>
                          <div>
                            <Label>Alt Text</Label>
                            <Input value={b.alt || ''} onChange={(e) => updateBlock(m.id, b.id, { alt: e.target.value })} />
                          </div>
                          <div className="md:col-span-3">
                            <Label>Caption</Label>
                            <Input value={b.caption || ''} onChange={(e) => updateBlock(m.id, b.id, { caption: e.target.value })} />
                          </div>
                          <div className="md:col-span-3">
                            <Label>Upload</Label>
                            <input type="file" accept="image/*" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => updateBlock(m.id, b.id, { imageUrl: String(reader.result) });
                              reader.readAsDataURL(file);
                            }} />
                          </div>
                        </div>
                      )}
                      {b.type === 'quiz' && (
                        <div className="mt-2 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">Quiz Questions</div>
                            <Button size="sm" onClick={() => {
                              const quiz = b.quiz || { questions: [], passingScore: 0, allowRetakes: true };
                              const next = { ...quiz, questions: [...quiz.questions, { id: `q-${Date.now()}`, question: 'New question', type: 'multiple-choice', options: [{ id: 'a', text: 'Option A' }, { id: 'b', text: 'Option B' }], correctOptionId: 'a', explanation: '', difficulty: 'easy', points: 1 }] };
                              updateBlock(m.id, b.id, { quiz: next });
                            }}>Add Question</Button>
                          </div>

                          {(b.quiz?.questions || []).map((q: any, qi: number) => (
                            <div key={q.id} className="border rounded p-3 space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                                <div className="md:col-span-3">
                                  <Label>Question</Label>
                                  <Input value={q.question} onChange={(e) => {
                                    const qs = [...(b.quiz?.questions || [])];
                                    qs[qi] = { ...q, question: e.target.value };
                                    updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), questions: qs } });
                                  }} />
                                </div>
                                <div>
                                  <Label>Type</Label>
                                  <Select value={q.type} onValueChange={(v) => {
                                    const qs = [...(b.quiz?.questions || [])];
                                    qs[qi] = { ...q, type: v };
                                    updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), questions: qs } });
                                  }}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                      <SelectItem value="true-false">True / False</SelectItem>
                                      <SelectItem value="fill-blank">Fill in the Blank</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Difficulty</Label>
                                  <Select value={q.difficulty || 'easy'} onValueChange={(v) => {
                                    const qs = [...(b.quiz?.questions || [])];
                                    qs[qi] = { ...q, difficulty: v };
                                    updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), questions: qs } });
                                  }}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="easy">Easy</SelectItem>
                                      <SelectItem value="medium">Medium</SelectItem>
                                      <SelectItem value="hard">Hard</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Points</Label>
                                  <Input type="number" value={q.points || 1} onChange={(e) => {
                                    const qs = [...(b.quiz?.questions || [])];
                                    qs[qi] = { ...q, points: Number(e.target.value) };
                                    updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), questions: qs } });
                                  }} />
                                </div>
                              </div>

                              {/* Options editor */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label>Options</Label>
                                  <Button size="sm" onClick={() => {
                                    const qs = [...(b.quiz?.questions || [])];
                                    const opts = [...(q.options || [])];
                                    const newId = String.fromCharCode(97 + opts.length); // a, b, c...
                                    opts.push({ id: newId, text: `Option ${newId.toUpperCase()}` });
                                    qs[qi] = { ...q, options: opts };
                                    updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), questions: qs } });
                                  }}>Add Option</Button>
                                </div>
                                {(q.options || []).map((opt: any, oi: number) => (
                                  <div key={opt.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                                    <div className="md:col-span-4">
                                      <Input value={opt.text} onChange={(e) => {
                                        const qs = [...(b.quiz?.questions || [])];
                                        const opts = [...(q.options || [])];
                                        opts[oi] = { ...opt, text: e.target.value };
                                        qs[qi] = { ...q, options: opts };
                                        updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), questions: qs } });
                                      }} />
                                    </div>
                                    <div>
                                      <Button variant={q.correctOptionId === opt.id ? 'default' : 'outline'} size="sm" onClick={() => {
                                        const qs = [...(b.quiz?.questions || [])];
                                        qs[qi] = { ...q, correctOptionId: opt.id };
                                        updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), questions: qs } });
                                      }}>{q.correctOptionId === opt.id ? 'Correct' : 'Mark Correct'}</Button>
                                    </div>
                                    <div>
                                      <Button variant="destructive" size="sm" onClick={() => {
                                        const qs = [...(b.quiz?.questions || [])];
                                        const opts = (q.options || []).filter((_: any, idx: number) => idx !== oi);
                                        const newCorrect = (q.correctOptionId && q.correctOptionId === opt.id) ? undefined : q.correctOptionId;
                                        qs[qi] = { ...q, options: opts, correctOptionId: newCorrect };
                                        updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), questions: qs } });
                                      }}>Remove</Button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div>
                                <Label>Explanation</Label>
                                <Textarea value={q.explanation || ''} onChange={(e) => {
                                  const qs = [...(b.quiz?.questions || [])];
                                  qs[qi] = { ...q, explanation: e.target.value };
                                  updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), questions: qs } });
                                }} />
                              </div>

                              <div className="flex justify-end">
                                <Button variant="destructive" size="sm" onClick={() => {
                                  const qs = (b.quiz?.questions || []).filter((_: any, idx: number) => idx !== qi);
                                  updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), questions: qs } });
                                }}>Remove Question</Button>
                              </div>
                            </div>
                          ))}

                          {/* Quiz-level settings */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div>
                              <Label>Passing Score</Label>
                              <Input type="number" value={b.quiz?.passingScore ?? 0} onChange={(e) => updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), passingScore: Number(e.target.value) } })} />
                            </div>
                            <div>
                              <Label>Allow Retakes</Label>
                              <Select value={String(b.quiz?.allowRetakes ?? true)} onValueChange={(v) => updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), allowRetakes: v === 'true' } })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">Yes</SelectItem>
                                  <SelectItem value="false">No</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="mt-2 flex justify-end gap-2">
                        <Button variant="destructive" size="sm" onClick={() => removeBlock(m.id, b.id)}>Remove Block</Button>
                      </div>
                    </div>
                  ))}
                </div>
                </>
                )}
                <div className="flex justify-end">
                  <Button variant="destructive" size="sm" onClick={() => removeModule(m.id)}>Remove Module</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Preview Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-lg font-medium">{course.title}</div>
              <div className="text-sm text-muted-foreground">{course.description}</div>
            </div>
            <Separator />
            <div className="space-y-4">
              {(course.modules || []).sort((a: any, b: any) => a.order - b.order).map((m: any) => (
                <div key={m.id} className="space-y-2">
                  <div className="font-medium">{m.displayIndex ? `${m.displayIndex} ` : ''}{m.title}</div>
                  <div className="space-y-3">
                    {(m.contentBlocks || []).sort((a: any, b: any) => a.order - b.order).map((b: any) => (
                      <div key={b.id} className="text-sm border rounded p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono mr-2">{b.displayIndex || ''}</span>
                            <span className="uppercase text-xs mr-2">{b.type}</span>
                            <span className="font-medium">{b.title || ''}</span>
                          </div>
                          {typeof b.estimatedMinutes === 'number' && (
                            <div className="text-xs text-muted-foreground">~{b.estimatedMinutes} min</div>
                          )}
                        </div>
                        {b.type === 'text' && (
                          <div className="mt-2">
                            {(() => {
                              const text = b.content || '';
                              const lvl = b.textHeadingLevel;
                              if (!lvl) return <div className={b.textFontSize || ''}><div className="whitespace-pre-wrap">{text}</div></div>;
                              const Tag: any = `h${lvl}`;
                              const sizeClass = b.textFontSize || '';
                              return <Tag className={['mt-0', sizeClass].filter(Boolean).join(' ')}>{text}</Tag>;
                            })()}
                          </div>
                        )}
                        {b.type === 'bullets' && (
                          <div className="mt-2">
                            <ul className="ml-5 list-disc space-y-1">
                              {(b.bullets || []).map((it: string, idx: number) => (
                                <li key={idx}>{it}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {b.type === 'image' && b.imageUrl && (
                          <figure className="mt-2">
                            <img src={b.imageUrl} alt={b.alt || ''} className="max-h-64 rounded border object-contain" />
                            {(b.caption || b.alt) && (
                              <figcaption className="text-xs text-muted-foreground mt-1">{b.caption || b.alt}</figcaption>
                            )}
                          </figure>
                        )}
                        {b.type === 'composite' && Array.isArray(b.items) && (
                          <div className="mt-2 space-y-2">
                            {b.items.map((it: any, idx2: number) => (
                              <div key={it.id || idx2}>
                                {it.kind === 'markdown' && (
                                  <div className="whitespace-pre-wrap">{it.content || ''}</div>
                                )}
                                {it.kind === 'text' && (
                                  <div>
                                    {(() => {
                                      const text = it.content || '';
                                      const lvl = it.textHeadingLevel;
                                      if (!lvl) return <div className={it.textFontSize || ''}><div className="whitespace-pre-wrap">{text}</div></div>;
                                      const Tag: any = `h${lvl}`;
                                      const sizeClass = it.textFontSize || '';
                                      return <Tag className={['mt-0', sizeClass].filter(Boolean).join(' ')}>{text}</Tag>;
                                    })()}
                                  </div>
                                )}
                                {it.kind === 'bullets' && Array.isArray(it.bullets) && (
                                  <ul className="ml-5 list-disc space-y-1">{it.bullets.map((x: string, bi: number) => (<li key={bi}>{x}</li>))}</ul>
                                )}
                                {it.kind === 'image' && it.imageUrl && (
                                  <figure>
                                    <img src={it.imageUrl} alt={it.alt || ''} className="max-h-64 rounded border object-contain" />
                                    {(it.caption || it.alt) && (<figcaption className="text-xs text-muted-foreground mt-1">{it.caption || it.alt}</figcaption>)}
                                  </figure>
                                )}
                                {it.kind === 'video' && it.videoUrl && (
                                  <div className="aspect-video w-full"><iframe src={it.videoUrl} className="w-full h-full rounded" allowFullScreen /></div>
                                )}
                                {it.kind === 'code' && it.codeContent && (
                                  <pre className="bg-muted p-3 rounded overflow-auto" style={{ fontSize: (it.codeFontSize ? Number(it.codeFontSize) : 12) + 'px' }}><code className={`language-${it.codeLanguage || 'javascript'}`}>{it.codeContent}</code></pre>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {b.type === 'code' && (
                          <div className="mt-2">
                            <Label>Code</Label>
                            <Textarea value={b.codeContent || ''} onChange={(e) => updateBlock(m.id, b.id, { codeContent: e.target.value })} className="font-mono" style={{ fontSize: (b.codeFontSize ? Number(b.codeFontSize) : 12) + 'px' }} />
                            <div className="flex items-center justify-between mt-2">
                              <div>
                                <Select value={b.codeLanguage || 'javascript'} onValueChange={(v) => updateBlock(m.id, b.id, { codeLanguage: v })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="javascript">JavaScript</SelectItem>
                                    <SelectItem value="python">Python</SelectItem>
                                    <SelectItem value="java">Java</SelectItem>
                                    <SelectItem value="typescript">TypeScript</SelectItem>
                                    <SelectItem value="c">C</SelectItem>
                                    <SelectItem value="cpp">C++</SelectItem>
                                    <SelectItem value="go">Go</SelectItem>
                                    <SelectItem value="ruby">Ruby</SelectItem>
                                    <SelectItem value="html">HTML</SelectItem>
                                    <SelectItem value="css">CSS</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Select value={b.codeFontSize || '12'} onValueChange={(v) => updateBlock(m.id, b.id, { codeFontSize: v })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="10">10px</SelectItem>
                                    <SelectItem value="12">12px</SelectItem>
                                    <SelectItem value="14">14px</SelectItem>
                                    <SelectItem value="16">16px</SelectItem>
                                    <SelectItem value="18">18px</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        )}
                        {b.type === 'video' && b.videoUrl && (
                          <div className="mt-2 text-xs text-muted-foreground">Video: {b.videoUrl}{b.videoDuration ? ` • ${b.videoDuration}s` : ''}</div>
                        )}
                        {b.type === 'quiz' && (
                          <div className="mt-2 text-xs text-muted-foreground">Quiz • {b.quiz?.questions?.length || 0} questions</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
          <Card>
            <CardHeader><CardTitle>Preview (Minimal)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-lg font-medium">{course.title}</div>
                <div className="text-sm text-muted-foreground">{course.description}</div>
              </div>
              <Separator />
              <div className="space-y-2">
                {(course.modules || []).sort((a: any, b: any) => a.order - b.order).map((m: any) => (
                  <div key={m.id}>
                    <div className="font-medium">{m.displayIndex ? `${m.displayIndex} ` : ''}{m.title}</div>
                    <ul className="ml-4 list-disc">
                      {(m.contentBlocks || []).sort((a: any, b: any) => a.order - b.order).map((b: any) => (
                        <li key={b.id} className="text-sm">
                          <span className="font-mono">{b.displayIndex || ''}</span> – <span className="uppercase text-xs">{b.type}</span> {b.title || ''}
                          {b.type === 'image' && b.imageUrl ? ` • img` : ''}
                          {b.type === 'bullets' && (b.bullets?.length ? ` • ${b.bullets.length} bullets` : '')}
                          {typeof b.estimatedMinutes === 'number' ? ` • ~${b.estimatedMinutes}m` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
