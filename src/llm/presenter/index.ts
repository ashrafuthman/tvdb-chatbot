import { appConfig } from '../../config/index.js';
import { openaiClient } from '../../infra/openaiClient.js';
import type { SearchPlan } from '../planner/index.js';
import type { TvdbSeries } from '../../services/tvdb/series/index.js';
import { presentationSystemPrompt } from './constants.js';

export async function summarizeRecommendations(
  userMessage: string,
  searchPlan: SearchPlan,
  tvdbResults: TvdbSeries[]
): Promise<string> {
  const response = await openaiClient.responses.create({
    model: appConfig.openaiModel,
    input: [
      { role: 'system', content: presentationSystemPrompt },
      {
        role: 'user',
        content: JSON.stringify({
          userMessage,
          searchPlan,
          tvdbResults
        })
      }
    ],
    max_output_tokens: 400,
    temperature: 0.2
  });

  return response.output_text?.trim() || 'No summary available.';
}
