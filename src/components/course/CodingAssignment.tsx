'use client';

import type { Module, Course } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateStarterCode } from '@/ai/flows/generate-starter-code';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { CheckCircle, Loader2, Sparkles, Terminal, XCircle } from 'lucide-react';

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
  const [submissionResult, setSubmissionResult] = useState<'success' | 'error' | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { code: '' },
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

  const onSubmit = (data: z.infer<typeof FormSchema>) => {
    setIsSubmitting(true);
    setSubmissionResult(null);

    // Simulate API call to Judge0
    setTimeout(() => {
      const isSuccess = Math.random() > 0.3; // Simulate success or failure
      if (isSuccess) {
        setSubmissionResult('success');
      } else {
        setSubmissionResult('error');
      }
      setIsSubmitting(false);
    }, 2000);
  };

  return (
    <Card>
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
                  <FormControl>
                    <Textarea
                      placeholder={`// Your ${course.language} code here...`}
                      className="min-h-[300px] font-code text-sm bg-accent/50 text-accent-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             {submissionResult && (
              <Alert variant={submissionResult === 'success' ? 'default' : 'destructive'} className="mt-4 border-green-500/50 text-green-700 dark:text-green-400 [&>svg]:text-green-500">
                {submissionResult === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertTitle>{submissionResult === 'success' ? 'Success!' : 'Tests Failed'}</AlertTitle>
                <AlertDescription>
                  {submissionResult === 'success' ? 'All tests passed. Great job!' : 'One or more tests failed. Please review your code and try again.'}
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
            <Button type="submit" disabled={isSubmitting} className='bg-accent text-accent-foreground hover:bg-accent/90'>
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
