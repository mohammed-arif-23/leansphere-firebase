'use server';

/**
 * @fileOverview Provides AI-powered code execution and grading.
 *
 * - executeCode - A function that runs code and provides results.
 * - ExecuteCodeInput - The input type for the executeCode function.
 * - ExecuteCodeOutput - The return type for the executeCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExecuteCodeInputSchema = z.object({
  code: z.string().describe('The code submitted by the student.'),
  language: z.string().describe('The programming language of the code.'),
  assignmentPrompt: z.string().describe('The prompt for the coding assignment.'),
});
export type ExecuteCodeInput = z.infer<typeof ExecuteCodeInputSchema>;

const ExecuteCodeOutputSchema = z.object({
  success: z.boolean().describe('Whether the code executed successfully and met the criteria.'),
  output: z.string().describe('The stdout from the code execution.'),
  errors: z.string().optional().describe('Any errors from the code execution.'),
  feedback: z.string().describe('A detailed explanation of the outcome, explaining why the code is correct or incorrect based on the assignment.'),
  score: z.number().describe('A score from 0 to 100 representing the code\'s correctness.'),
});
export type ExecuteCodeOutput = z.infer<typeof ExecuteCodeOutputSchema>;

export async function executeCode(input: ExecuteCodeInput): Promise<ExecuteCodeOutput> {
  return executeCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'executeCodePrompt',
  input: {schema: ExecuteCodeInputSchema},
  output: {schema: ExecuteCodeOutputSchema},
  prompt: `You are a code execution and grading engine. Evaluate the following code submission based on the assignment prompt. 
  
Execute the code and determine if it is correct. Provide a score, detailed feedback, and any output or errors.

The feedback should explain *why* the code is correct or incorrect by comparing its output and logic to the assignment requirements.

Assignment: {{{assignmentPrompt}}}
Language: {{{language}}}
Code:
\'\'\'
{{{code}}}
\'\'\'

The score should be an integer between 0 and 100. The success flag should be true only if the score is above 70.`,
});

const executeCodeFlow = ai.defineFlow(
  {
    name: 'executeCodeFlow',
    inputSchema: ExecuteCodeInputSchema,
    outputSchema: ExecuteCodeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
