import type { SearchPlan } from './types.js';

function determineStrategy(value: unknown): 'fresh-search' | 'reuse-results' {
  if (value === 'reuse-results') {
    return 'reuse-results';
  }
  return 'fresh-search';
}

export function normalizeSearchPlan(payload: SearchPlan): SearchPlan {
  if (!payload || typeof payload !== 'object') {
    throw new Error('OpenAI response was not a valid object.');
  }

  const record = payload;
  const query = record.query;
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

