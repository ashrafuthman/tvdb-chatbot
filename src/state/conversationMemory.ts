import { type ConversationState } from './types.js';


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
    lastResults: conversationState.lastResults
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
    conversationState.lastResults = update.lastResults;
  }
}

