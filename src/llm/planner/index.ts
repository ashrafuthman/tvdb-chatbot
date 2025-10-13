import { appConfig } from '../../config/index.js';
import { openaiClient } from '../../infra/openaiClient.js';
import type { ConversationState } from '../../state/conversationMemory.js';
import { defaultSearchLimit, systemInstruction } from './constants.js';
import type { SearchPlan } from './types.js';
import { clampLimit, normalizeSearchPlan } from './utils.js';

export type { SearchPlan, SearchPlanQuery } from './types.js';
export { defaultSearchLimit } from './constants.js';

export async function planSearch(
  userMessage: string,
  conversationState: ConversationState
): Promise<SearchPlan> {
  const trimmedMessage = userMessage.trim();
  if (trimmedMessage.length === 0) {
    throw new Error('Please provide a search query.');
  }

  const response = await openaiClient.responses.create({
    model: appConfig.openaiModel,
    input: [
      {
        role: 'system',
        content: systemInstruction
      },
      {
        role: 'user',
        content: JSON.stringify({
          query: trimmedMessage,
          conversationState
        })
      }
    ],
    max_output_tokens: 512,
    temperature: 0.2
  });

  const rawOutput = response.output_text?.trim();
  if (!rawOutput) {
    throw new Error('OpenAI returned an empty plan.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawOutput);
    console.debug('parsed Data:', parsed);
  } catch (error) {
    throw new Error('OpenAI returned invalid JSON for the search plan.');
  }

  return normalizeSearchPlan(parsed);
}

export function deriveSearchLimit(plan: SearchPlan, fallback = defaultSearchLimit): number {
  const limit = plan.query.limit;
  if (limit === null || limit === undefined) {
    return fallback;
  }
  return clampLimit(limit, fallback);
}

export function deriveSearchTerm(plan: SearchPlan): string {
  return plan.query.query || plan.query.q;
}
