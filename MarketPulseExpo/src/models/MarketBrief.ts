export type MarketBrief = {
  headline: string;
  summary: string;
  themes: string[];
  whyItMatters: string[];
  watchlist: string[];
  sources: {
    title: string;
    source: string;
    url: string;
  }[];
  generatedAt: string;
  mode: 'ai' | 'local';
};
