import type { BaseMessageLike } from '@langchain/core/messages';
import { presenterModel } from '../../infra/openaiClient.js';
import type { SearchPlan } from '../planner/index.js';
import type { TvdbSeries } from '../../services/tvdb/series/index.js';
import { extractMessageText } from '../messageUtils.js';
import { presentationSystemPrompt } from './constants.js';

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
  tvdbResults: TvdbSeries[]
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
