import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AchievementCard } from "@/components/dashboard/AchievementCard";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";
import { ensureMongooseConnection } from "@/lib/mongodb";
import { AchievementService } from "@/lib/services/database";
import { Achievement } from "@/types";
import StreakTracker from '@/components/StreakTracker';
import Link from "next/link";
// SkillTree removed per request

export default async function ProfilePage() {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) redirect('/login?redirect=/profile');
  let auth: any;
  try { auth = verifyJWT(token); } catch { redirect('/login?redirect=/profile'); }

  await ensureMongooseConnection();
  const achievementsRaw = await AchievementService.getForStudent(auth.sub).catch(() => []);
  const achievements = JSON.parse(JSON.stringify(achievementsRaw));

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
       <div className="grid grid-cols-1 gap-6">
        {/* Profile info and stats */}
        <div className="space-y-6">
          <Card className="rounded-xl shadow-sm">
           <CardContent className="pt-6">
             <div className="flex flex-col items-center text-center">
               <Avatar className="w-24 h-24 mb-4 border-4 border-primary">
                 <AvatarImage src={auth.picture || ''} alt={auth.name || auth.sub} />
                 <AvatarFallback>{(auth.name || auth.sub || 'U').charAt(0).toUpperCase()}</AvatarFallback>
               </Avatar>
               <h1 className="text-2xl font-bold leading-tight">{auth.name || auth.sub}</h1>
               <p className="text-muted-foreground flex items-center gap-2 mt-1">
                 <Mail className="w-4 h-4"/> {auth.email || ''}
               </p>
             </div>
           </CardContent>
         </Card>
          {/* Learning Streak moved above Badge Collection */}
          <StreakTracker />
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Badge Collection</CardTitle>
              <Trophy className="w-5 h-5 text-amber-500" />
            </CardHeader>
            <CardContent className="space-y-4">
              {achievements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No badges yet. Start learning to earn your first badge!</p>
              ) : (
                <>
                  {achievements.slice(0, 5).map((achievement: Achievement) => (
                    <AchievementCard key={achievement.id} achievement={achievement} />
                  ))}
                  {achievements.length > 5 && (
                    <Button variant="link" className="p-0 h-auto">View all badges</Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          {/* Back to Home button - use Next.js Link to keep navigation in WebView */}
          <div className="flex justify-center">
            <Link href="https://avsec-it.vercel.app/" >
              <Button className="rounded-full" size="sm">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}