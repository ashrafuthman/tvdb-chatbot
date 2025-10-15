interface RemoteId {
  id: string;
  type: number;
  sourceName: string;
}

export interface TvdbResponse {
  data: TvdbEntity[];
  status: string;
  links: {
    prev: string | null;
    self: string;
    next: string | null;
    total_items: number;
    page_size: number;
  };
}

export interface TvdbEntity {
  aliases: string[];
  companies: string[];
  companyType: string | null;
  country: string | null;
  director: string | null;
  first_air_time: string | null;
  genres: string[];
  id: string;
  image_url: string | null;
  name: string;
  is_official: boolean;
  name_translated: string | null;
  network: string | null;
  objectID: string;
  officialList: string | null;
  overview: string | null;
  overviews: Record<string, string>;
  overview_translated: string[];
  poster: string | null;
  posters: string[];
  primary_language: string | null;
  remote_ids: RemoteId[];
  status: string | null;
  slug: string | null;
  studios: string[];
  title: string;
  thumbnail: string | null;
  translations: Record<string, string>;
  translationsWithLang: string[];
  tvdb_id: string | null;
  type: string;
  year: string | null;
}

