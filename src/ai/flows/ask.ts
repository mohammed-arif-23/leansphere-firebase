'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AskInputSchema = z.object({
  question: z.string().min(1),
  context: z.string().optional(),
});
export type AskInput = z.infer<typeof AskInputSchema>;

const AskOutputSchema = z.object({
  answer: z.string(),
});
export type AskOutput = z.infer<typeof AskOutputSchema>;

export async function askAI(input: AskInput): Promise<AskOutput> {
  return askFlow(input);
}

const prompt = ai.definePrompt({
  name: 'studentAskPrompt',
  input: { schema: AskInputSchema },
  output: { schema: AskOutputSchema },
  prompt: `You are a concise, friendly teaching assistant. Answer the student's question clearly and briefly.
If context is provided, use it to ground your answer.

Context (optional):\n{{{context}}}
Question: {{{question}}}

Return only the answer text.`,
});

const askFlow = ai.defineFlow(
  {
    name: 'studentAskFlow',
    inputSchema: AskInputSchema,
    outputSchema: AskOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
