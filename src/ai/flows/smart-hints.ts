'use server';

/**
 * @fileOverview Provides smart hints to students who are stuck on a coding problem.
 *
 * - getSmartHint - A function that takes the student's current code and provides a helpful hint.
 * - SmartHintInput - The input type for the getSmartHint function.
 * - SmartHintOutput - The return type for the getSmartHint function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartHintInputSchema = z.object({
  code: z.string().describe('The student\'s current, potentially incomplete, code.'),
  assignmentPrompt: z.string().describe('The prompt for the coding assignment.'),
  programmingLanguage: z.string().describe('The programming language of the code.'),
});
export type SmartHintInput = z.infer<typeof SmartHintInputSchema>;

const SmartHintOutputSchema = z.object({
  hint: z.string().describe('A small, contextual hint to help the student proceed without giving away the solution.'),
});
export type SmartHintOutput = z.infer<typeof SmartHintOutputSchema>;

export async function getSmartHint(input: SmartHintInput): Promise<SmartHintOutput> {
  return smartHintFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartHintPrompt',
  input: {schema: SmartHintInputSchema},
  output: {schema: SmartHintOutputSchema},
  prompt: `You are an AI teaching assistant. A student is working on a coding problem and is stuck. Provide a small, helpful hint based on their current code and the assignment prompt. Do not give the full solution. Your hint should guide them to the next logical step.

Assignment: {{{assignmentPrompt}}}
Language: {{{programmingLanguage}}}
Student's Code:
\'\'\'
{{{code}}}
\'\'\'`,
});

const smartHintFlow = ai.defineFlow(
  {
    name: 'smartHintFlow',
    inputSchema: SmartHintInputSchema,
    outputSchema: SmartHintOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
