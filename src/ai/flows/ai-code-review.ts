'use server';

/**
 * @fileOverview Provides AI-powered code review for student submissions.
 *
 * - getCodeReview - A function that takes student code and returns a review.
 * - CodeReviewInput - The input type for the getCodeReview function.
 * - CodeReviewOutput - The return type for the getCodeReview function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CodeReviewInputSchema = z.object({
  code: z.string().describe('The code submitted by the student.'),
  assignmentPrompt: z.string().describe('The prompt for the coding assignment.'),
  programmingLanguage: z.string().describe('The programming language of the code.'),
});
export type CodeReviewInput = z.infer<typeof CodeReviewInputSchema>;

const CodeReviewOutputSchema = z.object({
  review: z.string().describe('A comprehensive review of the code, including suggestions for improvement.'),
});
export type CodeReviewOutput = z.infer<typeof CodeReviewOutputSchema>;

export async function getCodeReview(input: CodeReviewInput): Promise<CodeReviewOutput> {
  return codeReviewFlow(input);
}

const prompt = ai.definePrompt({
  name: 'codeReviewPrompt',
  input: {schema: CodeReviewInputSchema},
  output: {schema: CodeReviewOutputSchema},
  prompt: `You are an expert programming instructor. Review the following code submission based on the assignment prompt and provide constructive feedback.

Assignment: {{{assignmentPrompt}}}
Language: {{{programmingLanguage}}}
Code:
\'\'\'
{{{code}}}
\'\'\'

Provide feedback on correctness, style, and efficiency. Suggest specific improvements. Be encouraging and focus on helping the student learn.`,
});

const codeReviewFlow = ai.defineFlow(
  {
    name: 'codeReviewFlow',
    inputSchema: CodeReviewInputSchema,
    outputSchema: CodeReviewOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
