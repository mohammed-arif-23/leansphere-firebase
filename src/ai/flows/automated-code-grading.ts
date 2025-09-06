'use server';

/**
 * @fileOverview Provides automated grading for student code submissions.
 *
 * - gradeCode - A function that grades student code and provides a score and feedback.
 * - GradeCodeInput - The input type for the gradeCode function.
 * - GradeCodeOutput - The return type for the gradeCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GradeCodeInputSchema = z.object({
  code: z.string().describe('The code submitted by the student.'),
  assignmentPrompt: z.string().describe('The prompt for the coding assignment.'),
  programmingLanguage: z.string().describe('The programming language of the code.'),
});
export type GradeCodeInput = z.infer<typeof GradeCodeInputSchema>;

const GradeCodeOutputSchema = z.object({
  score: z.number().describe('A score from 0 to 100 representing the code\'s correctness.'),
  feedback: z.string().describe('A detailed explanation for the given score.'),
});
export type GradeCodeOutput = z.infer<typeof GradeCodeOutputSchema>;

export async function gradeCode(input: GradeCodeInput): Promise<GradeCodeOutput> {
  return gradeCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gradeCodePrompt',
  input: {schema: GradeCodeInputSchema},
  output: {schema: GradeCodeOutputSchema},
  prompt: `You are an automated code grading agent. Evaluate the following code submission based on the assignment prompt and provide a score and feedback.

Assignment: {{{assignmentPrompt}}}
Language: {{{programmingLanguage}}}
Code:
\'\'\'
{{{code}}}
\'\'\'

The score should be an integer between 0 and 100. The feedback should justify the score.`,
});

const gradeCodeFlow = ai.defineFlow(
  {
    name: 'gradeCodeFlow',
    inputSchema: GradeCodeInputSchema,
    outputSchema: GradeCodeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
