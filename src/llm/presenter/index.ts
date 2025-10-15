import type { BaseMessageLike } from '@langchain/core/messages';
import { presenterModel } from '../../infra/openaiClient.js';
import type { SearchPlan } from '../planner/types.js';
import { extractMessageText } from '../messageUtils.js';
import { presentationSystemPrompt } from './constants.js';
import { type TvdbEntity } from '../../services/tvdb/series/types.js';

const presenterSystemMessage: BaseMessageLike = {
  role: 'system',
  content: presentationSystemPrompt
};

function buildPresenterMessages(payload: string): BaseMessageLike[] {
  return [presenterSystemMessage, { role: 'user', content: payload }];
}

export async function summarizeRecommendations(
  userMessage: string,
  searchPlan: SearchPlan,
  tvdbResults: TvdbEntity[]
): Promise<string> {
  const payload = JSON.stringify({
    userMessage,
    searchPlan,
    tvdbResults
  });

  const response = await presenterModel.invoke(
    buildPresenterMessages(payload) as unknown as Parameters<typeof presenterModel.invoke>[0]
  );

  const summary = extractMessageText(response).trim();
  return summary || 'No summary available.';
}
