export type SfwCategory = 'waifu' | 'husbando' | 'kitsune' | 'neko';
export type NsfwCategory = 'waifu' | 'neko' | 'trap' | 'blowjob';
export type Category = SfwCategory | NsfwCategory;

export interface AnimeImage {
  url: string;
  artist_name?: string;
  artist_href?: string;
  source_url?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

