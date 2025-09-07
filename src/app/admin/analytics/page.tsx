import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

async function getSummary() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/admin/analytics/summary`, { cache: 'no-store' });
    if (!res.ok) throw new Error('failed');
    const json = await res.json();
    return json?.data || null;
  } catch {
    // fallback to relative fetch on server
    try {
      const res = await fetch(`/api/admin/analytics/summary`, { cache: 'no-store' as any });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || null;
    } catch {
      return null;
    }
  }
}

export default async function AdminAnalyticsPage() {
  const data = await getSummary();
  const totals = data?.totals || {};
  const progress = data?.progress || {};

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader><CardTitle>Courses</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{totals.courses ?? '-'}</CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader><CardTitle>Modules</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{totals.modules ?? '-'}</CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader><CardTitle>Students</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{totals.students ?? '-'}</CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader><CardTitle>Users</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{totals.users ?? '-'}</CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader><CardTitle>Total Completed Modules</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{progress.totalCompletedModules ?? '-'}</CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader><CardTitle>Avg Time / Module (s)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{progress.avgTimePerModuleSeconds ?? '-'}</CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader><CardTitle>Avg Completion %</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{progress.avgCompletionPct ?? '-'}</CardContent>
        </Card>
      </div>

      <div className="mt-8 text-sm text-muted-foreground">Live data. Refines as students progress.</div>
    </div>
  );
}
