import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyJWT } from "@/lib/auth";
import { ensureMongooseConnection } from "@/lib/mongodb";
import { CourseService } from "@/lib/services/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CoursesPage() {
  const token = (await cookies()).get("auth_token")?.value;
  if (!token) redirect("/login?redirect=/courses");
  try { verifyJWT(token); } catch { redirect("/login?redirect=/courses"); }

  await ensureMongooseConnection();
  const items = await CourseService.list({ isPublished: true }, { page: 1, limit: 100 }).then((r) => r.items);
  const courses = JSON.parse(JSON.stringify(items));

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold">Courses</h1>
        <p className="text-muted-foreground mt-1">Browse available courses.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((c: any) => (
          <Card key={c.id} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg ">{c.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 mt-1">{c.description}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {(c.modules?.length || 0)} modules
                  </div>
                </div>
                <div className="shrink-0">
                  <Link href={`/courses/${c.id}`}>
                    <Button className="rounded-full shine">View</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
