import { type TvdbEntity } from "../services/tvdb/series/types.js";

export type ConversationState = {
  lastSearchTerm: string | null;
  lastResultTitle: string | null;
  lastResultIds: string[];
  lastResults: TvdbEntity[];
};
