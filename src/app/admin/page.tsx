'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Summary = {
  success: boolean;
  data?: {
    totals: { courses: number; modules: number; users: number; students: number };
    progress: { totalCompletedModules: number; avgTimePerModuleSeconds: number; avgCompletionPct: number };
  };
};

export default function AdminPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', avatarUrl: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', avatarUrl: '' });

  useEffect(() => {
    // Check auth and then load summary
    (async () => {
      try {
        const me = await fetch('/api/admin/auth/me', { cache: 'no-store', credentials: 'include' });
        if (!me.ok) {
          window.location.href = '/admin/login?redirect=/admin';
          return;
        }
        const res = await fetch('/api/admin/analytics/summary', { cache: 'no-store', credentials: 'include' });
        const json: Summary = await res.json();
        setSummary(json);
        // Load students
        const sres = await fetch('/api/admin/students', { cache: 'no-store', credentials: 'include' });
        const sjson = await sres.json();
        setStudents(Array.isArray(sjson?.data) ? sjson.data : []);
      } catch (e) {
        setSummary(null);
      } finally {
        setLoading(false);
        setLoadingStudents(false);
      }
    })();
  }, []);

  const totals = summary?.data?.totals;
  const prog = summary?.data?.progress;

  async function handleCreateStudent(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(addForm),
    });
    if (res.ok) {
      const reload = await fetch('/api/admin/students', { cache: 'no-store', credentials: 'include' });
      const j = await reload.json();
      setStudents(Array.isArray(j?.data) ? j.data : []);
      setShowAdd(false);
      setAddForm({ name: '', email: '', avatarUrl: '' });
      setSummary((prev) => prev && prev.data ? { ...prev, data: { ...prev.data, totals: { ...prev.data.totals, students: (Array.isArray(j?.data) ? j.data.length : 0) } } } : prev);
    }
  }

  function startEdit(s: any) {
    setEditingId(s.id);
    setEditForm({ name: s.name || '', email: s.email || '', avatarUrl: s.avatarUrl || '' });
  }

  async function handleUpdateStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const res = await fetch(`/api/admin/students/${encodeURIComponent(editingId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const reload = await fetch('/api/admin/students', { cache: 'no-store', credentials: 'include' });
      const j = await reload.json();
      setStudents(Array.isArray(j?.data) ? j.data : []);
      setEditingId(null);
    }
  }

  async function handleDeleteStudent(id: string) {
    if (!confirm('Delete this student?')) return;
    const res = await fetch(`/api/admin/students/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      const next = students.filter((s) => s.id !== id);
      setStudents(next);
      setSummary((prev) => prev && prev.data ? { ...prev, data: { ...prev.data, totals: { ...prev.data.totals, students: next.length } } } : prev);
    }
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Student Tracking</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">Monitor course progress and student activity.</p>
      </header>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/admin/courses">
          <Button className="rounded-full">Manage courses</Button>
        </Link>
        <Button variant="outline" onClick={() => location.reload()} className="rounded-full">Refresh</Button>
      </div>

      {/* Students drill-down */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Students</h2>
          <Button className="rounded-full" onClick={() => setShowAdd(true)}>Add student</Button>
        </div>
        <Card className="rounded-xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Completed</th>
                    <th className="px-4 py-3">Completion %</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStudents ? (
                    <tr><td className="px-4 py-4" colSpan={5}>Loading...</td></tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="px-4 py-3">
                          {editingId === s.id ? (
                            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                          ) : s.name || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {editingId === s.id ? (
                            <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                          ) : s.email || '—'}
                        </td>
                        <td className="px-4 py-3">{s?.progress?.completedModules ?? 0}</td>
                        <td className="px-4 py-3">{s?.progress?.completionPercentage ?? 0}%</td>
                        <td className="px-4 py-3">
                          {editingId === s.id ? (
                            <div className="flex gap-2">
                              <Button size="sm" className="rounded-full" onClick={handleUpdateStudent}>Save</Button>
                              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditingId(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="rounded-full" onClick={() => startEdit(s)}>Edit</Button>
                              <Button size="sm" variant="destructive" className="rounded-full" onClick={() => handleDeleteStudent(s.id)}>Delete</Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add student modal (simple inline panel) */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-card border p-5">
            <h3 className="text-lg font-semibold mb-3">Add student</h3>
            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div>
                <Label htmlFor="add-name">Name</Label>
                <Input id="add-name" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="add-email">Email</Label>
                <Input id="add-email" type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="add-avatar">Avatar URL (optional)</Label>
                <Input id="add-avatar" value={addForm.avatarUrl} onChange={(e) => setAddForm({ ...addForm, avatarUrl: e.target.value })} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button type="submit" className="rounded-full">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loadingStudents ? '–' : students.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? '–' : (totals?.courses ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? '–' : (totals?.modules ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Avg completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? '–' : `${prog?.avgCompletionPct ?? 0}%`}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li><span className="font-medium text-foreground">Completed modules:</span> {loading ? '–' : (prog?.totalCompletedModules ?? 0)}</li>
              <li><span className="font-medium text-foreground">Avg time per module:</span> {loading ? '–' : `${prog?.avgTimePerModuleSeconds ?? 0}s`}</li>
              <li><span className="font-medium text-foreground">Tracked users:</span> {loading ? '–' : (totals?.users ?? 0)}</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/courses">
                <Button className="rounded-full">Go to Course Manager</Button>
              </Link>
              <Button variant="outline" className="rounded-full" onClick={() => location.reload()}>Refresh Analytics</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Analytics powered by <code>/api/admin/analytics/summary</code>.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
