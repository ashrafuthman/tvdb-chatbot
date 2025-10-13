import type { TvdbSeries } from '../services/tvdb/series/index.js';

export type ConversationState = {
  lastSearchTerm: string | null;
  lastResultTitle: string | null;
  lastResultIds: number[];
  lastResults: TvdbSeries[];
};

const conversationState: ConversationState = {
  lastSearchTerm: null,
  lastResultTitle: null,
  lastResultIds: [],
  lastResults: []
};

export function getConversationState(): ConversationState {
  return {
    ...conversationState,
    lastResultIds: [...conversationState.lastResultIds],
    lastResults: conversationState.lastResults.map(cloneSeries)
  };
}

export function updateConversationState(update: Partial<ConversationState>): void {
  if (update.lastSearchTerm !== undefined) {
    conversationState.lastSearchTerm = update.lastSearchTerm;
  }
  if (update.lastResultTitle !== undefined) {
    conversationState.lastResultTitle = update.lastResultTitle;
  }
  if (update.lastResultIds !== undefined) {
    conversationState.lastResultIds = [...update.lastResultIds];
  }
  if (update.lastResults !== undefined) {
    conversationState.lastResults = update.lastResults.map(cloneSeries);
  }
}

export function resetConversationState(): void {
  conversationState.lastSearchTerm = null;
  conversationState.lastResultTitle = null;
  conversationState.lastResultIds = [];
  conversationState.lastResults = [];
}

function cloneSeries(entry: TvdbSeries): TvdbSeries {
  return {
    id: entry.id,
    name: entry.name,
    overview: entry.overview,
    firstAired: entry.firstAired,
    entityType: entry.entityType
  };
}
