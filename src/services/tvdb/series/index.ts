import axios, { AxiosError } from 'axios';
import { withTvdbClient } from '../../../infra/tvdbClient.js';
import type { SearchOptions, TvdbSeries } from './types.js';
import { buildSearchParams, deriveFallbackQueries, normalizeSearchResults } from './utils.js';

export type { SearchOptions, TvdbSeries } from './types.js';

type TvdbSearchResponse = {
  data?: unknown;
};

export async function searchSeries(
  searchTerm: string,
  limit = 6,
  options: SearchOptions = {}
): Promise<TvdbSeries[]> {
  const term = searchTerm.trim();
  if (!term) {
    return [];
  }

  try {
    return await withTvdbClient(async (client, token) => {
      const tried = new Set<string>();
      const candidates = [term, ...deriveFallbackQueries(term)];

      for (const candidate of candidates) {
        const normalizedCandidate = candidate.trim();
        if (!normalizedCandidate) {
          continue;
        }
        const normalizedKey = normalizedCandidate.toLowerCase();
        if (tried.has(normalizedKey)) {
          continue;
        }
        tried.add(normalizedKey);

        for (const queryKey of ['q', 'query'] as const) {
          try {
            const params = buildSearchParams(normalizedCandidate, limit, options, queryKey);
            const response = await client.get<TvdbSearchResponse>('/search', {
              params,
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            const normalized = normalizeSearchResults(
              response.data,
              limit,
              options.entityType ?? null
            );
            if (normalized.length > 0) {
              return normalized;
            }
          } catch (error) {
            const axiosError = error as AxiosError;
            if (axios.isAxiosError(axiosError) && axiosError.response?.status === 400) {
              continue;
            }
            throw error;
          }
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
