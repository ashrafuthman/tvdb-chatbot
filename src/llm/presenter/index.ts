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

  const filteredResults = tvdbResults?.map((r) => ({
    id: r.id,
    name: r.name,
    overview: r.overview,
    overview_translated: r.overview_translated,
    first_air_time: r.first_air_time,
    type: r.type
  })) ?? [];

  const payload = JSON.stringify({
    userMessage,
    searchPlan,
    filteredResults
  });

  const response = await presenterModel.invoke(
    buildPresenterMessages(payload) as unknown as Parameters<typeof presenterModel.invoke>[0]
  );

  const summary = extractMessageText(response).trim();
  return summary || 'No summary available.';
}
