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
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowUp, ArrowDown, Copy, Trash2, Plus, MoreHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import ProctorMonitor from '@/components/assessment/ProctorMonitor';
import AdaptiveQuiz from '@/components/assessment/AdaptiveQuiz';
import PlagiarismDetector from '@/components/assessment/PlagiarismDetector';
import PeerReview from '@/components/assessment/PeerReview';
// Markdown removed from admin UI
import HtmlRenderer from '@/components/HtmlRenderer';

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then(r => r.json());

type Block = any;
type Module = any;

export default function AdminCourseEditorPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, mutate } = useSWR(`/api/admin/courses/${encodeURIComponent(params.id)}`, fetcher);
  const [validation, setValidation] = useState<{ checkedAt?: number; issues: string[]; items?: ValIssue[] }>({ issues: [] });
  const [course, setCourse] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveMs, setAutoSaveMs] = useState(1500);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const collapsed = useRef<Record<string, boolean>>({});
  const [collapseTick, setCollapseTick] = useState(0);
  const isCollapsed = (k: string) => !!collapsed.current[k];
  const setCollapsed = (k: string, v: boolean) => { collapsed.current[k] = v; setCollapseTick((x) => x + 1); };
  
  // Module collapse state management
  const moduleCollapsed = useRef<Record<string, boolean>>({});
  const [moduleCollapseTick, setModuleCollapseTick] = useState(0);
  const isModuleCollapsed = (moduleId: string) => !!moduleCollapsed.current[moduleId];
  const setModuleCollapsed = (moduleId: string, collapsed: boolean) => { 
    moduleCollapsed.current[moduleId] = collapsed; 
    setModuleCollapseTick((x) => x + 1); 
  };
  const collapseAllCompositeItems = (courseObj: any, v: boolean) => {
    (courseObj?.modules || []).forEach((m: any) => {
      (m.contentBlocks || []).forEach((b: any) => {
        if (b.type === 'composite') {
          const items: any[] = Array.isArray(b.items) ? b.items : [];
          items.forEach((it: any) => {
            setCollapsed(`compItem:${m.id}:${b.id}:${it.id || ''}`, v);
            if (it?.kind === 'composite') {
              const nested: any[] = Array.isArray(it.items) ? it.items : [];
              nested.forEach((nit: any) => setCollapsed(`compNested:${m.id}:${b.id}:${it.id || ''}:${nit.id || ''}`, v));
            }
          });
        }
      });
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && (e.key === '[' || e.key === ']')) {
        e.preventDefault();
        const expand = e.key === ']';
        collapseAllCompositeItems(course, !expand);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);  
  }, [course]);
  const saveTimer = useRef<any>(null);
  const ignoreNextAutoSave = useRef(false);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  type ValIssue = { message: string; severity: 'error' | 'warning' | 'info'; code: string; moduleId?: string; blockId?: string };
  const buildValidation = (c: any): ValIssue[] => {
    const out: ValIssue[] = [];
    if (!c?.id) out.push({ message: 'Course id missing', severity: 'error', code: 'course.id.missing' });
    const ids = new Set<string>();
    const moduleIdSet = new Set<string>();
    (c?.modules || []).forEach((m: any, mi: number) => {
      if (!m.id) out.push({ message: `Module ${mi + 1} missing id`, severity: 'error', code: 'module.id.missing' });
      if (m.id && ids.has(m.id)) out.push({ message: `Duplicate module id ${m.id}`, severity: 'error', code: 'module.id.duplicate', moduleId: m.id }); else if (m.id) { ids.add(m.id); moduleIdSet.add(m.id); }
      if (typeof m.order !== 'number') out.push({ message: `Module ${m.title || m.id || `#${mi+1}`} missing order`, severity: 'warning', code: 'module.order.missing', moduleId: m.id });
      const idxSet = new Set<string>();
      (m.contentBlocks || []).forEach((b: any, bi: number) => {
        if (!b.id) out.push({ message: `Block ${mi + 1}.${bi + 1} missing id`, severity: 'error', code: 'block.id.missing', moduleId: m.id });
        if (b.id && ids.has(b.id)) out.push({ message: `Duplicate block id ${b.id}`, severity: 'error', code: 'block.id.duplicate', moduleId: m.id, blockId: b.id }); else if (b.id) ids.add(b.id);
        if (typeof b.order !== 'number') out.push({ message: `Block ${b.title || b.id || `#${bi+1}`} missing order`, severity: 'warning', code: 'block.order.missing', moduleId: m.id, blockId: b.id });
        if (!b.type) out.push({ message: `Block ${b.id || `#${bi+1}`} missing type`, severity: 'error', code: 'block.type.missing', moduleId: m.id, blockId: b.id });
        if (b.type === 'video' && !b.videoUrl) out.push({ message: `Video block ${b.id || `#${bi+1}`} missing videoUrl`, severity: 'error', code: 'block.video.url.missing', moduleId: m.id, blockId: b.id });
        if (b.type === 'quiz' && !b.quiz) out.push({ message: `Quiz block ${b.id || `#${bi+1}`} missing quiz data`, severity: 'error', code: 'block.quiz.data.missing', moduleId: m.id, blockId: b.id });
        if (b.type === 'quiz' && b.quiz) {
          const qz = b.quiz || {};
          const qs = Array.isArray(qz.questions) ? qz.questions : [];
          if (qs.length === 0) {
            out.push({ message: `Quiz has no questions`, severity: 'warning', code: 'quiz.questions.empty', moduleId: m.id, blockId: b.id });
          }
          qs.forEach((q: any, qi: number) => {
            if (!q || !String(q.text || '').trim()) {
              out.push({ message: `Quiz question #${qi + 1} text is empty`, severity: 'warning', code: 'quiz.question.text.empty', moduleId: m.id, blockId: b.id });
            }
            const opts = Array.isArray(q.options) ? q.options : [];
            if (opts.length < 2) {
              out.push({ message: `Quiz question #${qi + 1} must have at least 2 options`, severity: 'warning', code: 'quiz.question.options.min', moduleId: m.id, blockId: b.id });
            }
            opts.forEach((op: any, oi: number) => {
              if (!String(op || '').trim()) {
                out.push({ message: `Quiz question #${qi + 1} option #${oi + 1} is empty`, severity: 'warning', code: 'quiz.question.option.empty', moduleId: m.id, blockId: b.id });
              }
            });
            const ci = Number(q.correctIndex);
            if (!(ci >= 0 && ci < opts.length)) {
              out.push({ message: `Quiz question #${qi + 1} has invalid correct option index`, severity: 'warning', code: 'quiz.question.correct.invalid', moduleId: m.id, blockId: b.id });
            }
          });
        }
        if (b.type === 'assignment') {
          // Points must be >= 0
          if (b.assignmentPoints !== undefined && Number(b.assignmentPoints) < 0) {
            out.push({ message: `Assignment has negative points`, severity: 'error', code: 'assignment.points.invalid', moduleId: m.id, blockId: b.id });
          }
          // Test cases must have both input and expectedOutput if present
          (Array.isArray(b.testCases) ? b.testCases : []).forEach((tc: any, ti: number) => {
            if (!tc || !String(tc.input || '').trim() || !String(tc.expectedOutput || '').trim()) {
              out.push({ message: `Assignment test case #${ti+1} must include input and expected output`, severity: 'warning', code: 'assignment.testcase.incomplete', moduleId: m.id, blockId: b.id });
            }
          });
          // Attachments must have non-empty URL
          (Array.isArray(b.attachments) ? b.attachments : []).forEach((at: any, ai: number) => {
            if (!at || !String(at.url || '').trim()) {
              out.push({ message: `Assignment attachment #${ai+1} missing URL`, severity: 'warning', code: 'assignment.attachment.url.missing', moduleId: m.id, blockId: b.id });
            }
          });
          // Rubric items must have positive maxPoints and weight
          (Array.isArray(b.rubric) ? b.rubric : []).forEach((rc: any, ri: number) => {
            if (rc && (Number(rc.maxPoints) <= 0 || Number(rc.weight) <= 0)) {
              out.push({ message: `Rubric item #${ri+1} must have positive maxPoints and weight`, severity: 'warning', code: 'assignment.rubric.invalid', moduleId: m.id, blockId: b.id });
            }
          });
          // Totals check: compare assignmentPoints vs rubric totals
          if (typeof b.assignmentPoints === 'number' && Array.isArray(b.rubric) && b.rubric.length > 0) {
            const sumMax = b.rubric.reduce((acc: number, rc: any) => acc + (Number(rc?.maxPoints) || 0), 0);
            const sumWeighted = b.rubric.reduce((acc: number, rc: any) => acc + (Number(rc?.maxPoints) || 0) * (Number(rc?.weight) || 0), 0);
            const pts = Number(b.assignmentPoints) || 0;
            // If points don't match either common scheme, warn
            if (pts !== sumMax && pts !== sumWeighted) {
              out.push({
                message: `Assignment points (${pts}) do not match rubric totals (max=${sumMax}${sumWeighted !== sumMax ? `, weighted=${sumWeighted}` : ''}).`,
                severity: 'warning',
                code: 'assignment.rubric.totals.mismatch',
                moduleId: m.id,
                blockId: b.id,
              });
            }
          }
        }
        if (b.displayIndex) {
          if (idxSet.has(b.displayIndex)) out.push({ message: `Duplicate block displayIndex ${b.displayIndex} in module ${m.title || m.id}` , severity: 'warning', code: 'block.displayIndex.duplicate', moduleId: m.id, blockId: b.id }); else idxSet.add(b.displayIndex);
        }
      });
    });
    (c?.modules || []).forEach((m: any) => {
      (m.prerequisites || []).forEach((pid: string) => {
        if (!moduleIdSet.has(pid)) out.push({ message: `Module ${m.title || m.id} has orphan prerequisite ${pid}`, severity: 'warning', code: 'module.prereq.orphan', moduleId: m.id });
      });
    });
    return out;
  };

  // Merge incoming course JSON into current course
  const mergeCourses = (curr: any, incoming: any) => {
    if (!curr) return structuredClone(incoming);
    const topFields = ['title','description','customHtml','language','difficulty','tags','imageUrl','imageHint','thumbnailUrl','learningObjectives','isPublished','isActive','isFree','prerequisites'];
    const out: any = { ...curr };
    topFields.forEach((k) => {
      if (incoming[k] !== undefined) out[k] = structuredClone(incoming[k]);
    });
    const currMods: any[] = Array.isArray(curr.modules) ? structuredClone(curr.modules) : [];
    const incomingMods: any[] = Array.isArray(incoming.modules) ? structuredClone(incoming.modules) : [];
    const map = new Map(currMods.map((m: any) => [m.id, m]));
    for (const im of incomingMods) {
      if (!im?.id) continue;
      if (map.has(im.id)) {
        const cm = map.get(im.id);
        // merge module fields
        const modFields = ['title','description','order','displayIndex','estimatedHours','isLocked','sequentialRequired','learningObjectives','tags','prerequisites'];
        modFields.forEach((k) => { if (im[k] !== undefined) cm[k] = structuredClone(im[k]); });
        // merge content blocks by id
        const cbMap: Map<string, any> = new Map((cm.contentBlocks || []).map((b: any) => [String(b.id), b as any]));
        for (const ib of (im.contentBlocks || [])) {
          if (!ib?.id) continue;
          if (cbMap.has(String(ib.id))) {
            const cb: any = cbMap.get(String(ib.id));
            const bFields = ['displayIndex','type','title','content','html','order','estimatedMinutes','videoUrl','videoDuration','requiredPercent','codeLanguage','codeTemplate','codeContent','codeKind','timeLimitMs','memoryLimitMb','testCases','bullets','bulletsMarkdown','imageUrl','alt','caption','isRequired','quiz','items'];
            bFields.forEach((k) => { if (ib[k] !== undefined) cb[k] = structuredClone(ib[k]); });
          } else {
            cbMap.set(String(ib.id), structuredClone(ib));
          }
        }
        cm.contentBlocks = Array.from(cbMap.values());
      } else {
        map.set(im.id, structuredClone(im));
      }
    }
    out.modules = Array.from(map.values());
    return out;
  };

  // Auto-fix a subset of issues safely
  const applyAutoFixes = () => {
    setCourse((c: any) => {
      if (!c) return c;
      // 1) Ensure module ids and orders
      const mods = [...(c.modules || [])]
        .map((m: any, mi: number) => ({
          ...m,
          id: m.id || `m-${Date.now()}-${mi}`,
        }))
        .sort((a, b) => (typeof a.order === 'number' && typeof b.order === 'number') ? a.order - b.order : 0)
        .map((m: any, mi: number) => ({
          ...m,
          order: typeof m.order === 'number' ? m.order : mi + 1,
          contentBlocks: [...(m.contentBlocks || [])]
            .map((b: any, bi: number) => ({ ...b, id: b.id || `b-${Date.now()}-${mi}-${bi}` }))
            .sort((a: any, b: any) => (typeof a.order === 'number' && typeof b.order === 'number') ? a.order - b.order : 0)
            .map((b: any, bi: number, arr: any[]) => ({
              ...b,
              order: typeof b.order === 'number' ? b.order : bi + 1,
              // clear duplicate displayIndex (will be regenerated by Auto Index if needed)
              displayIndex: b.displayIndex || '',
            })),
        }));
      // 2) Drop orphan prerequisites
      const idSet = new Set(mods.map((m: any) => m.id));
      const fixedMods = mods.map((m: any) => ({
        ...m,
        prerequisites: (m.prerequisites || []).filter((pid: string) => idSet.has(pid)),
      }));
      return { ...c, modules: fixedMods };
    });
    // Re-run validation after the state update (small timeout)
    setTimeout(() => {
      setValidation((v) => ({ checkedAt: Date.now(), issues: buildValidation(course).map(i => i.message) }));
    }, 0);
  };

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
        // Stable reorder via splice then reindex orders
        const reordered = [...blocks];
        const [moved] = reordered.splice(idx, 1);
        reordered.splice(target, 0, moved);
        const withOrder = reordered.map((b: any, i: number) => ({ ...b, order: i + 1 }));
        return { ...m, contentBlocks: withOrder };
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
      // Stable reorder via splice then reindex orders
      const reordered = [...mods];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(target, 0, moved);
      const withOrder = reordered.map((m: any, i: number) => ({ ...m, order: i + 1 }));
      return { ...c, modules: withOrder };
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

  const insertBlockAt = (mid: string, index: number, type: string) => {
    setCourse((c: any) => ({
      ...c,
      modules: (c.modules || []).map((m: any) => {
        if (m.id !== mid) return m;
        const blocks = [...(m.contentBlocks || [])].sort((a: any, b: any) => a.order - b.order);
        const newBlock: any = {
          id: `b-${Date.now()}`,
          title: type === 'text' ? 'Text' : type === 'bullets' ? 'Bullet List' : type === 'image' ? 'Image' : type === 'code' ? 'Code Snippet' : type === 'video' ? 'Video' : type === 'quiz' ? 'Quiz' : type === 'assignment' ? 'Assignment' : type === 'composite' ? 'Composite' : type === 'html' ? 'HTML' : type,
          type,
          displayIndex: '',
          estimatedMinutes: 5,
          ...(type === 'text' ? { content: '' } : {}),
          ...(type === 'html' ? { html: '' } : {}),
          ...(type === 'bullets' ? { bullets: [] } : {}),
          ...(type === 'image' ? { imageUrl: '', alt: '', caption: '' } : {}),
          ...(type === 'code' ? { codeLanguage: 'javascript', codeTemplate: '', codeContent: '' } : {}),
          ...(type === 'assignment' ? { content: 'Complete the coding assignment below:', codeLanguage: 'javascript', codeContent: '// Write your solution here\n', codeKind: 'exam', testCases: [] } : {}),
          ...(type === 'quiz' ? { quiz: { questions: [], passingScore: 70, allowRetakes: true, timeLimit: null } } : {}),
          ...(type === 'composite' ? { items: [] } : {}),
        };
        const clamped = Math.max(0, Math.min(index, blocks.length));
        blocks.splice(clamped, 0, newBlock);
        // reassign orders
        const withOrder = blocks.map((b: any, i: number) => ({ ...b, order: i + 1 }));
        return { ...m, contentBlocks: withOrder };
      }),
    }));
  };

  const addBlockOfType = (mid: string, type: string) => {
    setCourse((c: any) => ({
      ...c,
      modules: (c.modules || []).map((m: any) => (m.id === mid ? {
        ...m,
        contentBlocks: [...(m.contentBlocks || []), {
          id: `b-${Date.now()}`,
          title: type === 'text' ? 'Text' : 
                 type === 'bullets' ? 'Bullet List' : 
                 type === 'image' ? 'Image' : 
                 type === 'code' ? 'Code Snippet' : 
                 type === 'quiz' ? 'Quiz' :
                 type === 'assignment' ? 'Code Assignment' :
                 type === 'video' ? 'Video' :
                 type === 'composite' ? 'Composite' :
                 type === 'html' ? 'HTML' : type,
          type,
          order: (m.contentBlocks?.length || 0) + 1,
          displayIndex: '',
          estimatedMinutes: 5,
          isRequired: type === 'quiz' || type === 'assignment', // Auto-mark quiz and assignments as required
          ...(type === 'text' ? { content: '' } : {}),
          ...(type === 'html' ? { html: '' } : {}),
          ...(type === 'bullets' ? { bullets: [] } : {}),
          ...(type === 'image' ? { imageUrl: '', alt: '', caption: '' } : {}),
          ...(type === 'video' ? { videoUrl: '' } : {}),
          ...(type === 'code' ? { codeLanguage: 'javascript', codeTemplate: '', codeContent: '' } : {}),
          ...(type === 'quiz' ? { 
            quiz: { 
              questions: [], 
              passingScore: 70, 
              allowRetakes: true,
              timeLimit: null 
            } 
          } : {}),
          ...(type === 'assignment' ? { 
            content: 'Complete the coding assignment below:', 
            codeLanguage: 'javascript', 
            codeContent: '// Write your solution here\n',
            codeKind: 'exam',
            testCases: []
          } : {}),
          ...(type === 'composite' ? { items: [] } : {}),
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
      <div className="glass-card mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold">Edit Course</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => {
              setCourse((c: any) => {
                const mods = [...(c.modules || [])].sort((a, b) => a.order - b.order);
                const updated = mods.map((m: any, idx: number) => ({
                  ...m,
                  prerequisites: mods.slice(0, idx).map((x: any) => x.id),
                }));
                return { ...c, modules: updated };
              });
            }}>Set prerequisites sequentially</Button>
            <Button variant="outline" onClick={() => {
              // Clear prerequisites on all modules
              setCourse((c: any) => ({
                ...c,
                modules: (c.modules || []).map((m: any) => ({ ...m, prerequisites: [] })),
              }));
            }}>Clear all prerequisites</Button>
            <Button variant="outline" onClick={() => {
              // Auto mark required for quiz and code exam blocks across all modules
              setCourse((c: any) => ({
                ...c,
                modules: (c.modules || []).map((m: any) => ({
                  ...m,
                  contentBlocks: (m.contentBlocks || []).map((b: any) => ({
                    ...b,
                    isRequired: !!b.isRequired || b.type === 'quiz' || (b.type === 'code' && (b.codeKind === 'exam')),
                  })),
                })),
              }));
            }}>Auto-mark required</Button>
            <Button variant="outline" onClick={() => {
              // Normalize IDs & Orders across modules and blocks
              setCourse((c: any) => {
                const mods = [...(c.modules || [])]
                  .sort((a, b) => a.order - b.order)
                  .map((m: any, mi: number) => ({
                    ...m,
                    id: m.id || `m-${Date.now()}-${mi}`,
                    order: mi + 1,
                    displayIndex: m.displayIndex || '',
                    contentBlocks: [...(m.contentBlocks || [])]
                      .sort((a: any, b: any) => a.order - b.order)
                      .map((b: any, bi: number) => ({
                        ...b,
                        id: b.id || `b-${Date.now()}-${mi}-${bi}`,
                        order: bi + 1,
                        displayIndex: b.displayIndex || '',
                      })),
                  }));
                return { ...c, modules: mods };
              });
            }}>Normalize IDs & Orders</Button>
            <Button variant="outline" onClick={autoGenerateIndices}>Auto Index</Button>
            <Button variant="outline" onClick={() => {
              // Validate course and show inline panel
              const full = buildValidation(course);
              setValidation({ checkedAt: Date.now(), issues: full.map(i => `${i.severity.toUpperCase()}: ${i.message}`), items: full });
            }}>Validate Course</Button>
            <Button variant="admin" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString()}` : 'Not yet saved'} • Auto-save {autoSaveEnabled ? 'On' : 'Off'}</div>
      </div>

      {/* Inline validation panel */}
      {validation.checkedAt !== undefined && (
        <Card className="rounded-xl border-amber-300/60">
          <CardHeader>
            <CardTitle>Validation {validation.issues.length === 0 ? 'Passed' : 'Issues'}</CardTitle>
          </CardHeader>
          <CardContent>
            {validation.issues.length === 0 ? (
              <div className="text-sm text-green-700">No issues found.</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-red-700">Found {validation.issues.length} issue(s):</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={applyAutoFixes}>Auto-fix common issues</Button>
                    <Button size="sm" variant="outline" onClick={autoGenerateIndices}>Auto Index</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      // Re-run validation only
                      const full = buildValidation(course);
                      setValidation({ checkedAt: Date.now(), issues: full.map(i => `${i.severity.toUpperCase()}: ${i.message}`), items: full });
                    }}>Re-validate</Button>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Import Mode</Label>
                      <Select value={importMode} onValueChange={(v) => setImportMode(v as any)}>
                        <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="merge">Merge</SelectItem>
                          <SelectItem value="replace">Replace</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => {
                      // Export validation report as JSON
                      const payload = {
                        generatedAt: new Date().toISOString(),
                        courseId: course?.id,
                        issueCount: validation.items?.length || 0,
                        issues: (validation.items || []).map(i => ({
                          severity: i.severity,
                          message: i.message,
                          code: i.code,
                          moduleId: i.moduleId,
                          blockId: i.blockId,
                        })),
                      };
                      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${course?.id || 'course'}-validation-report.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}>Export Report</Button>
                    <label className="inline-flex">
                      <input
                        type="file"
                        accept="application/json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            try {
                              const json = JSON.parse(String(reader.result) || '{}');
                              if (!json || typeof json !== 'object') throw new Error('Invalid JSON');
                              // Support both report payload (payload.courseId, issues) and direct course JSON
                              const maybeCourse = json.course || json.data?.course || (json.modules && json.title ? json : null);
                              if (maybeCourse) {
                                setCourse((prev: any) => importMode === 'merge' ? mergeCourses(prev, maybeCourse) : structuredClone(maybeCourse));
                                ignoreNextAutoSave.current = true;
                              } else {
                                // Not a course object; if it looks like a validation payload, just load issues
                                if (Array.isArray(json.issues)) {
                                  const items = (json.issues || []).map((i: any) => ({
                                    severity: i.severity || 'info',
                                    message: i.message || String(i),
                                    code: i.code || 'imported',
                                    moduleId: i.moduleId,
                                    blockId: i.blockId,
                                  })) as ValIssue[];
                                  setValidation({ checkedAt: Date.now(), issues: items.map(i => `${i.severity.toUpperCase()}: ${i.message}`), items });
                                }
                              }
                            } catch {}
                          };
                          reader.readAsText(file);
                          // reset input to allow same-file re-import
                          e.currentTarget.value = '';
                        }}
                      />
                      <Button size="sm" variant="outline">Import Course JSON</Button>
                    </label>
                  </div>
                </div>
                <ul className="ml-1 space-y-1 text-sm">
                  {validation.issues.map((msg, i) => {
                    const sev = msg.startsWith('ERROR') ? 'error' : msg.startsWith('WARNING') ? 'warning' : 'info';
                    const color = sev === 'error' ? 'text-red-700' : sev === 'warning' ? 'text-amber-700' : 'text-slate-700';
                    return (
                      <li key={i} className={`pl-2 border-l-4 ${sev === 'error' ? 'border-red-400' : sev === 'warning' ? 'border-amber-400' : 'border-slate-400'}`}>
                        <span className={`font-medium mr-2 uppercase ${color}`}>{sev}</span>
                        <span>{msg.replace(/^(ERROR|WARNING|INFO):\s*/, '')}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-xl border">
            <CardHeader><CardTitle>Course Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div className="flex items-center gap-2">
                  <Switch checked={!!course.isPublished} onCheckedChange={(v) => setCourse({ ...course, isPublished: !!v })} />
                  <Label className="cursor-pointer" onClick={() => setCourse({ ...course, isPublished: !course.isPublished })}>Published</Label>
                </div>
                <div className="md:col-span-2">
                  <Label>Tags (comma separated)</Label>
                  <Input value={(course.tags || []).join(', ')} onChange={(e) => {
                    const arr = (e.target.value || '').split(',').map(s => s.trim()).filter(Boolean);
                    setCourse({ ...course, tags: arr });
                  }} placeholder="html, css, beginner" />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={course.description} onChange={(e) => setCourse({ ...course, description: e.target.value })} />
              </div>
              <div>
                <Label>Custom HTML (renders on course overview page)</Label>
                <Textarea
                  value={course.customHtml || ''}
                  onChange={(e) => setCourse({ ...course, customHtml: e.target.value })}
                  placeholder="<div class='p-3 rounded bg-muted'>Welcome to the course</div>"
                />
                <div className="mt-2 border rounded p-2 bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-1">Preview (sanitized)</div>
                  <HtmlRenderer html={course.customHtml || ''} />
                </div>
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
                {/* ETA removed per request */}
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Hero Image URL</Label>
                  <Input value={course.imageUrl || ''} onChange={(e) => setCourse({ ...course, imageUrl: e.target.value })} placeholder="https://..." />
                  {course.imageUrl && (
                    <div className="mt-2"><img src={course.imageUrl} alt="Hero" className="w-full max-h-48 object-cover rounded" /></div>
                  )}
                </div>
                <div>
                  <Label>Thumbnail URL</Label>
                  <Input value={course.thumbnailUrl || ''} onChange={(e) => setCourse({ ...course, thumbnailUrl: e.target.value })} placeholder="https://..." />
                  {course.thumbnailUrl && (
                    <div className="mt-2"><img src={course.thumbnailUrl} alt="Thumbnail" className="h-24 w-24 object-cover rounded" /></div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modules Editor */}

          {/* Quick controls */}
          <Card className="rounded-xl glass-card shadow-soft">
            <CardHeader className="py-3 flex flex-row items-center justify-between">
              <CardTitle>Editor Tools</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" onClick={() => {
                  setCourse((c: any) => {
                    const mods = [...(c.modules || [])].sort((a, b) => a.order - b.order);
                    const updated = mods.map((m: any, idx: number) => ({
                      ...m,
                      prerequisites: mods.slice(0, idx).map((x: any) => x.id),
                    }));
                    return { ...c, modules: updated };
                  });
                }}>Set prerequisites sequentially</Button>
                <Button variant="outline" onClick={() => {
                  setCourse((c: any) => ({
                    ...c,
                    modules: (c.modules || []).map((m: any) => ({ ...m, prerequisites: [] })),
                  }));
                }}>Clear all prerequisites</Button>
                <Button variant="outline" onClick={() => {
                  setCourse((c: any) => ({
                    ...c,
                    modules: (c.modules || []).map((m: any) => ({
                      ...m,
                      contentBlocks: (m.contentBlocks || []).map((b: any) => ({
                        ...b,
                        isRequired: !!b.isRequired || b.type === 'quiz' || (b.type === 'code' && (b.codeKind === 'exam')),
                      })),
                    })),
                  }));
                }}>Auto-mark required</Button>
                <Button variant="outline" onClick={() => {
                  setCourse((c: any) => {
                    const mods = [...(c.modules || [])]
                      .sort((a, b) => a.order - b.order)
                      .map((m: any, mi: number) => ({
                        ...m,
                        id: m.id || `m-${Date.now()}-${mi}`,
                        order: mi + 1,
                        displayIndex: m.displayIndex || '',
                        contentBlocks: [...(m.contentBlocks || [])]
                          .sort((a: any, b: any) => a.order - b.order)
                          .map((b: any, bi: number) => ({
                            ...b,
                            id: b.id || `b-${Date.now()}-${mi}-${bi}`,
                            order: bi + 1,
                            displayIndex: b.displayIndex || '',
                          })),
                      }));
                    return { ...c, modules: mods };
                  });
                }}>Normalize IDs & Orders</Button>
                <Button variant="outline" onClick={autoGenerateIndices}>Auto Index</Button>
                <Button variant="outline" onClick={() => {
                  // Validate course and show inline panel
                  const full = buildValidation(course);
                  setValidation({ checkedAt: Date.now(), issues: full.map(i => `${i.severity.toUpperCase()}: ${i.message}`), items: full });
                }}>Validate Course</Button>
                <Button variant="admin" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
              </div>
            </CardHeader>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Modules</CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  const allModules = course.modules || [];
                  const allCollapsed = allModules.every((m: any) => isModuleCollapsed(m.id));
                  allModules.forEach((m: any) => setModuleCollapsed(m.id, !allCollapsed));
                }} 
                size="sm" 
                variant="outline"
              >
                {(course.modules || []).every((m: any) => isModuleCollapsed(m.id)) ? 'Expand All' : 'Collapse All'}
              </Button>
              <Button onClick={addModule} size="sm" variant="admin">Add Module</Button>
            </div>
          </CardHeader>
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
              .map((m: any, i: number, arr: any[]) => {
                const moduleIsCollapsed = isModuleCollapsed(m.id);
                return (
                <div
                  key={m.id}
                  className={`relative glass-card p-4 space-y-3 ${selectedModuleId === m.id ? 'ring-2 ring-primary/50' : ''}`}
                >
                  {/* Module Header */}
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => setModuleCollapsed(m.id, !moduleIsCollapsed)}
                    >
                      {moduleIsCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          {m.displayIndex || `Module ${i + 1}`}
                        </span>
                        <span className="font-semibold">{m.title || 'Untitled Module'}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(m.contentBlocks || []).length} blocks)
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!moduleIsCollapsed && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="admin">+ Block</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => addBlockOfType(m.id, 'text')}>
                              📝 Text Block
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addBlockOfType(m.id, 'bullets')}>
                              📋 Bullet List
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addBlockOfType(m.id, 'image')}>
                              🖼️ Image
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addBlockOfType(m.id, 'video')}>
                              🎥 Video
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addBlockOfType(m.id, 'code')}>
                              💻 Code Snippet
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addBlockOfType(m.id, 'quiz')}>
                              ❓ Quiz
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addBlockOfType(m.id, 'assignment')}>
                              📚 Assignment
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addBlockOfType(m.id, 'html')}>
                              🧩 HTML
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addBlockOfType(m.id, 'composite')}>
                              📦 Composite
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {/* Module Content - Only show when not collapsed */}
                  {!moduleIsCollapsed && (
                    <div className="space-y-3"
                         onClick={() => setSelectedModuleId(m.id)}
                         role="button"
                         tabIndex={0}
                    >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
                  <div className="flex gap-2 flex-wrap">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => moveModule(m.id, -1)} disabled={i === 0}>
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Move Up</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => moveModule(m.id, +1)} disabled={i === arr.length - 1}>
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Move Down</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => {
                          setCourse((c: any) => {
                            const mods = [...(c.modules || [])].sort((a, b) => a.order - b.order);
                            const copy = structuredClone(m);
                            copy.id = `m-${Date.now()}`;
                            copy.title = `${m.title} (Copy)`;
                            copy.order = (mods.length + 1);
                            copy.displayIndex = '';
                            copy.contentBlocks = (copy.contentBlocks || []).map((b: any, j: number) => ({ ...b, id: `b-${Date.now()}-${j}`, displayIndex: '', order: j + 1 }));
                            return { ...c, modules: [...mods, copy] };
                          });
                          }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Duplicate Module</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="destructive" size="icon" onClick={() => removeModule(m.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove Module</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <div className="flex items-center gap-2">
                      <Switch checked={!!m.isLocked} onCheckedChange={(v) => updateModule(m.id, { isLocked: !!v })} />
                      <Label className="cursor-pointer" onClick={() => updateModule(m.id, { isLocked: !m.isLocked })}>Locked</Label>
                    </div>
                    <div className={`rounded-md p-2 ${m.sequentialRequired ? 'border-amber-400 bg-amber-50' : 'border-muted'}`}>
                      <div className="flex items-center gap-2">
                        <Switch checked={!!m.sequentialRequired} onCheckedChange={(v) => updateModule(m.id, { sequentialRequired: !!v })} />
                        <Label className="cursor-pointer" onClick={() => updateModule(m.id, { sequentialRequired: !m.sequentialRequired })}>Sequential Required</Label>
                        {m.sequentialRequired && <span className="text-xs text-amber-700">Enforces order of required blocks</span>}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Prerequisite Modules</Label>
                      <div className="mt-2 border rounded p-2 max-h-40 overflow-auto space-y-1">
                        {(course.modules || []).filter((mm: any) => mm.id !== m.id).sort((a: any, b: any) => a.order - b.order).map((mm: any) => {
                          const list = Array.isArray(m.prerequisites) ? m.prerequisites : [];
                          const checked = list.includes(mm.id);
                          return (
                            <label key={mm.id} className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={checked} onChange={(e) => {
                                const next = new Set<string>(list);
                                if (e.target.checked) next.add(mm.id); else next.delete(mm.id);
                                updateModule(m.id, { prerequisites: Array.from(next) as any });
                              }} />
                              <span>{mm.displayIndex ? `${mm.displayIndex} ` : ''}{mm.title}</span>
                            </label>
                          );
                        })}
                        {((course.modules || []).filter((mm: any) => mm.id !== m.id).length === 0) && (
                          <div className="text-xs text-muted-foreground">No other modules to select.</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="destructive" size="sm" onClick={() => removeModule(m.id)}>Remove Module</Button>
                  </div>
                  <div className="space-y-3">
                    {(m.contentBlocks || []).sort((a: any, b: any) => a.order - b.order).map((b: any, bi: number, barr: any[]) => (
                      <div key={b.id} className="border rounded p-3">
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                          <div>
                            <Label>Idx</Label>
                            <Input value={b.displayIndex || ''} onChange={(e) => updateBlock(m.id, b.id, { displayIndex: e.target.value })} placeholder={`${m.displayIndex || ''}.1`} />
                          </div>
                          <div className="mt-2 flex gap-2 items-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" onClick={() => moveBlock(m.id, b.id, -1)} disabled={bi === 0}>
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Move Up</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" onClick={() => moveBlock(m.id, b.id, +1)} disabled={bi === barr.length - 1}>
                                    <ArrowDown className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Move Down</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => insertBlockAt(m.id, bi, 'text')}>Insert Text Above</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => insertBlockAt(m.id, bi, 'video')}>Insert Video Above</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => insertBlockAt(m.id, bi, 'code')}>Insert Code Above</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => insertBlockAt(m.id, bi, 'bullets')}>Insert Bullets Above</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => insertBlockAt(m.id, bi, 'image')}>Insert Image Above</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => insertBlockAt(m.id, bi, 'html')}>Insert HTML Above</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => insertBlockAt(m.id, bi, 'composite')}>Insert Composite Above</DropdownMenuItem>
                                <Separator className="my-1" />
                                <DropdownMenuItem onClick={() => insertBlockAt(m.id, bi + 1, 'text')}>Insert Text Below</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => insertBlockAt(m.id, bi + 1, 'video')}>Insert Video Below</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => insertBlockAt(m.id, bi + 1, 'code')}>Insert Code Below</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => insertBlockAt(m.id, bi + 1, 'bullets')}>Insert Bullets Below</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => insertBlockAt(m.id, bi + 1, 'image')}>Insert Image Below</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => insertBlockAt(m.id, bi + 1, 'html')}>Insert HTML Below</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => insertBlockAt(m.id, bi + 1, 'composite')}>Insert Composite Below</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div>
                            <Label>Type</Label>
                            <Select value={b.type} onValueChange={(v) => updateBlock(m.id, b.id, { type: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="html">HTML</SelectItem>
                                <SelectItem value="video">Video</SelectItem>
                                <SelectItem value="code">Code</SelectItem>
                                <SelectItem value="quiz">Quiz</SelectItem>
                                <SelectItem value="assignment">Assignment</SelectItem>
                                <SelectItem value="bullets">Bullets</SelectItem>
                                <SelectItem value="image">Image</SelectItem>
                                <SelectItem value="composite">Composite</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-3">
                            <Label>Title</Label>
                            <Input value={b.title} onChange={(e) => updateBlock(m.id, b.id, { title: e.target.value })} />
                          </div>
                          <div>
                            <Label>Order</Label>
                            <Input type="number" value={b.order} onChange={(e) => updateBlock(m.id, b.id, { order: Number(e.target.value) })} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={!!b.isRequired} onCheckedChange={(v) => updateBlock(m.id, b.id, { isRequired: !!v })} />
                            <Label className="cursor-pointer" onClick={() => updateBlock(m.id, b.id, { isRequired: !b.isRequired })}>Required</Label>
                          </div>
                        </div>
                        {b.type === 'text' && (
                          <div className="mt-2 space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <div className="md:col-span-3">
                                <Label>Content (Markdown supported)</Label>
                                <Textarea value={b.content || ''} onChange={(e) => updateBlock(m.id, b.id, { content: e.target.value, markdown: true })} />
                              </div>
                              <div>
                                <Label>Heading Level</Label>
                                <Input type="number" value={b.textHeadingLevel || 0} onChange={(e) => updateBlock(m.id, b.id, { textHeadingLevel: Number(e.target.value) || 0 })} />
                              </div>
                              <div>
                                <Label>Font Size (px)</Label>
                                <Input value={b.textFontSize || ''} onChange={(e) => updateBlock(m.id, b.id, { textFontSize: e.target.value })} placeholder="e.g. 16px" />
                                <div className="flex gap-1 mt-1">
                                  {[
                                    { k: 'sm', v: '14px' },
                                    { k: 'md', v: '16px' },
                                    { k: 'lg', v: '18px' },
                                    { k: 'xl', v: '24px' },
                                  ].map((p) => (
                                    <Button key={p.k} type="button" size="sm" variant={b.textFontSize === p.v ? 'default' : 'outline'} onClick={() => updateBlock(m.id, b.id, { textFontSize: p.v })}>
                                      {p.k}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="border rounded p-2 bg-muted/30">
                              <div className="text-xs text-muted-foreground mb-1">Preview</div>
                              {(() => {
                                const style: any = {};
                                if (b.textFontSize) style.fontSize = b.textFontSize;
                                const lvl = Number(b.textHeadingLevel) || 0;
                                const content = <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{b.content || ''}</ReactMarkdown>;
                                if (lvl >= 1 && lvl <= 6) {
                                  const Tag = (`h${lvl}` as any);
                                  return <Tag style={style}>{content}</Tag>;
                                }
                                return <div style={style}>{content}</div>;
                              })()}
                            </div>
                          </div>
                        )}
                        {b.type === 'html' && (
                          <div className="mt-2 space-y-2">
                            <div>
                              <Label>HTML</Label>
                              <Textarea value={b.html || ''} onChange={(e) => updateBlock(m.id, b.id, { html: e.target.value })} placeholder="<div class='p-4 text-sm'>Custom content...</div>" />
                            </div>
                            <div className="border rounded p-2 bg-muted/30">
                              <div className="text-xs text-muted-foreground mb-1">Preview (sanitized)</div>
                              <HtmlRenderer html={b.html || ''} />
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
                              <Label>Minimum Watch Percent (%)</Label>
                              <Input type="number" value={typeof b.requiredPercent === 'number' ? Math.round(b.requiredPercent * 100) : 80} onChange={(e) => {
                                const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                updateBlock(m.id, b.id, { requiredPercent: val / 100 });
                              }} />
                            </div>
                          </div>
                        )}
                        {b.type === 'code' && (
                          <div className="mt-2">
                            <div className="rounded-md overflow-hidden border bg-[#1e1e1e]">
                              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
                                  <span className="inline-block h-3 w-3 rounded-full bg-yellow-500" />
                                  <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                                </div>
                                <div className="flex items-center gap-2 text-gray-200">
                                  <Label className="text-xs text-gray-400">Language</Label>
                                  <Select value={b.codeLanguage || 'javascript'} onValueChange={(v) => updateBlock(m.id, b.id, { codeLanguage: v })}>
                                    <SelectTrigger className="h-7 w-40 bg-[#2a2a2a] text-gray-100 border-white/10"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="javascript">JavaScript</SelectItem>
                                      <SelectItem value="typescript">TypeScript</SelectItem>
                                      <SelectItem value="python">Python</SelectItem>
                                      <SelectItem value="java">Java</SelectItem>
                                      <SelectItem value="html">HTML</SelectItem>
                                      <SelectItem value="css">CSS</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <div className="text-xs text-gray-400 ml-2">
                                    {((b.codeContent || '').split(/\r?\n/).length)} lines • {(b.codeContent || '').length} chars
                                  </div>
                                </div>
                              </div>
                              <div className="p-3">
                                <Textarea value={b.codeContent || ''} onChange={(e) => updateBlock(m.id, b.id, { codeContent: e.target.value })} className="font-mono bg-[#1e1e1e] text-gray-100 border-none outline-none min-h-40" />
                              </div>
                            </div>
                          </div>
                        )}
                        {b.type === 'bullets' && (
                          <div className="mt-2">
                            <Label>List (newline = new bullet)</Label>
                            <Textarea value={(b.bullets || []).join("\n")} onChange={(e) => {
                              const lines = (e.target.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                              updateBlock(m.id, b.id, { bullets: lines });
                            }} placeholder={"First item\nSecond item\nThird item"} />
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
                          </div>
                        )}
                        {b.type === 'assignment' && (
                          <div className="mt-2 space-y-3">
                            <div>
                              <Label>Assignment Instructions</Label>
                              <Textarea
                                value={b.content || ''}
                                onChange={(e) => updateBlock(m.id, b.id, { content: e.target.value })}
                                placeholder="Describe the task and requirements"
                              />
                            </div>
                            <div className="rounded-md overflow-hidden border bg-[#1e1e1e]">
                              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                                <div className="flex items-center gap-2 text-gray-200">
                                  <Label className="text-xs text-gray-400">Language</Label>
                                  <Select value={b.codeLanguage || 'javascript'} onValueChange={(v) => updateBlock(m.id, b.id, { codeLanguage: v })}>
                                    <SelectTrigger className="h-7 w-40 bg-[#2a2a2a] text-gray-100 border-white/10"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="javascript">JavaScript</SelectItem>
                                      <SelectItem value="typescript">TypeScript</SelectItem>
                                      <SelectItem value="python">Python</SelectItem>
                                      <SelectItem value="java">Java</SelectItem>
                                      <SelectItem value="html">HTML</SelectItem>
                                      <SelectItem value="css">CSS</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <div className="text-xs text-gray-400 ml-2">
                                    {((b.codeContent || '').split(/\r?\n/).length)} lines • {(b.codeContent || '').length} chars
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400">Code Kind: exam</div>
                              </div>
                              <div className="p-3">
                                <Textarea
                                  value={b.codeContent || ''}
                                  onChange={(e) => updateBlock(m.id, b.id, { codeContent: e.target.value, codeKind: 'exam' })}
                                  className="font-mono bg-[#1e1e1e] text-gray-100 border-none outline-none min-h-40"
                                  placeholder="// Starter code or submission template"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Test Cases</Label>
                                <Button size="sm" onClick={() => {
                                  const arr = Array.isArray(b.testCases) ? [...b.testCases] : [];
                                  arr.push({ id: `tc-${Date.now()}`, input: '', expectedOutput: '' });
                                  updateBlock(m.id, b.id, { testCases: arr });
                                }}>Add Case</Button>
                              </div>
                              <div className="space-y-2">
                                {(Array.isArray(b.testCases) ? b.testCases : []).map((tc: any, ti: number) => (
                                  <div key={tc.id || ti} className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded p-2">
                                    <div>
                                      <Label>Input</Label>
                                      <Textarea value={tc.input || ''} onChange={(e) => {
                                        const arr = Array.isArray(b.testCases) ? [...b.testCases] : [];
                                        arr[ti] = { ...tc, input: e.target.value };
                                        updateBlock(m.id, b.id, { testCases: arr });
                                      }} />
                                    </div>
                                    <div>
                                      <Label>Expected Output</Label>
                                      <Textarea value={tc.expectedOutput || ''} onChange={(e) => {
                                        const arr = Array.isArray(b.testCases) ? [...b.testCases] : [];
                                        arr[ti] = { ...tc, expectedOutput: e.target.value };
                                        updateBlock(m.id, b.id, { testCases: arr });
                                      }} />
                                    </div>
                                    <div className="md:col-span-2 flex justify-end">
                                      <Button variant="destructive" size="sm" onClick={() => {
                                        const arr = (b.testCases || []).filter((_: any, idx: number) => idx !== ti);
                                        updateBlock(m.id, b.id, { testCases: arr });
                                      }}>Remove</Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <div>
                                <Label>Points</Label>
                                <Input type="number" value={b.assignmentPoints ?? 0} onChange={(e) => updateBlock(m.id, b.id, { assignmentPoints: Math.max(0, Number(e.target.value) || 0) })} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Rubric Criteria</Label>
                                <Button size="sm" onClick={() => {
                                  const list = Array.isArray(b.rubric) ? [...b.rubric] : [];
                                  list.push({ id: `rb-${Date.now()}`, description: '', maxPoints: 1, weight: 1 });
                                  updateBlock(m.id, b.id, { rubric: list });
                                }}>Add Criterion</Button>
                              </div>
                              <div className="space-y-2">
                                {(Array.isArray(b.rubric) ? b.rubric : []).map((rc: any, ri: number) => (
                                  <div key={rc.id || ri} className="grid grid-cols-1 md:grid-cols-6 gap-2 border rounded p-2">
                                    <div className="md:col-span-3">
                                      <Label>Description</Label>
                                      <Input value={rc.description || ''} onChange={(e) => {
                                        const list = Array.isArray(b.rubric) ? [...b.rubric] : [];
                                        list[ri] = { ...rc, description: e.target.value };
                                        updateBlock(m.id, b.id, { rubric: list });
                                      }} />
                                    </div>
                                    <div>
                                      <Label>Max Points</Label>
                                      <Input type="number" value={rc.maxPoints ?? 1} onChange={(e) => {
                                        const list = Array.isArray(b.rubric) ? [...b.rubric] : [];
                                        list[ri] = { ...rc, maxPoints: Math.max(0, Number(e.target.value) || 0) };
                                        updateBlock(m.id, b.id, { rubric: list });
                                      }} />
                                    </div>
                                    <div>
                                      <Label>Weight</Label>
                                      <Input type="number" value={rc.weight ?? 1} onChange={(e) => {
                                        const list = Array.isArray(b.rubric) ? [...b.rubric] : [];
                                        list[ri] = { ...rc, weight: Math.max(0, Number(e.target.value) || 0) };
                                        updateBlock(m.id, b.id, { rubric: list });
                                      }} />
                                    </div>
                                    <div className="md:col-span-2 flex items-end justify-end">
                                      <Button variant="destructive" size="sm" onClick={() => {
                                        const list = (b.rubric || []).filter((_: any, idx: number) => idx !== ri);
                                        updateBlock(m.id, b.id, { rubric: list });
                                      }}>Remove</Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Attachments</Label>
                                <Button size="sm" onClick={() => {
                                  const list = Array.isArray(b.attachments) ? [...b.attachments] : [];
                                  list.push({ id: `att-${Date.now()}`, name: '', url: '' });
                                  updateBlock(m.id, b.id, { attachments: list });
                                }}>Add Attachment</Button>
                              </div>
                              <div className="space-y-2">
                                {(Array.isArray(b.attachments) ? b.attachments : []).map((at: any, ai: number) => (
                                  <div key={at.id || ai} className="grid grid-cols-1 md:grid-cols-6 gap-2 border rounded p-2">
                                    <div className="md:col-span-2">
                                      <Label>Name</Label>
                                      <Input value={at.name || ''} onChange={(e) => {
                                        const list = Array.isArray(b.attachments) ? [...b.attachments] : [];
                                        list[ai] = { ...at, name: e.target.value };
                                        updateBlock(m.id, b.id, { attachments: list });
                                      }} />
                                    </div>
                                    <div className="md:col-span-3">
                                      <Label>URL</Label>
                                      <Input value={at.url || ''} onChange={(e) => {
                                        const list = Array.isArray(b.attachments) ? [...b.attachments] : [];
                                        list[ai] = { ...at, url: e.target.value };
                                        updateBlock(m.id, b.id, { attachments: list });
                                      }} />
                                    </div>
                                    <div className="flex items-end">
                                      <Button variant="destructive" size="sm" onClick={() => {
                                        const list = (b.attachments || []).filter((_: any, idx: number) => idx !== ai);
                                        updateBlock(m.id, b.id, { attachments: list });
                                      }}>Remove</Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {b.type === 'composite' && (
                          <div className="mt-2 space-y-3">
                            <div className="flex items-center justify-between">
                              <Label>Composite Items</Label>
                              <Button size="sm" onClick={() => {
                                const items = Array.isArray(b.items) ? [...b.items] : [];
                                items.push({ id: `ci-${Date.now()}`, kind: 'markdown', content: 'New item' });
                                updateBlock(m.id, b.id, { items });
                              }}>Add Item</Button>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => collapseAllCompositeItems({ modules: [m] }, true)}>Collapse all items</Button>
                              <Button size="sm" variant="outline" onClick={() => collapseAllCompositeItems({ modules: [m] }, false)}>Expand all items</Button>
                            </div>
                            <div className="space-y-2">
                              {(Array.isArray(b.items) ? b.items : []).map((it: any, ii: number) => (
                                <div key={it.id || ii} className="glass-card space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Label className="text-xs">Kind</Label>
                                    <Select value={it.kind || 'markdown'} onValueChange={(v) => {
                                      const items = [...(b.items || [])];
                                      items[ii] = { ...it, kind: v };
                                      updateBlock(m.id, b.id, { items });
                                    }}>
                                      <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="markdown">Markdown</SelectItem>
                                        <SelectItem value="text">Text</SelectItem>
                                        <SelectItem value="html">HTML</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                        <SelectItem value="bullets">Bullets</SelectItem>
                                        <SelectItem value="code">Code</SelectItem>
                                        <SelectItem value="image">Image</SelectItem>
                                        <SelectItem value="composite">Composite</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <div className="ml-auto flex gap-2">
                                      <Button variant="outline" size="sm" onClick={() => setCollapsed(`compItem:${m.id}:${b.id}:${it.id || ''}`, !isCollapsed(`compItem:${m.id}:${b.id}:${it.id || ''}`))}>{isCollapsed(`compItem:${m.id}:${b.id}:${it.id || ''}`) ? 'Expand' : 'Collapse'}</Button>
                                      <Button variant="outline" size="sm" onClick={() => {
                                        if (ii === 0) return;
                                        const items = [...(b.items || [])];
                                        const tmp = items[ii - 1]; items[ii - 1] = items[ii]; items[ii] = tmp;
                                        updateBlock(m.id, b.id, { items });
                                      }}>Up</Button>
                                      <Button variant="outline" size="sm" onClick={() => {
                                        const items = [...(b.items || [])];
                                        if (ii >= items.length - 1) return;
                                        const tmp = items[ii + 1]; items[ii + 1] = items[ii]; items[ii] = tmp;
                                        updateBlock(m.id, b.id, { items });
                                      }}>Down</Button>
                                      <Button variant="destructive" size="sm" onClick={() => {
                                        const items = (b.items || []).filter((_: any, idx: number) => idx !== ii);
                                        updateBlock(m.id, b.id, { items });
                                      }}>Remove</Button>
                                    </div>
                                  </div>
                                  {!isCollapsed(`compItem:${m.id}:${b.id}:${it.id || ''}`) && it.kind === 'markdown' && (
                                    <div className="space-y-2">
                                      <div>
                                        <Label>Content</Label>
                                        <Textarea value={it.content || ''} onChange={(e) => {
                                          const items = [...(b.items || [])];
                                          items[ii] = { ...it, content: e.target.value };
                                          updateBlock(m.id, b.id, { items });
                                        }} />
                                      </div>
                                      <div className="border rounded p-2 bg-muted/30">
                                        <div className="text-xs text-muted-foreground mb-1">Preview</div>
                                        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{it.content || ''}</ReactMarkdown>
                                      </div>
                                    </div>
                                  )}
                                  {!isCollapsed(`compItem:${m.id}:${b.id}:${it.id || ''}`) && it.kind === 'html' && (
                                    <div className="space-y-2">
                                      <div>
                                        <Label>HTML</Label>
                                        <Textarea value={it.html || ''} onChange={(e) => {
                                          const items = [...(b.items || [])];
                                          items[ii] = { ...it, html: e.target.value };
                                          updateBlock(m.id, b.id, { items });
                                        }} />
                                      </div>
                                      <div className="border rounded p-2 bg-muted/30">
                                        <div className="text-xs text-muted-foreground mb-1">Preview (sanitized)</div>
                                        <HtmlRenderer html={it.html || ''} />
                                      </div>
                                    </div>
                                  )}
                                  {!isCollapsed(`compItem:${m.id}:${b.id}:${it.id || ''}`) && it.kind === 'text' && (
                                    <div className="space-y-2">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <div className="md:col-span-3">
                                          <Label>Text (Markdown supported)</Label>
                                          <Textarea value={it.content || ''} onChange={(e) => {
                                            const items = [...(b.items || [])];
                                            items[ii] = { ...it, content: e.target.value };
                                            updateBlock(m.id, b.id, { items });
                                          }} />
                                        </div>
                                        <div>
                                          <Label>Heading Level</Label>
                                          <Input type="number" value={it.textHeadingLevel || 0} onChange={(e) => {
                                            const items = [...(b.items || [])];
                                            items[ii] = { ...it, textHeadingLevel: Number(e.target.value) };
                                            updateBlock(m.id, b.id, { items });
                                          }} />
                                        </div>
                                        <div>
                                          <Label>Font Size (px)</Label>
                                          <Input value={it.textFontSize || ''} onChange={(e) => {
                                            const items = [...(b.items || [])];
                                            items[ii] = { ...it, textFontSize: e.target.value };
                                            updateBlock(m.id, b.id, { items });
                                          }} />
                                          <div className="flex gap-1 mt-1">
                                            {[
                                              { k: 'sm', v: '14px' },
                                              { k: 'md', v: '16px' },
                                              { k: 'lg', v: '18px' },
                                              { k: 'xl', v: '24px' },
                                            ].map((p) => (
                                              <Button key={p.k} type="button" size="sm" variant={it.textFontSize === p.v ? 'default' : 'outline'} onClick={() => {
                                                const items = [...(b.items || [])];
                                                items[ii] = { ...it, textFontSize: p.v };
                                                updateBlock(m.id, b.id, { items });
                                              }}>{p.k}</Button>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="border rounded p-2 bg-muted/30">
                                        <div className="text-xs text-muted-foreground mb-1">Preview</div>
                                        {(() => {
                                          const style: any = {};
                                          if (it.textFontSize) style.fontSize = it.textFontSize;
                                          const lvl = Number(it.textHeadingLevel) || 0;
                                          const content = <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{it.content || ''}</ReactMarkdown>;
                                          if (lvl >= 1 && lvl <= 6) {
                                            const Tag = (`h${lvl}` as any);
                                            return <Tag style={style}>{content}</Tag>;
                                          }
                                          return <div style={style}>{content}</div>;
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                  {!isCollapsed(`compItem:${m.id}:${b.id}:${it.id || ''}`) && it.kind === 'video' && (
                                    <div>
                                      <Label>Video URL</Label>
                                      <Input value={it.videoUrl || ''} onChange={(e) => {
                                        const items = [...(b.items || [])];
                                        items[ii] = { ...it, videoUrl: e.target.value };
                                        updateBlock(m.id, b.id, { items });
                                      }} />
                                    </div>
                                  )}
                                  {!isCollapsed(`compItem:${m.id}:${b.id}:${it.id || ''}`) && it.kind === 'bullets' && (
                                    <div>
                                      <Label>List (newline = new bullet)</Label>
                                      <Textarea value={(it.bullets || []).join("\n")} onChange={(e) => {
                                        const lines = (e.target.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                                        const items = [...(b.items || [])];
                                        items[ii] = { ...it, bullets: lines };
                                        updateBlock(m.id, b.id, { items });
                                      }} />
                                    </div>
                                  )}
                                  {!isCollapsed(`compItem:${m.id}:${b.id}:${it.id || ''}`) && it.kind === 'code' && (
                                    <div className="space-y-2">
                                      <div className="rounded-md overflow-hidden border bg-[#1e1e1e]">
                                        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                                          <div className="flex items-center gap-2">
                                            <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
                                            <span className="inline-block h-3 w-3 rounded-full bg-yellow-500" />
                                            <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                                          </div>
                                          <div className="flex items-center gap-2 text-gray-200">
                                            <Label className="text-xs text-gray-400">Language</Label>
                                            <Select value={it.codeLanguage || 'javascript'} onValueChange={(v) => {
                                              const items = [...(b.items || [])];
                                              items[ii] = { ...it, codeLanguage: v };
                                              updateBlock(m.id, b.id, { items });
                                            }}>
                                              <SelectTrigger className="h-7 w-40 bg-[#2a2a2a] text-gray-100 border-white/10"><SelectValue /></SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="javascript">JavaScript</SelectItem>
                                                <SelectItem value="typescript">TypeScript</SelectItem>
                                                <SelectItem value="python">Python</SelectItem>
                                                <SelectItem value="java">Java</SelectItem>
                                                <SelectItem value="html">HTML</SelectItem>
                                                <SelectItem value="css">CSS</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <div className="text-xs text-gray-400 ml-2">
                                              {((it.codeContent || '').split(/\r?\n/).length)} lines • {(it.codeContent || '').length} chars
                                            </div>
                                          </div>
                                        </div>
                                        <div className="p-3">
                                          <Textarea value={it.codeContent || ''} onChange={(e) => {
                                            const items = [...(b.items || [])];
                                            items[ii] = { ...it, codeContent: e.target.value };
                                            updateBlock(m.id, b.id, { items });
                                          }} className="font-mono bg-[#1e1e1e] text-gray-100 border-none outline-none min-h-40" />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {!isCollapsed(`compItem:${m.id}:${b.id}:${it.id || ''}`) && it.kind === 'image' && (
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
                                        <Label>Alt Text</Label>
                                        <Input value={it.alt || ''} onChange={(e) => {
                                          const items = [...(b.items || [])];
                                          items[ii] = { ...it, alt: e.target.value };
                                          updateBlock(m.id, b.id, { items });
                                        }} />
                                      </div>
                                    </div>
                                  )}
                                  {!isCollapsed(`compItem:${m.id}:${b.id}:${it.id || ''}`) && it.kind === 'composite' && (
                                    <div className="mt-2 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <Label>Nested Items</Label>
                                        <Button size="sm" onClick={() => {
                                          const outer = [...(b.items || [])];
                                          const nested = Array.isArray(it.items) ? [...it.items] : [];
                                          nested.push({ id: `ci-${Date.now()}`, kind: 'markdown', content: 'Nested item' });
                                          outer[ii] = { ...it, items: nested };
                                          updateBlock(m.id, b.id, { items: outer });
                                        }}>Add Nested Item</Button>
                                      </div>
                                      <div className="space-y-2">
                                        {(Array.isArray(it.items) ? it.items : []).map((nit: any, ni: number) => (
                                          <div key={nit.id || ni} className="glass-card space-y-2">
                                            <div className="flex items-center gap-2">
                                              <Label className="text-xs">Kind</Label>
                                              <Select value={nit.kind || 'markdown'} onValueChange={(v) => {
                                                const outer = [...(b.items || [])];
                                                const nested = Array.isArray(it.items) ? [...it.items] : [];
                                                nested[ni] = { ...nit, kind: v };
                                                outer[ii] = { ...it, items: nested };
                                                updateBlock(m.id, b.id, { items: outer });
                                              }}>
                                                <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="markdown">Markdown</SelectItem>
                                                  <SelectItem value="text">Text</SelectItem>
                                                  <SelectItem value="image">Image</SelectItem>
                                                  <SelectItem value="video">Video</SelectItem>
                                                  <SelectItem value="bullets">Bullets</SelectItem>
                                                  <SelectItem value="code">Code</SelectItem>
                                                </SelectContent>
                                              </Select>
                                              <div className="ml-auto flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setCollapsed(`compNested:${m.id}:${b.id}:${it.id || ''}:${nit.id || ''}`, !isCollapsed(`compNested:${m.id}:${b.id}:${it.id || ''}:${nit.id || ''}`))}>{isCollapsed(`compNested:${m.id}:${b.id}:${it.id || ''}:${nit.id || ''}`) ? 'Expand' : 'Collapse'}</Button>
                                                <Button variant="outline" size="sm" onClick={() => {
                                                  if (ni === 0) return;
                                                  const outer = [...(b.items || [])];
                                                  const nested = Array.isArray(it.items) ? [...it.items] : [];
                                                  const tmp = nested[ni - 1]; nested[ni - 1] = nested[ni]; nested[ni] = tmp;
                                                  outer[ii] = { ...it, items: nested };
                                                  updateBlock(m.id, b.id, { items: outer });
                                                }}>Up</Button>
                                                <Button variant="outline" size="sm" onClick={() => {
                                                  const outer = [...(b.items || [])];
                                                  const nested = Array.isArray(it.items) ? [...it.items] : [];
                                                  if (ni >= nested.length - 1) return;
                                                  const tmp = nested[ni + 1]; nested[ni + 1] = nested[ni]; nested[ni] = tmp;
                                                  outer[ii] = { ...it, items: nested };
                                                  updateBlock(m.id, b.id, { items: outer });
                                                }}>Down</Button>
                                                <Button variant="destructive" size="sm" onClick={() => {
                                                  const outer = [...(b.items || [])];
                                                  const nested = (it.items || []).filter((_: any, idx: number) => idx !== ni);
                                                  outer[ii] = { ...it, items: nested };
                                                  updateBlock(m.id, b.id, { items: outer });
                                                }}>Remove</Button>
                                              </div>
                                            </div>
                                            {!isCollapsed(`compNested:${m.id}:${b.id}:${it.id || ''}:${nit.id || ''}`) && nit.kind === 'markdown' && (
                                              <div className="space-y-2">
                                                <Label>Content</Label>
                                                <Textarea value={nit.content || ''} onChange={(e) => {
                                                  const outer = [...(b.items || [])];
                                                  const nested = Array.isArray(it.items) ? [...it.items] : [];
                                                  nested[ni] = { ...nit, content: e.target.value };
                                                  outer[ii] = { ...it, items: nested };
                                                  updateBlock(m.id, b.id, { items: outer });
                                                }} />
                                                <div className="border rounded p-2 bg-muted/30">
                                                  <div className="text-xs text-muted-foreground mb-1">Preview</div>
                                                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{nit.content || ''}</ReactMarkdown>
                                                </div>
                                              </div>
                                            )}
                                            {nit.kind === 'code' && (
                                              <div className="space-y-2">
                                                <div className="rounded-md overflow-hidden border bg-[#1e1e1e]">
                                                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                                                    <div className="flex items-center gap-2">
                                                      <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
                                                      <span className="inline-block h-3 w-3 rounded-full bg-yellow-500" />
                                                      <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-200">
                                                      <Label className="text-xs text-gray-400">Language</Label>
                                                      <Select value={nit.codeLanguage || 'javascript'} onValueChange={(v) => {
                                                        const outer = [...(b.items || [])];
                                                        const nested = Array.isArray(it.items) ? [...it.items] : [];
                                                        nested[ni] = { ...nit, codeLanguage: v };
                                                        outer[ii] = { ...it, items: nested };
                                                        updateBlock(m.id, b.id, { items: outer });
                                                      }}>
                                                        <SelectTrigger className="h-7 w-40 bg-[#2a2a2a] text-gray-100 border-white/10"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                          <SelectItem value="javascript">JavaScript</SelectItem>
                                                          <SelectItem value="typescript">TypeScript</SelectItem>
                                                          <SelectItem value="python">Python</SelectItem>
                                                          <SelectItem value="java">Java</SelectItem>
                                                          <SelectItem value="html">HTML</SelectItem>
                                                          <SelectItem value="css">CSS</SelectItem>
                                                        </SelectContent>
                                                      </Select>
                                                      <div className="text-xs text-gray-400 ml-2">
                                                        {((nit.codeContent || '').split(/\r?\n/).length)} lines • {(nit.codeContent || '').length} chars
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="p-3">
                                                    <Textarea value={nit.codeContent || ''} onChange={(e) => {
                                                      const outer = [...(b.items || [])];
                                                      const nested = Array.isArray(it.items) ? [...it.items] : [];
                                                      nested[ni] = { ...nit, codeContent: e.target.value };
                                                      outer[ii] = { ...it, items: nested };
                                                      updateBlock(m.id, b.id, { items: outer });
                                                    }} className="font-mono bg-[#1e1e1e] text-gray-100 border-none outline-none min-h-40" />
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                            {nit.kind === 'video' && (
                                              <div>
                                                <Label>Video URL</Label>
                                                <Input value={nit.videoUrl || ''} onChange={(e) => {
                                                  const outer = [...(b.items || [])];
                                                  const nested = Array.isArray(it.items) ? [...it.items] : [];
                                                  nested[ni] = { ...nit, videoUrl: e.target.value };
                                                  outer[ii] = { ...it, items: nested };
                                                  updateBlock(m.id, b.id, { items: outer });
                                                }} />
                                              </div>
                                            )}
                                            {nit.kind === 'bullets' && (
                                              <div>
                                                <Label>List (newline = new bullet)</Label>
                                                <Textarea value={(nit.bullets || []).join('\n')} onChange={(e) => {
                                                  const lines = (e.target.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                                                  const outer = [...(b.items || [])];
                                                  const nested = Array.isArray(it.items) ? [...it.items] : [];
                                                  nested[ni] = { ...nit, bullets: lines };
                                                  outer[ii] = { ...it, items: nested };
                                                  updateBlock(m.id, b.id, { items: outer });
                                                }} />
                                              </div>
                                            )}
                                            {!isCollapsed(`compNested:${m.id}:${b.id}:${it.id || ''}:${nit.id || ''}`) && nit.kind === 'text' && (
                                              <div className="space-y-2">
                                                <Label>Text (Markdown supported)</Label>
                                                <Textarea value={nit.content || ''} onChange={(e) => {
                                                  const outer = [...(b.items || [])];
                                                  const nested = Array.isArray(it.items) ? [...it.items] : [];
                                                  nested[ni] = { ...nit, content: e.target.value };
                                                  outer[ii] = { ...it, items: nested };
                                                  updateBlock(m.id, b.id, { items: outer });
                                                }} />
                                                <div className="border rounded p-2 bg-muted/30">
                                                  <div className="text-xs text-muted-foreground mb-1">Preview</div>
                                                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{nit.content || ''}</ReactMarkdown>
                                                </div>
                                              </div>
                                            )}
                                            {!isCollapsed(`compNested:${m.id}:${b.id}:${it.id || ''}:${nit.id || ''}`) && nit.kind === 'image' && (
                                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                <div className="md:col-span-2">
                                                  <Label>Image URL</Label>
                                                  <Input value={nit.imageUrl || ''} onChange={(e) => {
                                                    const outer = [...(b.items || [])];
                                                    const nested = Array.isArray(it.items) ? [...it.items] : [];
                                                    nested[ni] = { ...nit, imageUrl: e.target.value };
                                                    outer[ii] = { ...it, items: nested };
                                                    updateBlock(m.id, b.id, { items: outer });
                                                  }} />
                                                </div>
                                                <div>
                                                  <Label>Alt</Label>
                                                  <Input value={nit.alt || ''} onChange={(e) => {
                                                    const outer = [...(b.items || [])];
                                                    const nested = Array.isArray(it.items) ? [...it.items] : [];
                                                    nested[ni] = { ...nit, alt: e.target.value };
                                                    outer[ii] = { ...it, items: nested };
                                                    updateBlock(m.id, b.id, { items: outer });
                                                  }} />
                                                </div>
                                              </div>
                                            )}
                                            {!isCollapsed(`compNested:${m.id}:${b.id}:${it.id || ''}:${nit.id || ''}`) && nit.kind === 'code' && (
                                              <div className="space-y-2">
                                                <div>
                                                  <Label>Language</Label>
                                                  <Select value={nit.codeLanguage || 'javascript'} onValueChange={(v) => {
                                                    const outer = [...(b.items || [])];
                                                    const nested = Array.isArray(it.items) ? [...it.items] : [];
                                                    nested[ni] = { ...nit, codeLanguage: v };
                                                    outer[ii] = { ...it, items: nested };
                                                    updateBlock(m.id, b.id, { items: outer });
                                                  }}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="javascript">JavaScript</SelectItem>
                                                      <SelectItem value="typescript">TypeScript</SelectItem>
                                                      <SelectItem value="python">Python</SelectItem>
                                                      <SelectItem value="java">Java</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                                <div>
                                                  <Label>Code</Label>
                                                  <Textarea value={nit.codeContent || ''} onChange={(e) => {
                                                    const outer = [...(b.items || [])];
                                                    const nested = Array.isArray(it.items) ? [...it.items] : [];
                                                    nested[ni] = { ...nit, codeContent: e.target.value };
                                                    outer[ii] = { ...it, items: nested };
                                                    updateBlock(m.id, b.id, { items: outer });
                                                  }} className="font-mono" />
                                                </div>
                                              </div>
                                            )}
                                            {!isCollapsed(`compNested:${m.id}:${b.id}:${it.id || ''}:${nit.id || ''}`) && nit.kind === 'video' && (
                                              <div>
                                                <Label>Video URL</Label>
                                                <Input value={nit.videoUrl || ''} onChange={(e) => {
                                                  const outer = [...(b.items || [])];
                                                  const nested = Array.isArray(it.items) ? [...it.items] : [];
                                                  nested[ni] = { ...nit, videoUrl: e.target.value };
                                                  outer[ii] = { ...it, items: nested };
                                                  updateBlock(m.id, b.id, { items: outer });
                                                }} />
                                              </div>
                                            )}
                                            {!isCollapsed(`compNested:${m.id}:${b.id}:${it.id || ''}:${nit.id || ''}`) && nit.kind === 'bullets' && (
                                              <div>
                                                <Label>List (newline = new bullet)</Label>
                                                <Textarea value={(nit.bullets || []).join('\n')} onChange={(e) => {
                                                  const lines = (e.target.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                                                  const outer = [...(b.items || [])];
                                                  const nested = Array.isArray(it.items) ? [...it.items] : [];
                                                  nested[ni] = { ...nit, bullets: lines };
                                                  outer[ii] = { ...it, items: nested };
                                                  updateBlock(m.id, b.id, { items: outer });
                                                }} />
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {b.type === 'quiz' && (
                          <div className="mt-2 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                              <div>
                                <Label>Passing Score (%)</Label>
                                <Input type="number" value={b.quiz?.passingScore ?? 70} onChange={(e) => updateBlock(m.id, b.id, { quiz: { ...(b.quiz || { questions: [], allowRetakes: true }), passingScore: Math.max(0, Math.min(100, Number(e.target.value) || 0)) } })} />
                              </div>
                              <div>
                                <Label>Max Attempts</Label>
                                <Input type="number" value={b.quiz?.maxAttempts ?? 0} onChange={(e) => updateBlock(m.id, b.id, { quiz: { ...(b.quiz || { questions: [], allowRetakes: true }), maxAttempts: Math.max(0, Number(e.target.value) || 0) } })} />
                              </div>
                              <div>
                                <Label>Time Limit (ms)</Label>
                                <Input type="number" value={b.quiz?.timeLimit ?? 0} onChange={(e) => updateBlock(m.id, b.id, { quiz: { ...(b.quiz || { questions: [], allowRetakes: true }), timeLimit: Math.max(0, Number(e.target.value) || 0) } })} />
                              </div>
                              <div className="flex items-end gap-2">
                                <Switch checked={!!(b.quiz?.allowRetakes ?? true)} onCheckedChange={(v) => updateBlock(m.id, b.id, { quiz: { ...(b.quiz || { questions: [] }), allowRetakes: !!v } })} />
                                <Label className="cursor-pointer" onClick={() => updateBlock(m.id, b.id, { quiz: { ...(b.quiz || { questions: [] }), allowRetakes: !(b.quiz?.allowRetakes ?? true) } })}>Allow Retakes</Label>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <Label>Questions</Label>
                              <Button size="sm" onClick={() => {
                                const q = (b.quiz?.questions || []);
                                const next = [...q, { id: `q-${Date.now()}`, text: '', options: ['', '', '', ''], correctIndex: 0 }];
                                updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), questions: next } });
                              }}>Add Question</Button>
                            </div>
                            <div className="space-y-3">
                              {(b.quiz?.questions || []).map((q: any, qi: number) => (
                                <div key={q.id || qi} className="border rounded p-3 space-y-2">
                                  <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                                    <div className="md:col-span-5">
                                      <Label>Question</Label>
                                      <Input value={q.text || ''} onChange={(e) => {
                                        const qs = [...(b.quiz?.questions || [])];
                                        qs[qi] = { ...q, text: e.target.value };
                                        updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), questions: qs } });
                                      }} />
                                    </div>
                                    <div className="flex items-end">
                                      <Button variant="destructive" size="sm" onClick={() => {
                                        const qs = (b.quiz?.questions || []).filter((_: any, idx: number) => idx !== qi);
                                        updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), questions: qs } });
                                      }}>Remove</Button>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Options</Label>
                                    <div className="space-y-2">
                                      {(q.options || []).map((opt: string, oi: number) => (
                                        <div key={oi} className="grid grid-cols-1 md:grid-cols-6 gap-2">
                                          <div className="md:col-span-5">
                                            <Input value={opt} onChange={(e) => {
                                              const qs = [...(b.quiz?.questions || [])];
                                              const arr = [...(q.options || [])];
                                              arr[oi] = e.target.value;
                                              qs[qi] = { ...q, options: arr };
                                              updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), questions: qs } });
                                            }} />
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <input aria-label="Mark correct" type="radio" name={`correct-${qi}`} checked={q.correctIndex === oi} onChange={() => {
                                              const qs = [...(b.quiz?.questions || [])];
                                              qs[qi] = { ...q, correctIndex: oi };
                                              updateBlock(m.id, b.id, { quiz: { ...(b.quiz || {}), questions: qs } });
                                            }} />
                                            <Button size="sm" variant="outline" disabled title="Fixed to 4 options">Remove</Button>
                                          </div>
                                        </div>
                                      ))}
                                      <div className="text-xs text-muted-foreground">Exactly 4 options are used per question.</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="mt-2 flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            setCourse((c: any) => {
                              const mods = [...(c.modules || [])].map((mm: any) => (mm.id === m.id ? {
                                ...mm,
                                contentBlocks: [...(mm.contentBlocks || []), { ...structuredClone(b), id: `b-${Date.now()}`, displayIndex: '', order: (mm.contentBlocks?.length || 0) + 1 }],
                              } : mm));
                              
                            });
                          }}>Duplicate</Button>
                          <Button variant="destructive" size="sm" onClick={() => removeBlock(m.id, b.id)}>Remove Block</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                    </div>
                  )}
                </div>
              );
              })}
            </CardContent>
          </Card>
        </div>
        {/* Right column: Tools Panel */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader><CardTitle>Tools</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="admin" size="sm" onClick={() => setValidation({ checkedAt: Date.now(), issues: buildValidation(course).map(i => `${i.severity.toUpperCase()}: ${i.message}`), items: buildValidation(course) })}>Run Validation</Button>
                <Button variant="outline" size="sm" onClick={() => collapseAllCompositeItems(course, true)}>Collapse All Composite</Button>
                <Button variant="outline" size="sm" onClick={() => collapseAllCompositeItems(course, false)}>Expand All Composite</Button>
                <Button size="sm" onClick={() => {
                  const blob = new Blob([JSON.stringify(course, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `${(course.title || 'course').toLowerCase().replace(/\s+/g, '-')}.json`;
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}>Export Course JSON</Button>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="file" accept="application/json" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader();
                    reader.onload = () => {
                      try {
                        const json = JSON.parse(String(reader.result) || '{}');
                        if (json && typeof json === 'object') {
                          setCourse(json);
                          ignoreNextAutoSave.current = true;
                        }
                      } catch {}
                    };
                    reader.readAsText(file);
                    e.currentTarget.value = '';
                  }} />
                  <Button size="sm" variant="outline">Import Course JSON</Button>
                </label>
              </div>

              {validation && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Checked {validation?.checkedAt ? new Date(validation.checkedAt).toLocaleTimeString() : '-'}</div>
                  <div className="rounded-lg border bg-card p-2 max-h-60 overflow-auto text-sm">
                    {(validation.items?.length ?? 0) === 0 ? (
                      <div className="text-muted-foreground">No issues found.</div>
                    ) : (
                      <ul className="list-disc ml-5 space-y-1">
                        {(validation.items || []).map((it, i) => (
                          <li key={i} className={it.severity === 'error' ? 'text-red-600' : it.severity === 'warning' ? 'text-amber-600' : 'text-green-600'}>
                            {it.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
