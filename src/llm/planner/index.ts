import { plannerModel } from '../../infra/openaiClient.js';
import type { ConversationState } from '../../state/types.js';
import { systemInstruction } from './constants.js';
import type { SearchPlan } from './types.js';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';


const searchPlanParser = StructuredOutputParser.fromZodSchema(
  z.object({
    strategy: z.enum(['fresh-search', 'reuse-results']),
    query: z.object({
      query: z.string(),
      q: z.null(),
      type: z.enum(['series', 'movie', 'person', 'company']).or(z.null()),
      year: z.number().int().or(z.null()),
      company: z.string().or(z.null()),
      country: z.string().or(z.null()),
      director: z.string().or(z.null()),
      language: z.string().or(z.null()),
      primaryType: z.string().or(z.null()),
      network: z.string().or(z.null()),
      remote_id: z.string().or(z.null()),
      offset: z.number().int().or(z.null()),
      limit: z.number().int()
    }),
    explanation: z.string(),
    followUpSuggestions: z.array(z.string())
  })
);
  const prompt =  ChatPromptTemplate.fromTemplate(systemInstruction)
  const chain = prompt.pipe(plannerModel).pipe(searchPlanParser);

export async function planSearch(
  userMessage: string,
  conversationState: ConversationState
): Promise<SearchPlan> {
  const trimmedMessage = userMessage.trim();
  if (trimmedMessage.length === 0) {
    throw new Error('Please provide a search query.');
  }

  try {
    const response = await chain.invoke({
    userInput: trimmedMessage,
    format_instructions: searchPlanParser.getFormatInstructions(),
    chat_history: conversationState
    });
    return response;
  } catch (error) {
    console.error('Error planning search:', error);
    throw new Error('Search planning failed.');
  }
}
