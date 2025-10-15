import type { BaseMessageLike } from '@langchain/core/messages';
import { plannerModel } from '../../infra/openaiClient.js';
import type { ConversationState } from '../../state/types.js';
import { extractMessageText } from '../messageUtils.js';
import { defaultSearchLimit, systemInstruction } from './constants.js';
import type { SearchPlan } from './types.js';
import { normalizeSearchPlan } from './utils.js';

const plannerSystemMessage: BaseMessageLike = {
  role: 'system',
  content: systemInstruction
};

function buildPlannerMessages(payload: string): BaseMessageLike[] {
  return [plannerSystemMessage, { role: 'user', content: payload }];
}

export async function planSearch(
  userMessage: string,
  conversationState: ConversationState
): Promise<SearchPlan> {
  const trimmedMessage = userMessage.trim();
  if (trimmedMessage.length === 0) {
    throw new Error('Please provide a search query.');
  }

  const payload = JSON.stringify({
    query: trimmedMessage,
    conversationState
  });

  const response = await plannerModel.invoke(
    buildPlannerMessages(payload) as unknown as Parameters<typeof plannerModel.invoke>[0]
  );
  const rawOutput = extractMessageText(response).trim();
  if (!rawOutput) {
    throw new Error('OpenAI returned an empty plan.');
  }

  let parsed: undefined | SearchPlan;
  try {
    parsed = JSON.parse(rawOutput);
  } catch (error) {
    throw new Error('OpenAI returned invalid JSON for the search plan.');
  }

  const patched = patchMissingQuery(parsed, conversationState);
  return normalizeSearchPlan(patched as SearchPlan);
}

function patchMissingQuery(parsed: unknown, conversationState: ConversationState): unknown {
  if (!parsed || typeof parsed !== 'object') {
    return parsed;
  }

  const record = parsed as Record<string, unknown>;
  if (record.strategy !== 'reuse-results') {
    return parsed;
  }

  const lastSearchTerm = conversationState.lastSearchTerm?.trim();
  if (!lastSearchTerm) {
    return parsed;
  }

  const queryRecord = (record.query && typeof record.query === 'object'
    ? (record.query as Record<string, unknown>)
    : (record.query = {} as Record<string, unknown>));

  if (!isNonEmptyString(queryRecord.query)) {
    queryRecord.query = lastSearchTerm;
  }

  if (!isNonEmptyString(queryRecord.q)) {
    queryRecord.q = lastSearchTerm;
  }

  if (!isFiniteNumber(queryRecord.limit)) {
    queryRecord.limit = conversationState.lastResults.length || defaultSearchLimit;
  }

  if (!isFiniteNumber(queryRecord.offset)) {
    queryRecord.offset = 0;
  }

  return parsed;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
