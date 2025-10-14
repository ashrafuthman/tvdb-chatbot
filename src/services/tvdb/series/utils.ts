import type { SearchOptions, TvdbSeries } from './types.js';
import {
  fallbackPrefixWordCount,
  maxEntryExtractionDepth,
  maxTranslationTraversalDepth,
  minFallbackWordLength
} from './constants.js';

export function buildSearchParams(
  term: string,
  limit: number,
  options: SearchOptions,
  queryKey: 'q' | 'query'
): Record<string, string> {
  const params: Record<string, string> = queryKey === 'q' ? { q: term } : { query: term };
  params.limit = String(Math.max(limit, 1));

  if (options.entityType) {
    params.type = options.entityType;
  }
  const network = coalesceString(options.network ?? undefined);
  if (network) {
    params.network = network;
  }
  const company = coalesceString(options.company ?? undefined);
  if (company) {
    params.company = company;
  }
  if (typeof options.year === 'number' && Number.isFinite(options.year)) {
    params.year = String(options.year);
  }
  const country = coalesceString(options.country ?? undefined);
  if (country) {
    params.country = country;
  }
  const language = coalesceString(options.language ?? undefined);
  if (language) {
    params.language = language;
  }
  const director = coalesceString(options.director ?? undefined);
  if (director) {
    params.director = director;
  }
  const primaryType = coalesceString(options.primaryType ?? undefined);
  if (primaryType) {
    params.primaryType = primaryType;
  }
  const remoteId = coalesceString(options.remoteId ?? undefined);
  if (remoteId) {
    params.remote_id = remoteId;
  }
  if (typeof options.offset === 'number' && Number.isFinite(options.offset) && options.offset >= 0) {
    params.offset = String(Math.trunc(options.offset));
  }

  return params;
}

export function deriveFallbackQueries(term: string): string[] {
  const cleaned = term.replace(/[^\w\s]/g, ' ');
  const words = cleaned
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > minFallbackWordLength);

  if (words.length <= 1) {
    return [];
  }

  const fallback = new Set<string>();
  fallback.add(words.slice(0, fallbackPrefixWordCount).join(' '));
  for (const word of words) {
    fallback.add(word);
  }

  return Array.from(fallback).filter((word) => word.length > 0);
}

export function normalizeSearchResults(
  payload: unknown,
  limit: number,
  entityTypeFilter: 'series' | 'movie' | null
): TvdbSeries[] {
  const entries = extractSeriesEntries(payload);
  return entries
    .map((entry) => mapSeriesEntry(entry, entityTypeFilter))
    .filter((entry): entry is TvdbSeries => entry !== null)
    .slice(0, limit);
}

export function coalesceString(...candidates: Array<unknown>): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return null;
}

function extractSeriesEntries(payload: unknown, depth = 0): unknown[] {
  if (Array.isArray(payload)) {
    return payload as unknown[];
  }
  if (!payload || typeof payload !== 'object' || depth > maxEntryExtractionDepth) {
    return [];
  }

  const record = payload as Record<string, unknown>;
  for (const key of ['series', 'results', 'data']) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      continue;
    }
    const candidate = record[key];
    const extracted = extractSeriesEntries(candidate, depth + 1);
    if (extracted.length > 0) {
      return extracted;
    }
  }
  return [];
}

function mapSeriesEntry(
  raw: unknown,
  entityTypeFilter: 'series' | 'movie' | null
): TvdbSeries | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, any>;
  const entityType = determineEntityType(coalesceString(record.primary_type, record.type));
  if (!entityType) {
    return null;
  }
  if (entityTypeFilter && entityType !== entityTypeFilter) {
    return null;
  }

  const idCandidate = record.id ?? record.tvdb_id;
  const id = typeof idCandidate === 'number' ? idCandidate : parseNumericId(idCandidate);
  if (!id) {
    return null;
  }

  const name = coalesceString(record.name, record.seriesName, record.series?.name);
  if (!name) {
    return null;
  }

  const seriesRecord = record.series as Record<string, any> | undefined;
  const overview = coalesceString(
    record.overview,
    record.synopsis,
    extractOverviewFromTranslations(record.overviewTranslations),
    extractOverviewFromTranslations(seriesRecord?.overviewTranslations)
  );

  const firstAired =
    coalesceString(
      record.firstAired,
      record.first_air_date,
      record.first_release?.date,
      seriesRecord?.firstAired,
      seriesRecord?.first_air_date,
      record.year
    ) ?? null;

  return {
    id,
    name,
    overview: overview ?? null,
    firstAired,
    entityType
  };
}

function determineEntityType(candidate?: string | null): 'series' | 'movie' | null {
  if (!candidate) {
    return 'series';
  }

  const normalized = candidate.trim().toLowerCase();
  if (!normalized) {
    return 'series';
  }

  if (['movie', 'movies', 'film', 'films'].includes(normalized)) {
    return 'movie';
  }

  if (['series', 'tv', 'tv series', 'show', 'shows'].includes(normalized)) {
    return 'series';
  }

  return null;
}

function extractOverviewFromTranslations(translations: unknown): string | null {
  if (!translations) {
    return null;
  }

  const english: string[] = [];
  const fallbacks: string[] = [];
  const visited = new Set<object>();

  const handleCandidate = (language: string | null, value: unknown) => {
    const overview = coalesceString(value);
    if (!overview || looksLikeLanguageCode(overview)) {
      return;
    }

    const normalizedLang = normalizeLanguageCode(language);
    if (normalizedLang === 'eng') {
      english.push(overview);
    } else {
      fallbacks.push(overview);
    }
  };

  const explore = (node: unknown, hint: string | null = null, depth = 0) => {
    if (!node || depth > maxTranslationTraversalDepth) {
      return;
    }

    if (typeof node === 'string') {
      handleCandidate(hint, node);
      return;
    }

    if (typeof node !== 'object') {
      return;
    }

    if (visited.has(node as object)) {
      return;
    }
    visited.add(node as object);

    if (Array.isArray(node)) {
      for (const entry of node) {
        explore(entry, hint, depth + 1);
      }
      return;
    }

    const record = node as Record<string, any>;
    const recordLang = normalizeLanguageCode(
      coalesceString(
        record.language,
        record.iso639_1,
        record.iso_639_1,
        record.lang,
        record.locale,
        record.abbreviation
      ) ?? hint
    );

    const overview = coalesceString(
      record.overview,
      record.translation,
      record.translated,
      record.text,
      record.synopsis
    );
    if (overview) {
      handleCandidate(recordLang ?? hint, overview);
    }

    for (const [key, value] of Object.entries(record)) {
      const nextHint = normalizeLanguageCode(key) ?? recordLang ?? hint;
      explore(value, nextHint, depth + 1);
    }
  };

  explore(translations);

  if (english.length > 0) {
    return english[0];
  }
  if (fallbacks.length > 0) {
    return fallbacks[0];
  }
  return null;
}

function normalizeLanguageCode(candidate: unknown): string | null {
  if (typeof candidate !== 'string') {
    return null;
  }
  const normalized = candidate.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (['eng', 'en', 'en-us', 'en-gb', 'english'].includes(normalized)) {
    return 'eng';
  }
  if (/^[a-z]{2}$/i.test(normalized) || /^[a-z]{3}$/i.test(normalized)) {
    return normalized;
  }
  return null;
}

function looksLikeLanguageCode(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return /^[a-z]{2,3}(?:-[a-z]{2,3})?$/.test(normalized);
}

function parseNumericId(candidate: unknown): number | null {
  if (typeof candidate === 'number') {
    return Number.isFinite(candidate) ? candidate : null;
  }
  if (typeof candidate === 'string' && candidate.trim()) {
    const match = candidate.match(/\d+/);
    if (!match) {
      return null;
    }
    const parsed = Number.parseInt(match[0], 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}
