'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SummaryInputSchema = z.object({
  content: z.string().min(1).describe('Lesson or section content to summarize'),
  maxSentences: z.number().min(1).max(6).default(3),
});
export type SummaryInput = z.infer<typeof SummaryInputSchema>;

const SummaryOutputSchema = z.object({
  summary: z.string(),
});
export type SummaryOutput = z.infer<typeof SummaryOutputSchema>;

export async function summarize(input: SummaryInput): Promise<SummaryOutput> {
  return summaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'studentSummaryPrompt',
  input: { schema: SummaryInputSchema },
  output: { schema: SummaryOutputSchema },
  prompt: `Summarize the following learning content in up to {{{maxSentences}}} short sentences that are easy to scan.

Content:\n'''\n{{{content}}}\n'''\n\nReturn only the summary text.`,
});

const summaryFlow = ai.defineFlow(
  {
    name: 'studentSummaryFlow',
    inputSchema: SummaryInputSchema,
    outputSchema: SummaryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
