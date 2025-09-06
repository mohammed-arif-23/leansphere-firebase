'use server';

/**
 * @fileOverview Flow to generate starter code for coding assignments based on a prompt.
 *
 * - generateStarterCode - A function that generates starter code for a coding assignment.
 * - GenerateStarterCodeInput - The input type for the generateStarterCode function.
 * - GenerateStarterCodeOutput - The return type for the generateStarterCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStarterCodeInputSchema = z.object({
  prompt: z
    .string()
    .describe('A detailed prompt describing the coding assignment.'),
  programmingLanguage: z
    .string()
    .describe('The programming language for which to generate starter code (e.g., Java, Python).'),
});
export type GenerateStarterCodeInput = z.infer<typeof GenerateStarterCodeInputSchema>;

const GenerateStarterCodeOutputSchema = z.object({
  starterCode: z.string().describe('The generated starter code for the assignment.'),
});
export type GenerateStarterCodeOutput = z.infer<typeof GenerateStarterCodeOutputSchema>;

export async function generateStarterCode(input: GenerateStarterCodeInput): Promise<GenerateStarterCodeOutput> {
  return generateStarterCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStarterCodePrompt',
  input: {schema: GenerateStarterCodeInputSchema},
  output: {schema: GenerateStarterCodeOutputSchema},
  prompt: `You are an expert coding assistant. Generate starter code for the following assignment in the specified programming language. Only generate the code, with no surrounding text.

Assignment Description: {{{prompt}}}

Programming Language: {{{programmingLanguage}}}`,
});

const generateStarterCodeFlow = ai.defineFlow(
  {
    name: 'generateStarterCodeFlow',
    inputSchema: GenerateStarterCodeInputSchema,
    outputSchema: GenerateStarterCodeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
