import * as readlineSync from 'readline-sync';
import {
  deriveSearchLimit,
  deriveSearchTerm,
  planSearch,
  type SearchPlan
} from '../llm/planner/index.js';
import { searchSeries, type SearchOptions, type TvdbSeries } from '../services/tvdb/series/index.js';
import { getConversationState, updateConversationState } from '../state/conversationMemory.js';
import { summarizeRecommendations } from '../llm/presenter/index.js';

type Recommendation = {
  id: number;
  title: string;
  overview: string;
  firstAiredYear: string;
  entityType: 'series' | 'movie';
};

const reusePhrases = [
  'any of those',
  'any of them',
  'those again',
  'those ones',
  'these ones',
  'these shows',
  'these movies',
  'from this list',
  'from that list',
  'from the list',
  'from the results',
  'the first one',
  'the second one',
  'the third one',
  'tell me more about',
  'more like the last one',
  'more like that one'
];

export async function runCli(): Promise<void> {
  console.log('TVDB Chatbot ready. Type "exit" to quit.');

  while (true) {
    const userInput = readlineSync.question('> ');
    const trimmedInput = userInput.trim();

    if (trimmedInput.length === 0) {
      continue;
    }

    if (trimmedInput.toLowerCase() === 'exit') {
      console.log('Goodbye!');
      break;
    }

    try {
      const conversationState = getConversationState();
      const plan = await planSearch(trimmedInput, conversationState);

      if (
        plan.strategy === 'fresh-search' &&
        conversationState.lastResults.length > 0 &&
        shouldForceReuse(trimmedInput)
      ) {
        plan.strategy = 'reuse-results';
      }

      if (plan.explanation) {
        console.log(`Plan: ${plan.explanation}`);
      }

      const limit = deriveSearchLimit(plan);
      const searchTerm = deriveSearchTerm(plan);

      const results = await resolveResults(plan, conversationState, limit, searchTerm);

      console.debug('results', results);
      const recommendations = deriveRecommendations(results);

      if (recommendations.length === 0) {
        console.log('No TVDB matches found.');
        if (plan.followUpSuggestions.length > 0) {
          console.log(`Try asking: ${plan.followUpSuggestions[0]}`);
        }
        continue;
      }

      const summary = await summarizeRecommendations(trimmedInput, plan, results);
      console.log('\n' + summary + '\n');

      updateConversationState({
        lastSearchTerm: searchTerm,
        lastResultIds: results.map((r) => r.id),
        lastResultTitle: results.length > 0 ? results[0].name : null,
        lastResults: results
      });

      if (process.env.DEBUG_TVDB_RESULTS === '1') {
        recommendations.forEach((recommendation) => {
          console.log(formatRecommendation(recommendation));
        });
      }

      if (plan.followUpSuggestions.length > 0) {
        console.log(`Next: ${plan.followUpSuggestions.join(' | ')}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      console.error(message);
    }
  }
}

function formatRecommendation(recommendation: Recommendation): string {
  const typeLabel = recommendation.entityType === 'movie' ? 'Movie' : 'Series';
  return `${typeLabel}: ${recommendation.title} (${recommendation.firstAiredYear}) - ${recommendation.overview} - TVDB id: ${recommendation.id}`;
}

function deriveRecommendations(series: TvdbSeries[] = []): Recommendation[] {
  return series.map((entry) => ({
    id: entry.id,
    title: entry.name,
    overview: entry.overview ?? 'Overview not available from TVDB.',
    firstAiredYear: deriveYear(entry.firstAired),
    entityType: entry.entityType
  }));
}

function applyPlanToCachedResults(
  cachedResults: TvdbSeries[],
  plan: SearchPlan,
  limit: number
): TvdbSeries[] {
  let filtered = cachedResults.slice();

  const entityType = normalizeEntityTypeForSearch(plan.query.type);
  if (entityType) {
    filtered = filtered.filter((entry) => entry.entityType === entityType);
  }

  if (typeof plan.query.year === 'number' && Number.isFinite(plan.query.year)) {
    filtered = filtered.filter((entry) => {
      const airedYear = parseFirstAiredYear(entry.firstAired);
      return airedYear !== null && airedYear >= (plan.query.year as number);
    });
  }

  if (limit > 0) {
    filtered = filtered.slice(0, limit);
  }

  return filtered;
}

function deriveYear(firstAired: string | null): string {
  if (!firstAired) {
    return 'Year unavailable';
  }
  const year = new Date(firstAired).getFullYear();
  return Number.isNaN(year) ? 'Year unavailable' : String(year);
}

function parseFirstAiredYear(firstAired: string | null): number | null {
  if (!firstAired) {
    return null;
  }
  const parsed = new Date(firstAired).getFullYear();
  if (!Number.isNaN(parsed)) {
    return parsed;
  }
  const numericMatch = firstAired.match(/\d{4}/);
  if (!numericMatch) {
    return null;
  }
  const fallback = Number.parseInt(numericMatch[0], 10);
  return Number.isNaN(fallback) ? null : fallback;
}

function shouldForceReuse(message: string): boolean {
  const normalized = message.toLowerCase();
  return reusePhrases.some((phrase) => normalized.includes(phrase));
}

function normalizeEntityTypeForSearch(
  type: 'series' | 'movie' | 'person' | 'company' | null
): 'series' | 'movie' | undefined {
  if (type === 'series' || type === 'movie') {
    return type;
  }
  return undefined;
}

async function resolveResults(
  plan: SearchPlan,
  conversationState: ReturnType<typeof getConversationState>,
  limit: number,
  searchTerm: string
): Promise<TvdbSeries[]> {
  if (plan.strategy === 'reuse-results' && conversationState.lastResults.length > 0) {
    return applyPlanToCachedResults(conversationState.lastResults, plan, limit);
  }

  const searchOptions = buildSearchOptions(plan, limit);
  return searchSeries(searchTerm, limit, searchOptions);
}

function buildSearchOptions(plan: SearchPlan, limit: number): SearchOptions {
  return {
    entityType: normalizeEntityTypeForSearch(plan.query.type),
    network: plan.query.network,
    company: plan.query.company,
    year: plan.query.year,
    country: plan.query.country,
    language: plan.query.language,
    limit
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error('Fatal error starting the CLI:', error);
    process.exit(1);
  });
}
