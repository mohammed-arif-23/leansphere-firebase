'use client';

import type { Module, Course, CodeExecutionResponse } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateStarterCode } from '@/ai/flows/generate-starter-code';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { CheckCircle, Loader2, Sparkles, Terminal, XCircle, Play } from 'lucide-react';
import Editor from '@monaco-editor/react';


interface CodingAssignmentProps {
  module: Module;
  course: Course;
}

const FormSchema = z.object({
  code: z.string().min(10, { message: 'Please write some code before submitting.' }),
});

export function CodingAssignment({ module, course }: CodingAssignmentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<CodeExecutionResponse | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { code: `// Start coding your solution for:\n// ${module.content}` },
  });

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      const result = await generateStarterCode({
        prompt: module.content,
        programmingLanguage: course.language,
      });
      form.setValue('code', result.starterCode);
      toast({
        title: 'Starter Code Generated!',
        description: 'The editor has been populated with starter code.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate starter code.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const response = await fetch('/api/learning/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: data.code,
          language: course.language.toLowerCase(),
          assignmentId: module.id,
        }),
      });

      if (!response.ok) {
         const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute code');
      }

      const result: CodeExecutionResponse = await response.json();
      setSubmissionResult(result);

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to execute your code. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Code Editor */}
      <Card className="bg-card/80 backdrop-blur-sm lg:col-span-2">
        <CardHeader>
          <CardTitle>Coding Assignment</CardTitle>
          <CardDescription>{module.content}</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg">Your Solution ({course.language})</FormLabel>
                    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mt-2">
                      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b dark:border-gray-700">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="ml-4 text-sm font-medium">
                              {course.language === "Java" ? "Main.java" : course.language === "Python" ? "main.py" : "main.js"}
                            </span>
                          </div>
                        </div>
                        <FormControl>
                          <Editor
                            height="400px"
                            language={course.language.toLowerCase()}
                            value={field.value}
                            onChange={field.onChange}
                            theme="vs-dark"
                            options={{
                              minimap: { enabled: false },
                              fontSize: 14,
                              lineNumbers: "on",
                              roundedSelection: false,
                              scrollBeyondLastLine: false,
                              automaticLayout: true,
                            }}
                          />
                        </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="justify-between">
              <Button type="button" variant="outline" onClick={handleGenerateCode} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Starter Code
              </Button>
              <Button type="submit" disabled={isSubmitting} className='bg-green-600 hover:bg-green-700'>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Terminal className="mr-2 h-4 w-4" />
                )}
                Run & Submit
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {/* Output Panel */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 lg:col-span-2">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Output</h3>
          </div>
        </div>

        <div className="p-4 font-mono text-sm min-h-[200px]">
          {isSubmitting ? (
             <div className="flex items-center space-x-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing...</span>
              </div>
          ) : submissionResult ? (
            <div className="space-y-4">
              <Alert variant={submissionResult.success ? 'default' : 'destructive'}>
                {submissionResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertTitle>{submissionResult.success ? 'Success!' : 'Needs Improvement'} (Score: {submissionResult.score})</AlertTitle>
                <AlertDescription>
                  {submissionResult.feedback}
                </AlertDescription>
              </Alert>

              {submissionResult.output && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Console Output:</h4>
                  <pre className="bg-black text-green-400 p-3 rounded overflow-auto">
                    {submissionResult.output}
                  </pre>
                </div>
              )}
              
              {submissionResult.errors && (
                 <div>
                  <h4 className="font-semibold text-foreground mb-2">Errors:</h4>
                  <pre className="bg-red-900/20 text-red-400 p-3 rounded overflow-auto">
                    {submissionResult.errors}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 italic">
              Click "Run & Submit" to see the output...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
