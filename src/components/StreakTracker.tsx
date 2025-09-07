"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Target, Calendar } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  weeklyGoal: number;
  weeklyProgress: number;
}

export default function StreakTracker() {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: '',
    weeklyGoal: 5,
    weeklyProgress: 0
  });
  const [showGoalSetter, setShowGoalSetter] = useState(false);
  const { track } = useAnalytics();

  useEffect(() => {
    loadStreakData();
  }, []);

  const loadStreakData = () => {
    const saved = localStorage.getItem('learnsphere_streak');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setStreakData(data);
        
        // Check if streak should be reset (missed a day)
        const today = new Date().toDateString();
        const lastActive = new Date(data.lastActiveDate).toDateString();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
        
        if (lastActive !== today && lastActive !== yesterday) {
          // Reset streak if more than 1 day gap
          const resetData = { ...data, currentStreak: 0 };
          setStreakData(resetData);
          localStorage.setItem('learnsphere_streak', JSON.stringify(resetData));
        }
      } catch (error) {
        console.warn('Failed to load streak data:', error);
      }
    }
  };

  const updateStreak = () => {
    const today = new Date().toDateString();
    const lastActive = new Date(streakData.lastActiveDate).toDateString();
    
    if (lastActive === today) {
      return; // Already updated today
    }

    const newStreak = lastActive === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString() 
      ? streakData.currentStreak + 1 
      : 1;

    const newData = {
      ...streakData,
      currentStreak: newStreak,
      longestStreak: Math.max(streakData.longestStreak, newStreak),
      lastActiveDate: new Date().toISOString(),
      weeklyProgress: getWeeklyProgress() + 1
    };

    setStreakData(newData);
    localStorage.setItem('learnsphere_streak', JSON.stringify(newData));

    // Track streak milestone
    if (newStreak > 0 && newStreak % 7 === 0) {
      track({
        event: 'streak_milestone',
        properties: { streak_days: newStreak }
      });
    }
  };

  const getWeeklyProgress = () => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    // In a real app, you'd fetch this from your backend
    // For now, calculate based on current streak
    const today = new Date();
    const daysSinceWeekStart = today.getDay();
    return Math.min(streakData.currentStreak, daysSinceWeekStart + 1);
  };

  const setWeeklyGoal = (goal: number) => {
    const newData = { ...streakData, weeklyGoal: goal };
    setStreakData(newData);
    localStorage.setItem('learnsphere_streak', JSON.stringify(newData));
    setShowGoalSetter(false);
    
    track({
      event: 'goal_set',
      properties: { weekly_goal: goal }
    });
  };

  // Call this when user completes a lesson
  useEffect(() => {
    const handleLessonComplete = () => updateStreak();
    window.addEventListener('lessonCompleted', handleLessonComplete);
    return () => window.removeEventListener('lessonCompleted', handleLessonComplete);
  }, [streakData]);

  const weeklyProgressPercent = Math.min((streakData.weeklyProgress / streakData.weeklyGoal) * 100, 100);

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flame className="h-5 w-5 text-orange-500" />
          Learning Streak
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Streak */}
        <div className="text-center">
          <div className="text-3xl font-bold text-orange-600 mb-1">
            {streakData.currentStreak}
          </div>
          <div className="text-sm text-muted-foreground">
            {streakData.currentStreak === 1 ? 'day' : 'days'} in a row
          </div>
          {streakData.longestStreak > streakData.currentStreak && (
            <div className="text-xs text-muted-foreground mt-1">
              Best: {streakData.longestStreak} days
            </div>
          )}
        </div>

        {/* Weekly Goal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              Weekly Goal
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={() => setShowGoalSetter(!showGoalSetter)}
            >
              {streakData.weeklyGoal} days
            </Button>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${weeklyProgressPercent}%` }}
            />
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            {streakData.weeklyProgress} / {streakData.weeklyGoal} days this week
          </div>
        </div>

        {/* Goal Setter */}
        {showGoalSetter && (
          <div className="space-y-2 p-3 bg-white rounded-lg border">
            <div className="text-sm font-medium">Set Weekly Goal</div>
            <div className="flex gap-2">
              {[3, 5, 7].map(goal => (
                <Button
                  key={goal}
                  variant={streakData.weeklyGoal === goal ? "default" : "outline"}
                  size="sm"
                  onClick={() => setWeeklyGoal(goal)}
                  className="flex-1"
                >
                  {goal} days
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Motivational Message */}
        {streakData.currentStreak > 0 && (
          <div className="text-center p-2 bg-orange-100 rounded-lg">
            <div className="text-sm text-orange-800">
              {streakData.currentStreak >= 7 ? "🔥 You're on fire!" :
               streakData.currentStreak >= 3 ? "💪 Keep it up!" :
               "🌟 Great start!"}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
