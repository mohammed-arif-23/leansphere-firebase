'use client';

import type { Module, Course } from '@/types';
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
import { CheckCircle, Loader2, Sparkles, Terminal, XCircle } from 'lucide-react';
import { gradeCode } from '@/ai/flows/automated-code-grading';
import Editor from '@monaco-editor/react';

interface CodingAssignmentProps {
  module: Module;
  course: Course;
}

const FormSchema = z.object({
  code: z.string().min(10, { message: 'Please write some code before submitting.' }),
});

type SubmissionResult = {
  status: 'success' | 'error';
  message: string;
}

export function CodingAssignment({ module, course }: CodingAssignmentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
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
      const result = await gradeCode({
        code: data.code,
        assignmentPrompt: module.content,
        programmingLanguage: course.language,
      });
      
      if (result.score > 70) {
        setSubmissionResult({ status: 'success', message: result.feedback });
      } else {
        setSubmissionResult({ status: 'error', message: result.feedback });
      }

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to grade your code. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm">
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
                            {course.language === "Java" ? "Main.java" : "main.py"}
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
             {submissionResult && (
              <Alert variant={submissionResult.status === 'success' ? 'default' : 'destructive'} className="mt-4">
                {submissionResult.status === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertTitle>{submissionResult.status === 'success' ? 'Success!' : 'Needs Improvement'}</AlertTitle>
                <AlertDescription>
                  {submissionResult.message}
                </AlertDescription>
              </Alert>
            )}
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
  );
}
