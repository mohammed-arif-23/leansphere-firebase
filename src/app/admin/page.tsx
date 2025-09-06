
'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Course, Module } from '@/types';
import { Loader2 } from 'lucide-react';

export default function AdminPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  // Course creation state
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseLanguage, setCourseLanguage] = useState('');
  const [courseDifficulty, setCourseDifficulty] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmittingCourse, setIsSubmittingCourse] = useState(false);

  // Module creation state
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleType, setModuleType] = useState<Module['type'] | ''>('');
  const [moduleContent, setModuleContent] = useState('');
  const [isSubmittingModule, setIsSubmittingModule] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch('/api/learning/courses');
        if (!response.ok) throw new Error('Failed to fetch courses');
        const data = await response.json();
        setCourses(data.courses);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load courses for module creation.',
        });
      } finally {
        setIsLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [toast]);


  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCourse(true);

    const newCourseData: Partial<Course> = {
      title: courseTitle,
      description: courseDesc,
      language: courseLanguage as Course['language'],
      difficulty: courseDifficulty as Course['difficulty'],
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
      setCourseLanguage('');
      setCourseDifficulty('');
      setImageUrl('');
      // Refresh course list
      setCourses(prev => [...prev, createdCourse]);

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsSubmittingCourse(false);
    }
  };

  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingModule(true);

    const newModuleData: Partial<Module> = {
      courseId: selectedCourseId,
      title: moduleTitle,
      type: moduleType as Module['type'],
      content: moduleContent,
    };

    try {
      const response = await fetch('/api/learning/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newModuleData),
      });

      if (!response.ok) {
        throw new Error('Failed to create module');
      }

      const createdModule = await response.json();
      toast({
        title: "Success!",
        description: `Module "${createdModule.title}" has been created.`,
      });
      // Reset form
      setSelectedCourseId('');
      setModuleTitle('');
      setModuleType('');
      setModuleContent('');

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Something went wrong while creating module.',
      });
    } finally {
      setIsSubmittingModule(false);
    }
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Manage courses, modules, and platform content.
        </p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Create Course Card */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Course</CardTitle>
            <CardDescription>Fill out the form to add a new course to the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCourseSubmit} className="space-y-4">
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
                <Select value={courseLanguage} onValueChange={setCourseLanguage} required>
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
                <Select value={courseDifficulty} onValueChange={setCourseDifficulty} required>
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
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmittingCourse}>
                {isSubmittingCourse ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Creating...</> : 'Create Course'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Create Module Card */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Module</CardTitle>
            <CardDescription>Add a new module to an existing course.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoadingCourses ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <form onSubmit={handleModuleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="module-course">Course</Label>
                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId} required>
                      <SelectTrigger id="module-course">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map(course => (
                           <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="module-title">Module Title</Label>
                    <Input id="module-title" placeholder="e.g., Introduction to Variables" value={moduleTitle} onChange={e => setModuleTitle(e.target.value)} required />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="module-type">Module Type</Label>
                    <Select value={moduleType} onValueChange={(v) => setModuleType(v as Module['type'] | '')} required>
                      <SelectTrigger id="module-type">
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="code">Code Assignment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="module-content">Content</Label>
                    <Textarea 
                      id="module-content" 
                      placeholder={
                        moduleType === 'video' 
                          ? 'Enter video URL...' 
                          : moduleType === 'code'
                          ? 'Enter coding assignment prompt...'
                          : 'Enter markdown content...'
                      }
                      value={moduleContent} 
                      onChange={e => setModuleContent(e.target.value)} 
                      required 
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmittingModule}>
                     {isSubmittingModule ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Creating...</> : 'Create Module'}
                  </Button>
                </form>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
