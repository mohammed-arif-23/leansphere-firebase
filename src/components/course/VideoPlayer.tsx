import type { Module } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VideoPlayerProps {
  module: Module;
}

export function VideoPlayer({ module }: VideoPlayerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{module.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">Video player for: {module.content}</p>
        </div>
        <div className="mt-4 prose prose-stone dark:prose-invert max-w-none">
          <h3 className="font-semibold">Video Description</h3>
          <p>This video provides an introduction to the topic, covering the fundamental concepts you need to know to get started. Pay close attention to the examples provided.</p>
        </div>
      </CardContent>
    </Card>
  );
}
