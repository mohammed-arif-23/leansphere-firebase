import type { Module } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TextContentProps {
  module: Module;
}

export function TextContent({ module }: TextContentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{module.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-stone dark:prose-invert max-w-none">
          <p>{module.content}</p>
        </div>
      </CardContent>
    </Card>
  );
}
