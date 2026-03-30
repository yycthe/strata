'use server';
/**
 * @fileOverview This file defines a Genkit flow for summarizing BC strata notices
 * and categorizing them by audience.
 *
 * - summarizeAndCategorizeNotice - A function that processes the notice content
 *   to generate a structured summary and audience recommendations.
 * - SummarizeAndCategorizeNoticeInput - The input type for the function.
 * - SummarizeAndCategorizeNoticeOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SummarizeAndCategorizeNoticeInputSchema = z.object({
  content: z.string().describe('The cleaned text content of the strata notice.')
});
export type SummarizeAndCategorizeNoticeInput = z.infer<typeof SummarizeAndCategorizeNoticeInputSchema>;

// Define sub-schemas explicitly for clarity and reuse if needed
const AISummarySchema = z.object({
  what: z.string().describe('A concise description of the main subject or event of the notice.'),
  when: z.string().describe("The date, time, or period related to the notice's event or effective date. If no specific date, use a general timeframe or 'N/A'."),
  impact: z.string().describe('The potential impact or consequences of the notice on residents or the strata. Be specific.'),
  action: z.string().describe("Any required or recommended action for residents or management, if applicable. If no action, state 'No specific action required'.")
});

const AudienceSchema = z.object({
  decision: z.enum(['BROADCAST', 'DIRECT', 'TARGETED', 'REVIEW']).describe("Based on the content, decide the best distribution method: 'BROADCAST' (for all residents/owners, general information), 'DIRECT' (for a specific individual, e.g., a board member mentioned by name, very rare), 'TARGETED' (for specific groups like owners of certain units, parking stalls, or lockers affected by the notice), or 'REVIEW' (if the target audience is unclear and requires human intervention)."),
  confidence: z.number().min(0).max(1).describe('A confidence score from 0.0 to 1.0 indicating how certain you are about the \'decision\'. 1.0 is very confident, 0.0 is very uncertain. Base this on clarity and explicitness in the notice.'),
  evidence: z.array(z.string()).describe('An array of short quotes or phrases (e.g., 5-15 words each) directly from the notice that strongly support your \'decision\' for the audience. Provide at least one piece of evidence if possible.'),
  target_hints: z.object({
    units: z.array(z.string()).describe("An array of specific unit numbers (e.g., ['101', '203']) mentioned or clearly implied as targets. Output an empty array if none are specified or implied."),
    strata_lots: z.array(z.string()).describe("An array of specific strata lot numbers (e.g., ['SL-123', 'SL-456']) mentioned or clearly implied as targets. Output an empty array if none."),
    parking: z.array(z.string()).describe("An array of specific parking stall numbers (e.g., ['P1', 'P-B2']) mentioned or clearly implied as targets. Output an empty array if none."),
    locker: z.array(z.string()).describe("An array of specific locker numbers (e.g., ['L10', 'L-A-12']) mentioned or clearly implied as targets. Output an empty array if none are specified or implied.")
  }).describe('Hints for specific target groups.')
});

const SummarizeAndCategorizeNoticeOutputSchema = z.object({
  summary: AISummarySchema,
  audience: AudienceSchema
});
export type SummarizeAndCategorizeNoticeOutput = z.infer<typeof SummarizeAndCategorizeNoticeOutputSchema>;

const summarizeAndCategorizeNoticePrompt = ai.definePrompt({
  name: 'summarizeAndCategorizeNoticePrompt',
  input: { schema: SummarizeAndCategorizeNoticeInputSchema },
  output: { schema: SummarizeAndCategorizeNoticeOutputSchema }, // Let Genkit handle the JSON output.
  prompt: `You are an expert assistant for BC Strata management. Your task is to analyze the content of a strata notice, create a structured summary, and determine the appropriate audience for distribution.

Here is the content of the strata notice:
{{{content}}}

Please provide your analysis in the required JSON format.`
});

const summarizeAndCategorizeNoticeFlow = ai.defineFlow(
  {
    name: 'summarizeAndCategorizeNoticeFlow',
    inputSchema: SummarizeAndCategorizeNoticeInputSchema,
    outputSchema: SummarizeAndCategorizeNoticeOutputSchema
  },
  async (input) => {
    const { output } = await summarizeAndCategorizeNoticePrompt(input);

    if (!output) {
      throw new Error('AI model did not return the expected structured output.');
    }
    
    // The output is already parsed and validated by Genkit.
    return output;
  }
);

export async function summarizeAndCategorizeNotice(
  input: SummarizeAndCategorizeNoticeInput
): Promise<SummarizeAndCategorizeNoticeOutput> {
  return summarizeAndCategorizeNoticeFlow(input);
}
