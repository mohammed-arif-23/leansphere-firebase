
'use client';

import type { Module, Course, CodeExecutionResponse, ContentBlock } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateStarterCode } from '@/ai/flows/generate-starter-code';
import { getCodeReview } from '@/ai/flows/ai-code-review';
import { getSmartHint } from '@/ai/flows/smart-hints';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { CheckCircle, Loader2, Sparkles, Terminal, XCircle, Lightbulb, Bot, TestTube2, MessageSquareQuote, Languages } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Editor from '@monaco-editor/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"


interface CodingAssignmentProps {
  module: ContentBlock;
  course: Course;
}

const FormSchema = z.object({
  code: z.string().min(10, { message: 'Please write some code before submitting.' }),
});

export function CodingAssignment({ module, course }: CodingAssignmentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGettingHint, setIsGettingHint] = useState(false);
  const [isGettingReview, setIsGettingReview] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<CodeExecutionResponse | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(course.language.toLowerCase());
  const { toast } = useToast();

  const supportedLanguages = [
    { value: 'javascript', label: 'JavaScript', extension: 'js' },
    { value: 'python', label: 'Python', extension: 'py' },
    { value: 'java', label: 'Java', extension: 'java' },
    { value: 'html', label: 'HTML', extension: 'html' }
  ];

  const getLanguageConfig = (lang: string) => {
    return supportedLanguages.find(l => l.value === lang) || supportedLanguages[0];
  };

  const getDefaultCode = (language: string) => {
    // Use the actual content from backend if available, otherwise use module.content
    const backendContent = module.codeContent || module.codeTemplate || module.content;
    
    // If backend provides specific code content, use it directly
    if (module.codeContent || module.codeTemplate) {
      return backendContent || '';
    }
    
    // Get the assignment description, with fallback
    const assignmentDescription = module.content || 'Complete the coding assignment';
    
    // Otherwise, create language-specific templates with the assignment description
    switch (language) {
      case 'python':
        return `# ${assignmentDescription}\n\ndef main():\n    # Write your solution here\n    pass\n\nif __name__ == "__main__":\n    main()`;
      case 'java':
        return `// ${assignmentDescription}\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}`;
      case 'html':
        return `<!-- ${assignmentDescription} -->\n\n<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Solution</title>\n</head>\n<body>\n    <!-- Write your HTML solution here -->\n</body>\n</html>`;
      default:
        return `// ${assignmentDescription}\n\nfunction main() {\n    // Write your solution here\n}`;
    }
  };

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { code: getDefaultCode(selectedLanguage) },
  });

  useEffect(() => {
    form.setValue('code', getDefaultCode(selectedLanguage));
  }, [selectedLanguage, form]);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      const result = await generateStarterCode({
        prompt: module.content || 'Complete the coding assignment',
        programmingLanguage: getLanguageConfig(selectedLanguage).label,
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

  const handleGetHint = async () => {
    setIsGettingHint(true);
    setHint(null);
    try {
      const result = await getSmartHint({
        code: form.getValues('code'),
        assignmentPrompt: module.content || 'Complete the coding assignment',
        programmingLanguage: getLanguageConfig(selectedLanguage).label,
      });
      setHint(result.hint);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get a hint.',
      });
    } finally {
      setIsGettingHint(false);
    }
  };
  
  const handleGetReview = async () => {
    setIsGettingReview(true);
    setReview(null);
    try {
      const result = await getCodeReview({
        code: form.getValues('code'),
        assignmentPrompt: module.content || 'Complete the coding assignment',
        programmingLanguage: getLanguageConfig(selectedLanguage).label,
      });
      setReview(result.review);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get code review.',
      });
    } finally {
      setIsGettingReview(false);
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
          language: selectedLanguage,
          assignmentPrompt: module.content,
        }),
      });

      if (!response.ok) {
         const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute code');
      }

      const result: CodeExecutionResponse = await response.json();
      setSubmissionResult(result);

      // If successful with perfect score, trigger module completion
      if (result.success && result.score === 100) {
        try {
          await fetch('/api/learning/progress/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              courseId: course.id,
              moduleId: course.id,
              contentBlockId: module.id
            }),
          });
          
          // Update DOM so gating can unlock instantly
          try {
            const el = document.querySelector(`[data-block-id="${module.id}"]`);
            if (el) (el as HTMLElement).setAttribute('data-completed', 'true');
          } catch {}
          
          // Dispatch events to trigger UI updates
          try { 
            window.dispatchEvent(new CustomEvent('blockCompleted')); 
            window.dispatchEvent(new CustomEvent('module-unlock')); 
          } catch {}
          
          toast({
            title: 'Assignment Completed!',
            description: 'Great job! Your solution is perfect. The module has been unlocked.',
          });
          
        } catch (error) {
          console.error('Failed to update progress:', error);
        }
      }

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
    <div className="space-y-6">
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Coding Assignment</CardTitle>
              <CardDescription>{module.content}</CardDescription>
            </div>
           
          </div>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-4">
                      <FormLabel className="text-lg">Your Solution</FormLabel>
                      <div className="flex items-center gap-2">
                        <Languages className="h-4 w-4" />
                        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {supportedLanguages.map((lang) => (
                              <SelectItem key={lang.value} value={lang.value}>
                                {lang.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mt-2">
                       <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b dark:border-gray-700 flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="ml-4 text-sm font-medium">
                              {selectedLanguage === 'java' ? 'main.java' : 
                               selectedLanguage === 'python' ? 'main.py' : 
                               selectedLanguage === 'html' ? 'index.html' : 'main.js'}
                            </span>
                          </div>
                        </div>
                        <FormControl>
                          <Editor
                            height="450px"
                            language={selectedLanguage}
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
                              padding: { top: 16, bottom: 16 },
                              wordWrap: 'on',
                              scrollbar: {
                                vertical: 'visible',
                                horizontal: 'visible'
                              }
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
                Generate Code
              </Button>
              <Button type="submit" disabled={isSubmitting} className='bg-green-600 hover:bg-green-700'>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube2 className="mr-2 h-4 w-4" />
                )}
                Submit
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center"><Terminal className="mr-2 h-5 w-5"/> Execution Result</h3>
          </div>
        </div>

        <div className="p-6 font-mono text-sm min-h-[200px]">
          {isSubmitting ? (
             <div className="flex items-center space-x-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing and grading your code...</span>
              </div>
          ) : submissionResult ? (
            <div className="space-y-4">
              <Alert variant={submissionResult.success ? 'default' : 'destructive'} className="border-l-4 border-l-current">
                {submissionResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertTitle>{submissionResult.success ? 'Success!' : 'Needs Improvement'} (Score: {submissionResult.score})</AlertTitle>
              </Alert>

              {submissionResult.output && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Console Output:</h4>
                  <pre className="bg-black text-green-400 p-3 rounded-md overflow-auto text-xs">
                    <code>{submissionResult.output}</code>
                  </pre>
                </div>
              )}
              
              {submissionResult.errors && (
                 <div>
                  <h4 className="font-semibold text-foreground mb-2">Errors:</h4>
                  <pre className="bg-red-900/20 text-red-400 p-3 rounded-md overflow-auto text-xs">
                    <code>{submissionResult.errors}</code>
                  </pre>
                </div>
              )}

            </div>
          ) : (
            <div className="text-gray-500 italic">
              Click "Submit" to see the result...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
