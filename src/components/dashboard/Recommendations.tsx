'use client';

import { useEffect, useState } from 'react';
import { getPersonalizedModuleRecommendations, PersonalizedModuleRecommendationsOutput } from '@/ai/flows/personalized-module-recommendations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit, Lightbulb } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

export function Recommendations() {
  const [recommendations, setRecommendations] = useState<PersonalizedModuleRecommendationsOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const result = await getPersonalizedModuleRecommendations({
          studentId: 'student1',
          learningHistory: 'Completed Introduction to Java, Variables and Data Types in Java, and Introduction to Python. Scored well on Java exercises but struggled slightly with Python syntax.',
          currentCourse: 'Python for Beginners',
        });
        setRecommendations(result);
      } catch (err) {
        setError('Failed to fetch recommendations.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  return (
    <Card className="bg-accent/30 border-accent/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Recommended For You</CardTitle>
        <BrainCircuit className="w-5 h-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : recommendations ? (
          <div>
            <ul className="space-y-2 text-sm list-none">
              {recommendations.recommendedModules.map((module, index) => (
                <li key={index} className="flex items-start">
                  <Lightbulb className="w-4 h-4 mr-2 mt-1 flex-shrink-0 text-amber-500" />
                  <span>{module}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground italic">
              {recommendations.reasoning}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No recommendations available right now.</p>
        )}
      </CardContent>
    </Card>
  );
}
