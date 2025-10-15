import * as readlineSync from 'readline-sync';
import {
  planSearch,
} from '../llm/planner/index.js';
import { searchSeries } from '../services/tvdb/series/index.js';
import { getConversationState, updateConversationState } from '../state/conversationMemory.js';
import { summarizeRecommendations } from '../llm/presenter/index.js';
import { type TvdbEntity } from '../services/tvdb/series/types.js';
import { type SearchPlan } from '../llm/planner/types.js';


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
      console.debug('1.Search plan:', plan);
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

      const searchTerm = plan.query.query;
      const results = await resolveResults(plan, conversationState, searchTerm);
      console.debug('2.Raw results:', results);

      if (results.length === 0) {
        console.log('No TVDB matches found.');
        if (plan.followUpSuggestions.length > 0) {
          console.log(`Try asking: ${plan.followUpSuggestions[0]}`);
        }
        continue;
      }

      const summary = await summarizeRecommendations(trimmedInput, plan, results);
      console.debug('3.Summary:', summary);
      console.log('\n' + summary + '\n');

      updateConversationState({
        lastSearchTerm: searchTerm,
        lastResultIds: results.map((r) => r.id),
        lastResultTitle: results.length > 0 ? results[0].name : null,
        lastResults: results
      });


      if (plan.followUpSuggestions.length > 0) {
        console.log(`Next: ${plan.followUpSuggestions.join(' | ')}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      console.error(message);
    }
  }
}


function applyPlanToCachedResults(
  cachedResults: TvdbEntity[],
  plan: SearchPlan,
): TvdbEntity[] {
  let filtered = cachedResults.slice();

  if (plan.query.type) {
    filtered = filtered.filter((entry) => entry.type === plan.query.type);
  }

  if (typeof plan.query.year === 'number' && Number.isFinite(plan.query.year)) {
    filtered = filtered.filter((entry) => {
      const airedYear = parseFirstAiredYear(entry.first_air_time);
      return airedYear !== null && airedYear >= (plan.query.year as number);
    });
  }

  if (plan.query.limit > 0) {
    filtered = filtered.slice(0, plan.query.limit);
  }

  return filtered;
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


async function resolveResults(
  plan: SearchPlan,
  conversationState: ReturnType<typeof getConversationState>,
  searchTerm: string
): Promise<TvdbEntity[]> {
  if (plan.strategy === 'reuse-results' && conversationState.lastResults.length > 0) {
    return applyPlanToCachedResults(conversationState.lastResults, plan);
  }

  return searchSeries(searchTerm, plan.query);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error('Fatal error starting the CLI:', error);
    process.exit(1);
  });
}
