"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then(r => r.json());

export default function AdminCoursesPage() {
  const { data, mutate, isLoading } = useSWR("/api/admin/courses?page=1&limit=50", fetcher);
  const items = data?.data?.items || [];

  const [filter, setFilter] = useState("");
  const filtered = items.filter((c: any) => (c.title || "").toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Courses</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Filter by title" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-60" />
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/admin/courses/new">Create Course</Link>
          </Button>
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
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/courses/${encodeURIComponent(course.id)}`}>Edit</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/courses/${encodeURIComponent(course.id)}`}>Preview</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{course.description}</p>
              <div className="text-xs text-muted-foreground">{course.language} • {course.difficulty} • Modules: {course.modules?.length ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
