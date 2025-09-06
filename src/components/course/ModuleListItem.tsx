import Link from 'next/link';
import type { Module } from '@/types';
import { CheckCircle, Circle, Code, FileText, Video, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleListItemProps {
  module: Module;
  isCompleted: boolean;
}

const iconMap = {
  video: <Video className="h-5 w-5 text-primary" />,
  code: <Code className="h-5 w-5 text-primary" />,
  text: <FileText className="h-5 w-5 text-primary" />,
  quiz: <HelpCircle className="h-5 w-5 text-primary" />,
};

export function ModuleListItem({ module, isCompleted }: ModuleListItemProps) {
  return (
    <Link href={`/courses/${module.courseId}/${module.id}`}>
      <div className={cn(
        "flex items-center p-4 border rounded-lg transition-all duration-200",
        "hover:bg-card hover:shadow-md hover:border-primary/50",
        isCompleted ? "bg-primary/10 border-primary/30" : "bg-background"
      )}>
        <div className="flex-shrink-0 mr-4">
          {isCompleted ? (
            <CheckCircle className="h-6 w-6 text-green-500" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-grow">
          <p className="font-medium text-foreground">{module.title}</p>
        </div>
        <div className="ml-4 flex-shrink-0">
          {iconMap[module.type]}
        </div>
      </div>
    </Link>
  );
}
