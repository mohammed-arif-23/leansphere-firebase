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
    // Load weekly goal preference
    try {
      const prefsRaw = localStorage.getItem('streak_prefs');
      if (prefsRaw) {
        const prefs = JSON.parse(prefsRaw);
        if (typeof prefs.weeklyGoal === 'number') {
          setStreakData(prev => ({ ...prev, weeklyGoal: prefs.weeklyGoal }));
        }
      }
    } catch {}

    loadStreakFromServer();
  }, []);

  const loadStreakFromServer = async () => {
    try {
      const res = await fetch('/api/learning/streak', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch streak');
      const data = await res.json();
      setStreakData(prev => {
        const currentStreak = Number(data.currentStreak || 0);
        return {
          ...prev,
          currentStreak,
          longestStreak: Number(data.longestStreak || 0),
          lastActiveDate: data.lastActiveDate || '',
          weeklyProgress: getWeeklyProgress(currentStreak),
        };
      });
    } catch (e) {
      // Fail silently; UI will show 0
      console.warn('Streak fetch failed', e);
    }
  };

  const updateStreak = async () => {
    try {
      const res = await fetch('/api/learning/streak', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to update streak');
      const data = await res.json();
      const newStreak = Number(data.currentStreak || 0);
      setStreakData(prev => ({
        ...prev,
        currentStreak: newStreak,
        longestStreak: Math.max(Number(data.longestStreak || 0), newStreak),
        lastActiveDate: data.lastActiveDate || new Date().toISOString(),
        weeklyProgress: getWeeklyProgress(newStreak)
      }));

      if (newStreak > 0 && newStreak % 7 === 0) {
        track({ event: 'streak_milestone', properties: { streak_days: newStreak } });
      }
    } catch (e) {
      console.warn('Streak update failed', e);
    }
  };

  const getWeeklyProgress = (streakOverride?: number) => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    // In a real app, you'd fetch this from your backend
    // For now, calculate based on current streak
    const today = new Date();
    const daysSinceWeekStart = today.getDay();
    const s = streakOverride ?? streakData.currentStreak;
    return Math.min(s, daysSinceWeekStart + 1);
  };

  const setWeeklyGoal = (goal: number) => {
    const newData = { ...streakData, weeklyGoal: goal };
    setStreakData(newData);
    try { localStorage.setItem('streak_prefs', JSON.stringify({ weeklyGoal: goal })); } catch {}
    setShowGoalSetter(false);
    
    track({
      event: 'goal_set',
      properties: { weekly_goal: goal }
    });
  };

  // Call this when user completes a lesson
  useEffect(() => {
    const handleLessonComplete = () => { void updateStreak(); };
    window.addEventListener('lessonCompleted', handleLessonComplete);
    return () => window.removeEventListener('lessonCompleted', handleLessonComplete);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
