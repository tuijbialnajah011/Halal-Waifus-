export type SfwCategory = 'waifu' | 'husbando' | 'kitsune' | 'neko' | 'maid' | 'swimsuit' | 'uniform';
export type NsfwCategory = 'waifu' | 'neko' | 'trap' | 'blowjob' | 'boobs' | 'ass' | 'yuri' | 'hentai' | 'ecchi';
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

