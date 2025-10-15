import {
  fallbackPrefixWordCount,
  minFallbackWordLength
} from './constants.js';

export function deriveFallbackQueries(term: string): string[] {
  console.debug('Deriving fallback queries for term:', term);
  const cleaned = term.replace(/[^\w\s]/g, ' ');
  const words = cleaned
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > minFallbackWordLength);

  const fallback = new Set<string>();
  fallback.add(words.slice(0, fallbackPrefixWordCount).join(' '));
  for (const word of words) {
    fallback.add(word);
  }
  console.debug('Derived fallback queries:', Array.from(fallback).filter((word) => word.length > 0));
  return Array.from(fallback).filter((word) => word.length > 0);
}
