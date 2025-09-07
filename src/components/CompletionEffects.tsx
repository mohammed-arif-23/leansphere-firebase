"use client";

import { useEffect, useState } from "react";
import { useAnalytics } from "../hooks/useAnalytics";

interface CompletionEffectsProps {
  courseId: string;
  courseTitle: string;
  type?: 'course' | 'lesson' | 'achievement';
  message?: string;
}

export default function CompletionEffects({ 
  courseId, 
  courseTitle, 
  type = 'course',
  message 
}: CompletionEffectsProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const { track } = useAnalytics();

  useEffect(() => {
    // Trigger confetti animation
    setShowConfetti(true);
    setShowBadge(true);

    // Track completion event
    track({
      event: `${type}_completed`,
      properties: {
        course_id: courseId,
        course_title: courseTitle,
        completion_type: type
      }
    });

    // Auto-hide effects after animation
    const confettiTimer = setTimeout(() => setShowConfetti(false), 3000);
    const badgeTimer = setTimeout(() => setShowBadge(false), 5000);

    return () => {
      clearTimeout(confettiTimer);
      clearTimeout(badgeTimer);
    };
  }, [courseId, courseTitle, type, track]);

  return (
    <>
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          <div className="confetti-container">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  backgroundColor: [
                    '#0891b2', '#06b6d4', '#8b5cf6', 
                    '#f59e0b', '#ef4444', '#10b981'
                  ][Math.floor(Math.random() * 6)],
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Achievement Badge */}
      {showBadge && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50 p-4">
          <div className="achievement-badge animate-bounce-in bg-white rounded-2xl shadow-2xl border p-6 max-w-sm mx-auto text-center">
            <div className="text-4xl mb-3">
              {type === 'course' ? '🎓' : type === 'lesson' ? '✅' : '🏆'}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {type === 'course' ? 'Course Completed!' : 
               type === 'lesson' ? 'Lesson Completed!' : 
               'Achievement Unlocked!'}
            </h3>
            <p className="text-gray-600 text-sm">
              {message || `Great job completing "${courseTitle}"!`}
            </p>
            <div className="mt-4 text-xs text-gray-500">
              Keep up the great work! 🚀
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .confetti-container {
          position: absolute;
          top: -10px;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          animation: confetti-fall 3s linear forwards;
          opacity: 0.8;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .achievement-badge {
          animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        @keyframes bounce-in {
          0% {
            transform: scale(0) rotate(-360deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.1) rotate(-180deg);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
