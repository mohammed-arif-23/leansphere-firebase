
'use client';

import type { Achievement } from '@/types';
import { Trophy, Code, BookOpen, Star, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';

interface AchievementCardProps {
  achievement: Achievement;
}

const iconMap: { [key in Achievement['type']]: React.ReactNode } = {
    first_submission: <Code className="h-full w-full" />,
    module_completion: <BookOpen className="h-full w-full" />,
    course_completion: <Trophy className="h-full w-full" />,
    streak: <Trophy className="h-full w-full" />, // Placeholder
    perfect_score: <Star className="h-full w-full" />,
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    const shareData = {
      title: 'Check out my new achievement!',
      text: `I just earned the "${achievement.title}" badge on dynamIT!`,
      url: window.location.origin,
    };
    
    const canShare = navigator.canShare && navigator.canShare(shareData);

    if (canShare && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Fallback to clipboard if share fails, e.g., user cancels dialog
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
           navigator.clipboard.writeText(`${shareData.text} Check it out at ${shareData.url}`);
            toast({
                title: 'Sharing failed, Link Copied!',
                description: 'Your achievement details have been copied to your clipboard instead.',
            });
        }
      }
    } else {
        // Fallback for browsers that don't support the Web Share API
        navigator.clipboard.writeText(`${shareData.text} Check it out at ${shareData.url}`);
        toast({
            title: 'Link Copied!',
            description: 'Your achievement details have been copied to your clipboard.',
        });
    }
  };

  return (
    <div className="flex items-start w-full">
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
        <Button variant="ghost" size="icon" className="ml-2 h-8 w-8" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
        </Button>
    </div>
  );
}
