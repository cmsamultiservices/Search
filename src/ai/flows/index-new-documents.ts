'use server';

/**
 * @fileOverview Monitors documents and re-indexes when a new one is added.
 *
 * - indexNewDocuments - A function that triggers the document indexing process.
 * - IndexNewDocumentsInput - The input type for the indexNewDocuments function.
 * - IndexNewDocumentsOutput - The return type for the indexNewDocuments function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IndexNewDocumentsInputSchema = z.object({
  documentsLocation: z
    .string()
    .describe("The location of the documents, e.g., a folder path or a database identifier."),
  lastUpdateTimestamp: z.number().optional().describe("The timestamp of the last document update."),
});
export type IndexNewDocumentsInput = z.infer<typeof IndexNewDocumentsInputSchema>;

const IndexNewDocumentsOutputSchema = z.object({
  shouldReindex: z.boolean().describe("Whether the documents should be re-indexed."),
  newUpdateTimestamp: z.number().describe("The new timestamp of the latest document update."),
});
export type IndexNewDocumentsOutput = z.infer<typeof IndexNewDocumentsOutputSchema>;

export async function indexNewDocuments(input: IndexNewDocumentsInput): Promise<IndexNewDocumentsOutput> {
  return indexNewDocumentsFlow(input);
}

const checkNewDocumentsPrompt = ai.definePrompt({
  name: 'checkNewDocumentsPrompt',
  input: {schema: IndexNewDocumentsInputSchema},
  output: {schema: IndexNewDocumentsOutputSchema},
  prompt: `You are a document management assistant. Your task is to determine if the documents at the given location require re-indexing based on their last update timestamp.

Location: {{{documentsLocation}}}
Last Update Timestamp: {{{lastUpdateTimestamp}}}

Determine if a re-index is needed, and if so, provide the new update timestamp. Assume current time is 1705252521000. If a lastUpdateTimestamp is not provided, a re-index is needed. The newUpdateTimestamp should equal 1705252521000 if re-indexing is needed.

Return a JSON object with 'shouldReindex' and 'newUpdateTimestamp' fields.
`,
});

const indexNewDocumentsFlow = ai.defineFlow(
  {
    name: 'indexNewDocumentsFlow',
    inputSchema: IndexNewDocumentsInputSchema,
    outputSchema: IndexNewDocumentsOutputSchema,
  },
  async input => {
    const {output} = await checkNewDocumentsPrompt(input);
    return output!;
  }
);
