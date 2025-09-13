"use client";

import useSWR from "swr";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ImportExportCourses } from "@/components/admin/ImportExportCourses";
import { ArrowDown, ArrowUp, Download, GripVertical, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then(r => r.json());

export default function AdminCoursesPage() {
  const { data, mutate, isLoading } = useSWR("/api/admin/courses?page=1&limit=50", fetcher);
  const items = data?.data?.items || [];

  const [filter, setFilter] = useState("");
  const filtered = items.filter((c: any) => (c.title || "").toLowerCase().includes(filter.toLowerCase()));

  // Reorder dialog state
  const [reorderOpen, setReorderOpen] = useState(false);
  const [ordered, setOrdered] = useState<any[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  const openReorder = () => {
    // Initialize with current items sorted by existing 'order' then createdAt (assumed already)
    const init = [...items].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0) || (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setOrdered(init);
    setReorderOpen(true);
  };

  const move = (index: number, dir: -1 | 1) => {
    setOrdered((curr) => {
      const next = [...curr];
      const to = index + dir;
      if (to < 0 || to >= next.length) return curr;
      const [it] = next.splice(index, 1);
      next.splice(to, 0, it);
      return next;
    });
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    try {
      const payload = { orders: ordered.map((c, i) => ({ id: c.id, order: i + 1 })) };
      const res = await fetch('/api/admin/courses/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save order');
      setReorderOpen(false);
      await mutate();
    } catch (e) {
      console.error(e);
      alert('Could not save order. Please try again.');
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
        <h1 className="text-2xl font-semibold">Courses</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Filter by title" 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)} 
              className="w-full sm:w-60" 
            />
            <ImportExportCourses />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/courses/new">
              <Button variant="admin">Create Course</Button>
            </Link>
            <Button variant="outline" onClick={openReorder}>Reorder</Button>
          </div>
        </div>
      </div>
      <Separator className="mb-4" />

      {isLoading && <p>Loading...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((course: any) => (
          <Card key={course.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">{course.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Link href={`/admin/courses/${encodeURIComponent(course.id)}`}>
                  <Button variant="outline" size="sm">Edit</Button>
                </Link>
                <Link href={`/courses/${encodeURIComponent(course.id)}`}>
                  <Button variant="outline" size="sm">Preview</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{course.description}</p>
              <div className="text-xs text-muted-foreground">{course.language} • {course.difficulty} • Modules: {course.modules?.length ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reorder Dialog */}
      <Dialog open={reorderOpen} onOpenChange={setReorderOpen}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>Reorder Courses</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
            {ordered.map((c, idx) => (
              <div key={c.id} className="flex items-center justify-between rounded border p-2">
                <div className="flex items-center gap-2 min-w-0">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="truncate">
                    <div className="text-sm font-medium truncate">{idx + 1}. {c.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={() => move(idx, -1)} disabled={idx === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => move(idx, 1)} disabled={idx === ordered.length - 1}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {ordered.length === 0 && (
              <div className="text-sm text-muted-foreground">No courses to reorder.</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReorderOpen(false)}>Cancel</Button>
            <Button onClick={saveOrder} disabled={savingOrder}>{savingOrder ? 'Saving...' : 'Save Order'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
