import {
  minFallbackWordLength
} from './constants.js';
import { CommaSeparatedListOutputParser } from '@langchain/core/output_parsers';

const fallbackParser = new CommaSeparatedListOutputParser();

export async function deriveFallbackQueries(term: string) {
  console.debug('Deriving fallback queries for term:', term);
  const parsed = await fallbackParser.parse(term);
  const seeds = parsed
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > minFallbackWordLength);

  if (seeds.length > 0) {
    console.debug('Derived fallback queries (parser):', seeds);
    return Array.from(new Set(seeds));
  }
  console.debug('Deriving fallback queries (simple split)', term);
  return [term];
}
