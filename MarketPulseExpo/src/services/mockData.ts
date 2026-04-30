import { Article } from '@/models/Article';

export const mockArticles: Article[] = [
  {
    id: 'mock-yahoo-1',
    source: 'Yahoo',
    title: 'Markets mixed as investors watch earnings',
    summary: 'A short sample summary for previewing the news card layout.',
    publishedAt: new Date().toISOString(),
    url: 'https://news.yahoo.com/'
  },
  {
    id: 'mock-bloomberg-1',
    source: 'Bloomberg',
    title: 'Global stocks edge higher in early trading',
    publishedAt: new Date(Date.now() - 3600_000).toISOString(),
    url: 'https://www.bloomberg.com/'
  }
];
