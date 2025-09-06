// src/ai/flows/personalized-module-recommendations.ts
'use server';

/**
 * @fileOverview Provides personalized module recommendations to students based on their progress and performance.
 *
 * - getPersonalizedModuleRecommendations - A function that takes a student's learning history and returns a list of recommended modules.
 * - PersonalizedModuleRecommendationsInput - The input type for the getPersonalizedModuleRecommendations function.
 * - PersonalizedModuleRecommendationsOutput - The return type for the getPersonalizedModuleRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedModuleRecommendationsInputSchema = z.object({
  studentId: z.string().describe('The unique identifier of the student.'),
  learningHistory: z.string().describe('A summary of the student\'s completed modules and performance.'),
  currentCourse: z.string().describe('The course the student is currently enrolled in.'),
});
export type PersonalizedModuleRecommendationsInput = z.infer<typeof PersonalizedModuleRecommendationsInputSchema>;

const PersonalizedModuleRecommendationsOutputSchema = z.object({
  recommendedModules: z.array(z.string()).describe('A list of module names recommended for the student.'),
  reasoning: z.string().describe('Explanation of why these modules were recommended.'),
});
export type PersonalizedModuleRecommendationsOutput = z.infer<typeof PersonalizedModuleRecommendationsOutputSchema>;

export async function getPersonalizedModuleRecommendations(
  input: PersonalizedModuleRecommendationsInput
): Promise<PersonalizedModuleRecommendationsOutput> {
  return personalizedModuleRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedModuleRecommendationsPrompt',
  input: {schema: PersonalizedModuleRecommendationsInputSchema},
  output: {schema: PersonalizedModuleRecommendationsOutputSchema},
  prompt: `You are an AI learning assistant that provides personalized module recommendations to students.

  Based on the student's learning history and current course, recommend modules that will help the student improve their understanding and skills.

  Student ID: {{{studentId}}}
  Learning History: {{{learningHistory}}}
  Current Course: {{{currentCourse}}}

  Provide a list of recommended modules and a brief explanation of why these modules were recommended.
  Format the output as a JSON object with "recommendedModules" (array of module names) and "reasoning" (string explanation) fields.
  `,
});

const personalizedModuleRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizedModuleRecommendationsFlow',
    inputSchema: PersonalizedModuleRecommendationsInputSchema,
    outputSchema: PersonalizedModuleRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
