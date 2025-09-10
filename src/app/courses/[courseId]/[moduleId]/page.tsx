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
import CodeRunnerClient from '@/components/course/lazy/CodeRunnerLazy';
import CopyButton from '@/components/CopyButton';
import QuizClient from '@/components/course/lazy/QuizLazy';
import VideoBlock from '@/components/course/lazy/VideoLazy';
import { CodingAssignment } from '@/components/course/CodingAssignment';
import { Progress } from '@/components/ui/progress';
import PrismClient from '@/components/PrismClient';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import ScrollProgressBar from '@/components/ScrollProgressBar';
import ModuleNextGate from '@/components/course/ModuleNextGate';
import ModuleProgressClient from '@/components/course/ModuleProgressClient';
import StudyPanel from '@/components/ai/StudyPanel';
import Prefetch from '@/components/Prefetch';
import CompletionEffects from '@/components/CompletionEffects';
import ProctorMonitorClient from '@/components/assessment/ProctorMonitorClient';
import AdaptiveQuizClient from '@/components/assessment/AdaptiveQuizClient';
import PlagiarismDetectorClient from '@/components/assessment/PlagiarismDetectorClient';
import PeerReviewClient from '@/components/assessment/PeerReviewClient';
import HtmlRenderer from '@/components/HtmlRenderer';

// Helper function to serialize MongoDB objects to plain objects
function serializeForClient(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(serializeForClient);
  
  const serialized: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && key !== '_id' && key !== '__v') {
      const value = obj[key];
      if (value instanceof Date) {
        serialized[key] = value.toISOString();
      } else if (typeof value === 'object' && value !== null) {
        serialized[key] = serializeForClient(value);
      } else {
        serialized[key] = value;
      }
    }
  }
  return serialized;
}

export default async function ModulePage({ params }: { params: Promise<{ courseId: string, moduleId: string }> }) {
  const { courseId, moduleId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) redirect(`/login?redirect=/courses/${courseId}/${moduleId}`);
  try { verifyJWT(token); } catch { redirect(`/login?redirect=/courses/${courseId}/${moduleId}`); }

  await ensureMongooseConnection();
  const course = await CourseService.getById(courseId);
  if (!course) notFound();
  if (!course.isPublished) notFound();

  const module = course.modules.find((m: any) => m.id === moduleId);
  if (!module) notFound();

  // Compute progress for this student and module
  const auth = verifyJWT(token);
  const progressList = await ProgressService.getByStudent(String(auth.sub));
  // Build separate sets for completed modules and blocks
  const completedBlockIds = new Set<string>(
    progressList.flatMap((p: any) => Array.isArray(p.completedContentBlocks) ? p.completedContentBlocks : [])
  );
  const completedModuleIds = new Set<string>(
    progressList.flatMap((p: any) => Array.isArray(p.completedModules) ? p.completedModules : [])
  );
  const blocks = [...(module.contentBlocks || [])].sort((a: any, b: any) => a.order - b.order);

  // Sequential required gating: find first unmet required block index
  const seqRequired = Boolean((module as any).sequentialRequired);
  const isRequiredBlock = (b: any) => !!b.isRequired || b.type === 'quiz' || (b.type === 'code' && b.codeKind === 'exam') || (b.type === 'video' && typeof b.requiredPercent === 'number');
  const firstUnmetRequiredIndex = seqRequired
    ? blocks.findIndex((b: any) => isRequiredBlock(b) && !completedBlockIds.has(b.id))
    : -1;
  const totalBlocks = blocks.length;
  const completedBlocks = blocks.filter((b: any) => completedBlockIds.has(b.id)).length;
  const modProgressPct = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;

  // Determine lock state for this module based on prerequisites
  const prereqIds: string[] = Array.isArray(module.prerequisites) ? module.prerequisites : [];
  const unmetPrereqs = prereqIds.filter((id) => !completedModuleIds.has(id));
  const isLocked = Boolean(module.isLocked) && unmetPrereqs.length > 0;

  const currentModuleIndex = course.modules.findIndex((m: any) => m.id === module.id);
  const prevModule = currentModuleIndex > 0 ? course.modules[currentModuleIndex - 1] : null;
  const nextModule = currentModuleIndex < course.modules.length - 1 ? course.modules[currentModuleIndex + 1] : null;

  // Lock next module until required tasks are completed in current module
  const requiredBlocks = blocks.filter((b: any) => {
    const hasVideoReq = b?.type === 'video' && Number.isFinite(Number(b?.requiredPercent));
    return !!b?.isRequired || b?.type === 'quiz' || (b?.type === 'code' && (b?.codeKind === 'exam')) || hasVideoReq;
  });
  const initiallyLocked = requiredBlocks.some((b: any) => !completedBlockIds.has(b.id));

  // Prepare required blocks data for ModuleNextGate
  const requiredBlocksData = requiredBlocks.map((b: any) => ({
    id: b.id,
    title: b.title,
    type: b.type,
    completed: completedBlockIds.has(b.id),
  }));

  const progressClientBlocks = (blocks || []).map((b: any) => ({
    id: b.id,
    elementId: `block-${b.id}`,
    type: b.type,
    required: !!b?.isRequired || b?.type === 'quiz' || (b?.type === 'code' && (b?.codeKind === 'exam')),
  }));
  const initiallyCompletedIds = Array.from(completedBlockIds);

  return (
    <PrismClient>
      <ScrollProgressBar />
      <div className="mx-auto max-w-6xl px-4   sm:px-6 lg:px-8  animate-fade-in">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Link href={`/courses/${course.id}`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] rounded">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground truncate">{course.title}</span>
          </div>
        </div>

        <header className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">{module.displayIndex ? `${module.displayIndex+"."} ` : ''}{module.title}</h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-1">{course.title}</p>
          {isLocked && (
            <div className="mt-3 rounded-md border bg-muted/30 p-3">
              <div className="text-sm font-medium">Module locked</div>
              <div className="text-sm text-muted-foreground">Complete the required modules to unlock this module.</div>
              {unmetPrereqs.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                  {unmetPrereqs.map((id) => {
                    const m = course.modules.find((mm: any) => mm.id === id);
                    return <li key={id}>{m?.displayIndex ? `${m.displayIndex} ` : ''}{m?.title || id}</li>;
                  })}
                </ul>
              )}
            </div>
          )}
          <div className="mt-3">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Module Progress</span>
              <span>{modProgressPct}%</span>
            </div>
            <Progress value={modProgressPct} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">{completedBlocks} of {totalBlocks} items</div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {!isLocked ? (
              <div className="space-y-3">
            {blocks.map((b: any, idx: number) => (
              <Card 
                key={b.id} 
                id={`block-${b.id}`} 
                className="rounded-2xl border-0 bg-card shadow-sm animate-slide-up" 
                style={{ animationDelay: `${Math.min(idx * 70, 600)}ms` }}
                data-block-id={b.id}
                data-block-title={b.title}
                data-block-type={b.type}
                data-required={(() => { const hasVideoReq = b?.type === 'video' && Number.isFinite(Number(b?.requiredPercent)); return !!b?.isRequired || b?.type === 'quiz' || (b?.type === 'code' && (b?.codeKind === 'exam')) || hasVideoReq; })() ? 'true' : 'false'}
                data-completed={completedBlockIds.has(b.id) ? 'true' : 'false'}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-semibold leading-tight m-0">{b.title}</h2>
                  </div>

                  {seqRequired && firstUnmetRequiredIndex >= 0 && idx > firstUnmetRequiredIndex ? (
                    <div className="text-sm text-muted-foreground border rounded-md p-3 bg-muted/30">
                      This section is locked. Complete previous required content to continue.
                    </div>
                  ) : (
                    <>
                      {b.type === 'text' && (
                        (() => {
                          const style: any = {};
                          if (b.textFontSize) style.fontSize = b.textFontSize;
                          const lvl = Number(b.textHeadingLevel) || 0;
                          const content = <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{b.content || ''}</ReactMarkdown>;
                          if (lvl >= 1 && lvl <= 6) {
                            const Tag: any = `h${lvl}`;
                            return <Tag style={style}>{content}</Tag>;
                          }
                          return <div style={style}>{content}</div>;
                        })()
                      )}

                      {b.type === 'html' && (
                        <HtmlRenderer html={b.html || ''} />
                      )}

                      {b.type === 'video' && b.videoUrl && (
                        <div className="w-full">
                          <VideoBlock
                            src={b.videoUrl}
                            poster={b.poster || ''}
                            courseId={course.id}
                            moduleId={module.id}
                            contentBlockId={b.id}
                            required={!!b.isRequired || Number.isFinite(Number(b.requiredPercent))}
                            requiredPercent={Number.isFinite(Number(b.requiredPercent)) ? Number(b.requiredPercent) : undefined}
                          />
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
                            <div className="rounded-md overflow-hidden border bg-[#2d2d2d] mb-3">
                              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
                                  <span className="inline-block h-3 w-3 rounded-full bg-yellow-500" />
                                  <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-xs text-gray-300">{(b.codeLanguage || 'javascript').toUpperCase()}</div>
                                  <CopyButton text={(b.codeContent || b.codeTemplate || '')} />
                                </div>
                              </div>
                              <div className="p-3 overflow-auto" style={{ fontSize: (b.codeFontSize ? Number(b.codeFontSize) : 12) + 'px' }}>
                                <pre className="m-0 p-0 bg-transparent"><code className={`language-${b.codeLanguage || 'javascript'}`}>{b.codeContent || b.codeTemplate || ''}</code></pre>
                              </div>
                            </div>
                          )}
                          <CodeRunnerClient
                            language={b.codeLanguage || 'javascript'}
                            starterCode={b.codeTemplate || ''}
                            mode={b.codeKind || 'illustrative'}
                            testCases={serializeForClient(b.testCases || [])}
                            courseId={course.id}
                            moduleId={module.id}
                            contentBlockId={b.id}
                          />
                        </>
                      )}

                      {b.type === 'quiz' && b.quiz && (
                        <QuizClient quiz={serializeForClient(b.quiz)} courseId={course.id} moduleId={module.id} contentBlockId={b.id} />
                      )}

                      {b.type === 'assignment' && (
                        <CodingAssignment 
                          module={serializeForClient({
                            ...b,
                            content: b.content || 'Complete the coding assignment below:'
                          })}
                          course={serializeForClient({
                            ...course,
                            language: b.codeLanguage || course.language || 'JavaScript',
                            imageUrl: course.imageUrl || '',
                            imageHint: course.imageHint || '',     
                          })}
                        />
                      )}

                      {b.type === 'composite' && Array.isArray(b.items) && (
                        <div className="space-y-3">
                          {b.items.map((it: any, i: number) => (
                            <div key={it.id || i} className="rounded-lg">
                              {it.kind === 'markdown' && (
                                <div className="whitespace-pre-wrap">{it.content || ''}</div>
                              )}
                              {it.kind === 'text' && (
                                (() => {
                                  const style: any = {};
                                  if (it.textFontSize) style.fontSize = it.textFontSize;
                                  const lvl = Number(it.textHeadingLevel) || 0;
                                  const content = <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{it.content || ''}</ReactMarkdown>;
                                  if (lvl >= 1 && lvl <= 6) {
                                    const Tag: any = `h${lvl}`;
                                    return <Tag style={style}>{content}</Tag>;
                                  }
                                  return <div style={style}>{content}</div>;
                                })()
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
                                <div className="rounded-md overflow-hidden border bg-[#2d2d2d] mb-3">
                                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
                                      <span className="inline-block h-3 w-3 rounded-full bg-yellow-500" />
                                      <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="text-xs text-gray-300">{(it.codeLanguage || 'javascript').toUpperCase()}</div>
                                      <CopyButton className="text-white bg-background" text={it.codeContent || ''} />
                                    </div>
                                  </div>
                                  <div className="p-3 overflow-auto" style={{ fontSize: (it.codeFontSize ? Number(it.codeFontSize) : 12) + 'px' }}>
                                    <pre className="m-0 p-0 bg-transparent "><code className={`language-${it.codeLanguage || 'javascript'}`}>{it.codeContent}</code></pre>
                                  </div>
                                </div>
                              )}
                              {it.kind === 'image' && it.imageUrl && (
                                <figure>
                                  <img src={it.imageUrl} alt={it.alt || ''} className="max-h-96 rounded object-contain" />
                                  {(it.caption || it.alt) && <figcaption className="text-sm text-muted-foreground mt-1">{it.caption || it.alt}</figcaption>}
                                </figure>
                              )}
                              {it.kind === 'html' && (
                                <HtmlRenderer html={it.html || ''} />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                Content is hidden until prerequisites are completed.
              </div>
            )}
            <Separator className="my-5 opacity-50" />
            <div className="h-10" />
          </div>
          <aside className="lg:col-span-1 space-y-4 lg:sticky lg:top-20 self-start">
            <StudyPanel courseId={course.id} moduleId={module.id} contextTitle={module.title} />
            
            {/* Gamification SkillTree removed: available on Profile page */}
            
            {/* Show assessment components based on block types */}
            {module.contentBlocks?.some(block => block.type === 'quiz') && (
              <AdaptiveQuizClient 
                courseId={course.id}
                moduleId={module.id}
                contentBlockId={module.contentBlocks.find(block => block.type === 'quiz')?.id || `${module.id}-quiz`}
                questionPool={serializeForClient((module.contentBlocks.find(block => block.type === 'quiz')?.quiz?.questions || []).map((q: any, idx: number) => ({
                  id: q.id ?? String(idx),
                  question: q.question ?? q.prompt ?? '',
                  type: (q.type === 'true_false' ? 'true_false' : (q.type === 'essay' ? 'essay' : (q.type === 'short_answer' ? 'short_answer' : 'multiple_choice'))),
                  options: q.options ?? q.choices ?? [],
                  correctAnswer: q.correctOptionId ?? q.answer ?? '',
                  difficulty: (q.difficulty as 1|2|3|4|5) ?? 3,
                  topic: q.topic ?? 'general',
                  timeEstimate: q.timeEstimate ?? 60,
                  explanation: q.explanation,
                  hints: q.hints ?? []
                })))}
                timeLimit={module.contentBlocks.find(block => block.type === 'quiz')?.quiz?.timeLimit}
              />
            )}
            
            
            {/* Show ProctorMonitor for proctored assessments */}
            {(module.contentBlocks?.some(block => block.type === 'quiz' && block.quiz?.proctored)) && (
              <ProctorMonitorClient 
                examId={`${course.id}-${module.id}`}
                studentId={auth.sub}
                isActive={true}
              />
            )}
          </aside>
        </div>
      </div>
      {nextModule && (
        <div className="container py-6 mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="mx-auto w-full max-w-2xl">
            <div
              className="group block rounded-2xl border bg-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Up next</div>
                  <h3 className="mt-1 font-semibold text-lg truncate">
                    {nextModule.displayIndex ? `${nextModule.displayIndex}. ` : ''}{nextModule.title}
                  </h3>
                  {nextModule.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{nextModule.description}</p>
                  )}
                </div>
              
              </div>
            </div>
         
          </div>
        </div>
      )}
      {!nextModule && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="mx-auto w-full max-w-2xl">
            <div className="rounded-2xl border bg-card p-5 sm:p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">🎉</div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg">Course finished</h3>
                  <p className="text-sm text-muted-foreground mt-1">Great job finishing this course. You can review the course overview or browse other courses.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/courses/${course.id}`} className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-primary text-primary-foreground text-sm hover:opacity-90">Finish course</Link>
                    <Link href={`/courses`} className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-muted text-foreground text-sm hover:bg-muted/80">Browse courses</Link>
                  </div>
                </div>
              </div>
            </div>
            <CompletionEffects courseId={course.id} courseTitle={course.title} />
          </div>
        </div>
      )}
      {/* Footer spacer so sticky bottom tabs don't cover content */}
      <div className="h-40 sm:h-32 md:h-24" aria-hidden="true" />
      {nextModule && (
        <Prefetch href={`/courses/${course.id}/${nextModule.id}`} />
      )}
      {/* Client tracker for in-view completion and time autosave */}
      <ModuleProgressClient
        courseId={course.id}
        moduleId={module.id}
        blocks={serializeForClient(progressClientBlocks)}
        initiallyCompletedIds={initiallyCompletedIds}
      />
      {/* Sticky bottom nav with gating */}
      <ModuleNextGate
        courseId={course.id}
        moduleId={module.id}
        prevHref={prevModule ? `/courses/${course.id}/${prevModule.id}` : null}
        nextHref={nextModule ? `/courses/${course.id}/${nextModule.id}` : `/courses/${course.id}`}
        initiallyLocked={!!nextModule && initiallyLocked}
        requiredBlocks={serializeForClient(requiredBlocksData)}
      />
    </PrismClient>
  );
}
