'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a
 * user-friendly message for strata owners based on a structured AI summary.
 *
 * - generateOwnerMessage - A function that takes a summary and creates a message.
 * - GenerateOwnerMessageInput - The input type for the function (the AI summary).
 * - GenerateOwnerMessageOutput - The return type for the function (the generated message as a string).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AISummarySchema = z.object({
  what: z.string().describe('A concise description of the main subject or event of the notice.'),
  when: z.string().describe("The date, time, or period related to the notice's event or effective date. If no specific date, use a general timeframe or 'N/A'."),
  impact: z.string().describe('The potential impact or consequences of the notice on residents or the strata. Be specific.'),
  action: z.string().describe("Any required or recommended action for residents or management, if applicable. If no action, state 'No specific action required'.")
});
export type GenerateOwnerMessageInput = z.infer<typeof AISummarySchema>;

const GenerateOwnerMessageOutputSchema = z.string().describe('The generated message content suitable for sending to an owner.');
export type GenerateOwnerMessageOutput = z.infer<typeof GenerateOwnerMessageOutputSchema>;

const generateOwnerMessagePrompt = ai.definePrompt({
  name: 'generateOwnerMessagePrompt',
  input: { schema: AISummarySchema },
  prompt: `You are an expert communications assistant for a strata management company.
Your task is to draft a clear, professional, and friendly email body to be sent to property owners based on a structured summary of a notice.
The message should be easy to understand for a layperson.

Write the message primarily in natural Simplified Chinese.
Do not translate too literally. The result should read like a polished message written by a Chinese-speaking strata manager, not a word-for-word translation.
Keep the following in English or original form whenever that is more natural or clearer:
- strata plan codes, unit numbers, parking/locker identifiers
- building names, company names, contractor names, product names
- URLs, email addresses, phone numbers
- official titles, forms, or labels that are normally used in English

If a term is commonly understood in English in this context, keep it in English instead of forcing a Chinese translation.
If the notice says no owner action is needed, state that clearly in Chinese.
Prefer short paragraphs or concise bullet-style lines inside the body when that improves clarity.

Here is the structured information:
- Subject/What: {{{what}}}
- When it's happening: {{{when}}}
- Impact: {{{impact}}}
- Action Required: {{{action}}}

Please draft the email body based on this. Do not include a subject line or a greeting (like "Dear Owner"). Start directly with the message content.
Ensure the tone is helpful and informative. If the 'Action Required' is 'No specific action required' or similar, ensure the message clearly communicates that no action is needed from the owners.
`
});

const generateOwnerMessageFlow = ai.defineFlow(
  {
    name: 'generateOwnerMessageFlow',
    inputSchema: AISummarySchema,
    outputSchema: GenerateOwnerMessageOutputSchema,
  },
  async (input) => {
    const { text } = await generateOwnerMessagePrompt(input);
    return text || "Could not generate message.";
  }
);

export async function generateOwnerMessage(
  input: GenerateOwnerMessageInput
): Promise<GenerateOwnerMessageOutput> {
  return generateOwnerMessageFlow(input);
}
