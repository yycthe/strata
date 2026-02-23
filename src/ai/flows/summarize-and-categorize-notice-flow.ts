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
  when: z.string().describe('The date, time, or period related to the notice\'s event or effective date. If no specific date, use a general timeframe or \'N/A\'.'),
  impact: z.string().describe('The potential impact or consequences of the notice on residents or the strata. Be specific.'),
  action: z.string().describe('Any required or recommended action for residents or management, if applicable. If no action, state \'No specific action required\'.')
});

const AudienceSchema = z.object({
  decision: z.enum(['BROADCAST', 'DIRECT', 'TARGETED', 'REVIEW']).describe("Based on the content, decide the best distribution method: 'BROADCAST' (for all residents/owners, general information), 'DIRECT' (for a specific individual, e.g., a board member mentioned by name, very rare), 'TARGETED' (for specific groups like owners of certain units, parking stalls, or lockers affected by the notice), or 'REVIEW' (if the target audience is unclear and requires human intervention)."),
  confidence: z.number().min(0).max(1).describe('A confidence score from 0.0 to 1.0 indicating how certain you are about the \'decision\'. 1.0 is very confident, 0.0 is very uncertain. Base this on clarity and explicitness in the notice.'),
  evidence: z.array(z.string()).describe('An array of short quotes or phrases (e.g., 5-15 words each) directly from the notice that strongly support your \'decision\' for the audience. Provide at least one piece of evidence if possible.'),
  target_hints: z.object({
    units: z.array(z.string()).describe('An array of specific unit numbers (e.g., [\'101\', \'203\']) mentioned or clearly implied as targets. Output an empty array if none are specified or implied.'),
    strata_lots: z.array(z.string()).describe('An array of specific strata lot numbers (e.g., [\'SL-123\', \'SL-456\']) mentioned or clearly implied as targets. Output an empty array if none.'),
    parking: z.array(z.string()).describe('An array of specific parking stall numbers (e.g., [\'P1\', \'P-B2\']) mentioned or clearly implied as targets. Output an empty array if none.'),
    locker: z.array(z.string()).describe('An array of specific locker numbers (e.g., [\'L10\', \'L-A-12\']) mentioned or clearly implied as targets. Output an empty array if none.')
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
  // IMPORTANT: We do NOT provide an output schema here directly for automatic parsing,
  // because the user explicitly asks for the output to be wrapped in <FINAL_JSON> tags.
  // Instead, the prompt describes the JSON structure, and we'll parse and validate it manually.
  prompt: `You are an expert assistant for BC Strata management. Your task is to summarize strata notices and determine the appropriate audience for distribution.\n\nThe output MUST be a JSON object, conforming to the structure described below, and wrapped exactly in <FINAL_JSON>...</FINAL_JSON> tags.\nDo NOT include any additional text, explanations, or markdown code blocks (like ```json) outside of the <FINAL_JSON> block.\n\nHere is the content of the strata notice:\n{{{content}}}\n\nThe JSON structure should be:\n{\n  "summary": {\n    "what": "A concise description of the main subject or event of the notice.",\n    "when": "The date, time, or period related to the notice's event or effective date. If no specific date, use a general timeframe or 'N/A'.",\n    "impact": "The potential impact or consequences of the notice on residents or the strata. Be specific.",\n    "action": "Any required or recommended action for residents or management, if applicable. If no action, state 'No specific action required'."\n  },\n  "audience": {\n    "decision": "Based on the content, decide the best distribution method: 'BROADCAST' (for all residents/owners, general information), 'DIRECT' (for a specific individual, e.g., a board member mentioned by name, very rare), 'TARGETED' (for specific groups like owners of certain units, parking stalls, or lockers affected by the notice), or 'REVIEW' (if the target audience is unclear and requires human intervention).",\n    "confidence": "A confidence score from 0.0 to 1.0 indicating how certain you are about the 'decision'. 1.0 is very confident, 0.0 is very uncertain. Base this on clarity and explicitness in the notice.",\n    "evidence": "An array of short quotes or phrases (e.g., 5-15 words each) directly from the notice that strongly support your 'decision' for the audience. Provide at least one piece of evidence if possible.",\n    "target_hints": {\n      "units": "An array of specific unit numbers (e.g., ['101', '203']) mentioned or clearly implied as targets. Output an empty array if none are specified or implied.",\n      "strata_lots": "An array of specific strata lot numbers (e.g., ['SL-123', 'SL-456']) mentioned or clearly implied as targets. Output an empty array if none.",\n      "parking": "An array of specific parking stall numbers (e.g., ['P1', 'P-B2']) mentioned or clearly implied as targets. Output an empty array if none.",\n      "locker": "An array of specific locker numbers (e.g., ['L10', 'L-A-12']) mentioned or clearly implied as targets. Output an empty array if none."\n    }\n  }\n}\n\nRemember: Your entire output must be a single JSON object inside <FINAL_JSON> tags. No other text.`
});

const summarizeAndCategorizeNoticeFlow = ai.defineFlow(
  {
    name: 'summarizeAndCategorizeNoticeFlow',
    inputSchema: SummarizeAndCategorizeNoticeInputSchema,
    outputSchema: SummarizeAndCategorizeNoticeOutputSchema // This schema is for validation *after* manual parsing
  },
  async (input) => {
    const { text } = await summarizeAndCategorizeNoticePrompt(input);

    if (!text) {
      throw new Error('AI model did not return any text.');
    }

    // Extract JSON from between <FINAL_JSON> tags
    const jsonMatch = text.match(/<FINAL_JSON>(.*?)<\/FINAL_JSON>/s);
    let rawJsonString: string;

    if (jsonMatch && jsonMatch[1]) {
      rawJsonString = jsonMatch[1].trim();
    } else {
      // Fallback: If tags are missing, try to parse the whole response.
      // This might catch cases where the model forgets the tags but still outputs valid JSON.
      console.warn('Warning: <FINAL_JSON> tags not found in AI response. Attempting to parse raw text as JSON.');
      rawJsonString = text.trim();
    }

    // Remove any markdown code block wrappers if they slipped through (e.g., ```json ... ```)
    if (rawJsonString.startsWith('```json')) {
        rawJsonString = rawJsonString.substring('```json'.length);
    }
    if (rawJsonString.endsWith('```')) {
        rawJsonString = rawJsonString.substring(0, rawJsonString.length - '```'.length);
    }
    rawJsonString = rawJsonString.trim();

    try {
      const parsedOutput = JSON.parse(rawJsonString);
      // Validate the parsed output against the outputSchema to ensure type safety
      return SummarizeAndCategorizeNoticeOutputSchema.parse(parsedOutput);
    } catch (e: any) {
      throw new Error(`Failed to parse or validate AI model JSON output: ${e.message}. Raw text snippet: "${rawJsonString.substring(0, 500)}..."`);
    }
  }
);

export async function summarizeAndCategorizeNotice(
  input: SummarizeAndCategorizeNoticeInput
): Promise<SummarizeAndCategorizeNoticeOutput> {
  return summarizeAndCategorizeNoticeFlow(input);
}
