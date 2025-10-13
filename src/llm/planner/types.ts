export type SearchPlanQuery = {
  query: string;
  q: string;
  type: 'series' | 'movie' | 'person' | 'company' | null;
  year: number | null;
  company: string | null;
  country: string | null;
  director: string | null;
  language: string | null;
  primaryType: string | null;
  network: string | null;
  remote_id: string | null;
  offset: number | null;
  limit: number | null;
};

export type SearchPlan = {
  query: SearchPlanQuery;
  explanation: string;
  followUpSuggestions: string[];
  strategy: 'fresh-search' | 'reuse-results';
};
