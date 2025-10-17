import axios, { AxiosError } from 'axios';
import { withTvdbClient } from '../../../infra/tvdbClient.js';
import type {  TvdbResponse } from './types.js';
import { deriveFallbackQueries } from './utils.js';
import { type SearchPlanQuery } from '../../../llm/planner/types.js';

type TvdbSearchResponse = {
  data?: TvdbResponse[];
};

export async function searchSeries(
  searchTerm: string,
  options: SearchPlanQuery
): Promise<any[]> {
  console.log("search term", searchTerm)
  const term = searchTerm.trim();
  if (!term) {
    return [];
  }

  try {
    return await withTvdbClient(async (client, token) => {
      const tried = new Set<string>();
      const candidates = [term, ...await deriveFallbackQueries(term)];

      for (const candidate of candidates) {
        const normalizedCandidate = candidate.trim();
        if (!normalizedCandidate) {
          continue;
        }
        const option = { ...options, query: normalizedCandidate };
        const normalizedKey = normalizedCandidate.toLowerCase();
        if (tried.has(normalizedKey)) {
          continue;
        }
        tried.add(normalizedKey);

        try {
          const response = await client.get<TvdbSearchResponse>('/search', {
            params: option,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          console.debug(`TVDB search with term "${candidate}" succeeded.`);
          console.debug('TVDB raw response:', response.data);
          const results = response.data?.data;
          if (Array.isArray(results) && results.length > 0) {
            return results;
          }
        } catch (error) {
          const axiosError = error as AxiosError;
          if (axios.isAxiosError(axiosError) && axiosError.response?.status === 400) {
            continue;
          }
          throw error;
        }
      }
      return [];
    });
  } catch (error) {
    throw translateTvdbError(error);
  }
}

function translateTvdbError(error: unknown): Error {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error : new Error('Unknown TVDB error');
  }

  const axiosError = error as AxiosError;

  if (axiosError.response?.status === 404) {
    return new Error('TVDB did not return any matches.');
  }

  if (axiosError.response?.status === 401) {
    return new Error('TVDB authentication failed. Please verify credentials.');
  }

  const responseData = axiosError.response?.data as { message?: string } | undefined;
  const message = responseData?.message;
  return new Error(
    message ?? `TVDB request failed with status ${axiosError.response?.status ?? 'unknown'}`
  );
}
