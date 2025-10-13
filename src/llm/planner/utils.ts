import { maxSearchLimit } from './constants.js';
import type { SearchPlan, SearchPlanQuery } from './types.js';

export function normalizeSearchPlan(payload: unknown): SearchPlan {
  if (!payload || typeof payload !== 'object') {
    throw new Error('OpenAI response was not a valid object.');
  }

  const record = payload as Record<string, unknown>;
  const query = normalizeQuery(record.query);
  const explanation = typeof record.explanation === 'string' ? record.explanation.trim() : '';
  const followUpSuggestions = Array.isArray(record.followUpSuggestions)
    ? record.followUpSuggestions
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry.length > 0)
    : [];

  const strategy = determineStrategy(record.strategy);

  return {
    query,
    explanation,
    followUpSuggestions,
    strategy
  };
}

export function clampLimit(value: number, fallback: number): number {
  const normalized = normalizeOptionalNumber(value);
  if (normalized === null) {
    return fallback;
  }
  return Math.min(Math.max(normalized, 1), maxSearchLimit);
}

export function determineStrategy(value: unknown): 'fresh-search' | 'reuse-results' {
  if (value === 'reuse-results') {
    return 'reuse-results';
  }
  return 'fresh-search';
}

export function normalizeQuery(candidate: unknown): SearchPlanQuery {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Search plan query was missing.');
  }

  const record = candidate as Record<string, unknown>;
  const primaryQuery = normalizeRequiredString(record.query, 'query');
  const qValue = normalizeOptionalString(record.q) ?? primaryQuery;

  const normalizedLimit = normalizeOptionalNumber(record.limit);

  return {
    query: primaryQuery,
    q: qValue,
    type: normalizeEntityType(record.type),
    year: normalizeOptionalNumber(record.year),
    company: normalizeOptionalString(record.company),
    country: normalizeOptionalString(record.country),
    director: normalizeOptionalString(record.director),
    language: normalizeOptionalString(record.language),
    primaryType: normalizeOptionalString(record.primaryType),
    network: normalizeOptionalString(record.network),
    remote_id: normalizeOptionalString(record.remote_id),
    offset: normalizeOptionalNumber(record.offset),
    limit: normalizedLimit
  };
}

export function normalizeEntityType(
  value: unknown
): 'series' | 'movie' | 'person' | 'company' | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (['series', 'tv', 'tv series', 'show', 'shows'].includes(normalized)) {
    return 'series';
  }
  if (['movie', 'film', 'movies', 'films'].includes(normalized)) {
    return 'movie';
  }
  if (['person', 'people', 'actor', 'actress', 'cast'].includes(normalized)) {
    return 'person';
  }
  if (['company', 'studio', 'network'].includes(normalized)) {
    return 'company';
  }
  return null;
}

export function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function normalizeRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Search plan query did not include a value for ${field}.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Search plan query did not include a value for ${field}.`);
  }
  return trimmed;
}
