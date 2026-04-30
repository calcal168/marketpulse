import { NewsSource } from './NewsSource';

export type Article = {
  id: string;
  source: NewsSource;
  title: string;
  summary?: string;
  publishedAt?: string;
  url: string;
};
