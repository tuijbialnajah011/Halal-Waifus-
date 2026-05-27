export type Category = 'waifu' | 'husbando' | 'kitsune' | 'neko';

export interface AnimeImage {
  url: string;
  artist_name: string;
  artist_href: string;
  source_url: string;
  dimensions?: {
    width: number;
    height: number;
  };
}
