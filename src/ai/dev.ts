import { config } from 'dotenv';
config();

import '@/ai/flows/generate-starter-code.ts';
import '@/ai/flows/ai-code-review.ts';
import '@/ai/flows/automated-code-grading.ts';
import '@/ai/flows/smart-hints.ts';
