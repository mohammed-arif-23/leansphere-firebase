import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { CourseService, ProgressService } from '@/lib/services/database';
import { Card, CardContent } from '@/components/ui/card';
import CodeRunnerClient from '@/components/course/CodeRunnerClient';
import QuizClient from '@/components/course/QuizClient';
import { Progress } from '@/components/ui/progress';
import PrismClient from '@/components/PrismClient';
import ScrollProgressBar from '@/components/ScrollProgressBar';
import ModuleNextGate from '@/components/course/ModuleNextGate';

export default async function ModulePage({ params }: { params: Promise<{ courseId: string, moduleId: string }> }) {
  const { courseId, moduleId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) redirect(`/login?redirect=/courses/${courseId}/${moduleId}`);
  try { verifyJWT(token); } catch { redirect(`/login?redirect=/courses/${courseId}/${moduleId}`); }

  await ensureMongooseConnection();
  const course = await CourseService.getById(courseId);
  if (!course) notFound();

  const module = course.modules.find((m: any) => m.id === moduleId);
  if (!module) notFound();

  // Compute progress for this student and module
  const auth = verifyJWT(token);
  const progressList = await ProgressService.getByStudent(String(auth.sub));
  const completedSet = new Set<string>(progressList.flatMap((p: any) => p.completedContentBlocks || p.completedContentBlocks || p.completedModules || []).filter(Boolean));
  const blocks = (module.contentBlocks || []).slice().sort((a: any, b: any) => a.order - b.order);
  const totalBlocks = blocks.length;
  const completedBlocks = blocks.filter((b: any) => completedSet.has(b.contentBlockId || b.id)).length;
  const modProgressPct = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;

  const currentModuleIndex = course.modules.findIndex((m: any) => m.id === module.id);
  const prevModule = currentModuleIndex > 0 ? course.modules[currentModuleIndex - 1] : null;
  const nextModule = currentModuleIndex < course.modules.length - 1 ? course.modules[currentModuleIndex + 1] : null;

  // Lock next module until required tasks (quiz or code exam) are completed in this module
  const requiredBlocks = blocks.filter((b: any) => b?.type === 'quiz' || (b?.type === 'code' && (b?.codeKind === 'exam')));
  const initiallyLocked = requiredBlocks.some((b: any) => !completedSet.has(b.contentBlockId || b.id));

  return (
    <PrismClient>
      <ScrollProgressBar />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/courses/${course.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground truncate">{course.title}</span>
        </div>

        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient">{module.displayIndex ? `${module.displayIndex} ` : ''}{module.title}</h1>
          <div className="mt-3 rounded-lg bg-card/50 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-muted-foreground">Module Progress</div>
              <div className="text-sm font-medium">{modProgressPct}%</div>
            </div>
            <Progress value={modProgressPct} className="h-2 mt-2" />
            <div className="text-xs text-muted-foreground mt-1">{completedBlocks} of {totalBlocks} items</div>
          </div>
        </header>

        <div className="space-y-4 sm:space-y-6">
          {blocks.map((b: any, idx: number) => (
            <Card key={b.id} className="border-0 shadow-none rounded-xl bg-transparent animate-slide-up" style={{ animationDelay: `${Math.min(idx * 70, 600)}ms` }}>
              <CardContent className="p-0 sm:p-0">
                <h2 className="text-lg sm:text-xl font-semibold mb-2 leading-snug">{b.title}</h2>

                {b.type === 'text' && (
                  <div className={b.textFontSize || ''}>
                    {(() => {
                      const text = b.content || '';
                      const lvl = b.textHeadingLevel;
                      if (!lvl) return <div className="whitespace-pre-wrap indent-4">{text}</div>;
                      const Tag: any = `h${lvl}`;
                      return <Tag className="mt-0">{text}</Tag>;
                    })()}
                  </div>
                )}

                {b.type === 'video' && b.videoUrl && (
                  <div className="aspect-video w-full">
                    <iframe src={b.videoUrl} className="w-full h-full rounded" allowFullScreen />
                  </div>
                )}

                {b.type === 'bullets' && Array.isArray(b.bullets) && (
                  <ul className="ml-6 list-disc space-y-1">
                    {b.bullets.map((it: string, i: number) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                )}

                {b.type === 'image' && b.imageUrl && (
                  <figure>
                    <img src={b.imageUrl} alt={b.alt || ''} className="w-full max-h-96 rounded-lg object-contain" />
                    {(b.caption || b.alt) && (
                      <figcaption className="text-sm text-muted-foreground mt-1">{b.caption || b.alt}</figcaption>
                    )}
                  </figure>
                )}

                {b.type === 'code' && (
                  <>
                    {b.codeKind === 'illustrative' && (b.codeContent || b.codeTemplate) && (
                      <pre className="bg-muted/60 p-3 rounded overflow-auto mb-3" style={{ fontSize: (b.codeFontSize ? Number(b.codeFontSize) : 12) + 'px' }}>
                        <code className={`language-${b.codeLanguage || 'javascript'}`}>{b.codeContent || b.codeTemplate || ''}</code>
                      </pre>
                    )}
                    <CodeRunnerClient
                      language={b.codeLanguage || 'javascript'}
                      starterCode={b.codeTemplate || ''}
                      mode={b.codeKind || 'illustrative'}
                      testCases={b.testCases || []}
                      courseId={course.id}
                      moduleId={module.id}
                      contentBlockId={b.id}
                    />
                  </>
                )}

                {b.type === 'quiz' && b.quiz && (
                <QuizClient quiz={b.quiz} courseId={course.id} moduleId={module.id} contentBlockId={b.id} />
              )}

                {b.type === 'assignment' && (
                  <div className="space-y-2">
                    {b.content && (
                      <div className="prose max-w-none whitespace-pre-wrap">{b.content}</div>
                    )}
                    {typeof b.estimatedMinutes === 'number' && (
                      <div className="text-xs text-muted-foreground">Estimated time: ~{b.estimatedMinutes} min</div>
                    )}
                  </div>
                )}

                {b.type === 'composite' && Array.isArray(b.items) && (
                  <div className="space-y-3">
                    {b.items.map((it: any, i: number) => (
                      <div key={it.id || i} className="rounded-lg">
                        {it.kind === 'markdown' && (
                          <div className="whitespace-pre-wrap">{it.content || ''}</div>
                        )}
                        {it.kind === 'text' && (
                          <div className={it.textFontSize || ''}>
                            {(() => {
                              const text = it.content || '';
                              const lvl = it.textHeadingLevel;
                              if (!lvl) return <div className="whitespace-pre-wrap indent-4">{text}</div>;
                              const Tag: any = `h${lvl}`;
                              return <Tag className="mt-0">{text}</Tag>;
                            })()}
                          </div>
                        )}
                        {it.kind === 'video' && it.videoUrl && (
                          <div className="aspect-video w-full"><iframe src={it.videoUrl} className="w-full h-full rounded" allowFullScreen /></div>
                        )}
                        {it.kind === 'bullets' && Array.isArray(it.bullets) && (
                          <ul className="ml-6 list-disc space-y-1">
                            {it.bullets.map((x: string, bi: number) => (<li key={bi}>{x}</li>))}
                          </ul>
                        )}
                        {it.kind === 'code' && it.codeContent && (
                          <pre className="bg-muted/60 p-3 rounded overflow-auto mb-3" style={{ fontSize: (it.codeFontSize ? Number(it.codeFontSize) : 12) + 'px' }}>
                            <code className={`language-${it.codeLanguage || 'javascript'}`}>{it.codeContent}</code>
                          </pre>
                        )}
                        {it.kind === 'image' && it.imageUrl && (
                          <figure>
                            <img src={it.imageUrl} alt={it.alt || ''} className="max-h-96 rounded object-contain" />
                            {(it.caption || it.alt) && <figcaption className="text-sm text-muted-foreground mt-1">{it.caption || it.alt}</figcaption>}
                          </figure>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className="my-6 opacity-50" />

        <div className="h-20" />
      </div>
      {/* Sticky bottom nav with gating */}
      <ModuleNextGate
        courseId={course.id}
        moduleId={module.id}
        prevHref={prevModule ? `/courses/${course.id}/${prevModule.id}` : null}
        nextHref={nextModule ? `/courses/${course.id}/${nextModule.id}` : `/courses/${course.id}`}
        initiallyLocked={!!nextModule && initiallyLocked}
      />
    </PrismClient>
  );
}
