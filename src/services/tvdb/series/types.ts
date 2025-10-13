export type TvdbSeries = {
  id: number;
  name: string;
  overview: string | null;
  firstAired: string | null;
  entityType: 'series' | 'movie';
};

export type SearchOptions = {
  entityType?: 'series' | 'movie';
  network?: string | null;
  company?: string | null;
  year?: number | null;
  country?: string | null;
  language?: string | null;
  limit?: number | null;
};
