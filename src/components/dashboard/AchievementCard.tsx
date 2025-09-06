'use client';

import type { Achievement } from '@/types';
import { Trophy, Code, BookOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AchievementCardProps {
  achievement: Achievement;
}

const iconMap: { [key in Achievement['type']]: React.ReactNode } = {
    first_submission: <Code className="h-full w-full" />,
    module_completion: <BookOpen className="h-full w-full" />,
    course_completion: <Trophy className="h-full w-full" />,
    streak: <Trophy className="h-full w-full" />,
    perfect_score: <Trophy className="h-full w-full" />,
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  return (
    <div className="flex items-start">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold p-1.5">
            {iconMap[achievement.type]}
        </div>
        <div className="ml-4 flex-1">
            <p className="text-sm font-semibold text-foreground">{achievement.title}</p>
            <p className="text-sm text-muted-foreground">{achievement.description}</p>
            <p className="text-xs text-muted-foreground/80 mt-1">
                {formatDistanceToNow(new Date(achievement.earnedAt), { addSuffix: true })}
            </p>
        </div>
    </div>
  );
}
