
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Course } from '@/types';

export default function AdminPage() {
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [language, setLanguage] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newCourseData: Partial<Course> = {
      title: courseTitle,
      description: courseDesc,
      language: language as Course['language'],
      difficulty: difficulty as Course['difficulty'],
      estimatedHours: 10, // Placeholder
      imageUrl: imageUrl || 'https://picsum.photos/600/400',
    };

    try {
      const response = await fetch('/api/learning/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourseData),
      });

      if (!response.ok) {
        throw new Error('Failed to create course');
      }

      const createdCourse = await response.json();
      toast({
        title: "Success!",
        description: `Course "${createdCourse.title}" has been created.`,
      });
      // Reset form
      setCourseTitle('');
      setCourseDesc('');
      setLanguage('');
      setDifficulty('');
      setImageUrl('');

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Manage courses, modules, and users.
        </p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New Course</CardTitle>
            <CardDescription>Fill out the form to add a new course to the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="course-title">Course Title</Label>
                <Input id="course-title" placeholder="e.g., Advanced JavaScript" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-desc">Course Description</Label>
                <Textarea id="course-desc" placeholder="A brief summary of the course content." value={courseDesc} onChange={e => setCourseDesc(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-lang">Programming Language</Label>
                <Select value={language} onValueChange={setLanguage} required>
                  <SelectTrigger id="course-lang">
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Java">Java</SelectItem>
                    <SelectItem value="Python">Python</SelectItem>
                    <SelectItem value="JavaScript">JavaScript</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-difficulty">Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty} required>
                  <SelectTrigger id="course-difficulty">
                    <SelectValue placeholder="Select a difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-image">Image URL</Label>
                <Input id="course-image" placeholder="https://picsum.photos/600/400" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Course'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Statistics</CardTitle>
            <CardDescription>An overview of platform activity.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">1,234</p>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">Total Courses</p>
              <p className="text-2xl font-bold">2</p>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">Modules Completed</p>
              <p className="text-2xl font-bold">5,678</p>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">Daily Active Users</p>
              <p className="text-2xl font-bold">45</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
