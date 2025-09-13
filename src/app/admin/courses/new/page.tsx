"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function NewCoursePage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeIdFromTitle = (t: string) =>
    t
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\-\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cid = (id || makeIdFromTitle(title)).trim();
    if (!cid) return setError("Please provide a Course ID or a Title that can generate one.");
    if (!title.trim()) return setError("Title is required.");
    if (!description.trim()) return setError("Description is required.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Admin auth is expected to be carried via cookies per API
        body: JSON.stringify({ id: cid, title, description, isPublished }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || `Failed to create course (${res.status})`);
      }
      // Navigate to the edit page of the new course
      router.push(`/admin/courses/${encodeURIComponent(cid)}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create course");
    } finally {
      setSubmitting(false);
    }
  };

  const onTitleBlur = () => {
    if (!id && title) {
      setId(makeIdFromTitle(title));
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Create Course</h1>
        <Link href="/admin/courses">
          <Button variant="outline">Back to Courses</Button>
        </Link>
      </div>
      <Separator className="mb-4" />

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="title">Title</label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={onTitleBlur}
                placeholder="e.g. Introduction to Java"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="courseId">Course ID (slug)</label>
              <Input
                id="courseId"
                value={id}
                onChange={(e) => setId(e.target.value.toLowerCase())}
                placeholder="auto-generated-from-title if left blank"
              />
              <p className="text-xs text-muted-foreground">Letters, numbers and dashes only. Used in URLs.</p>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="description">Description</label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Short summary of the course"
                required
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch id="isPublished" checked={isPublished} onCheckedChange={setIsPublished} />
              <Label htmlFor="isPublished">Published</Label>
            </div>

            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}
          </CardContent>
          <CardFooter className="flex items-center gap-3">
            <Button type="submit" disabled={submitting} variant="admin">
              {submitting ? "Creating..." : "Create Course"}
            </Button>
            <Link href="/admin/courses">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
