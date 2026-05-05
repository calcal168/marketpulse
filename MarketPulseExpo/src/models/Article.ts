import { NewsSource } from './NewsSource';
import { NewsCategory } from './NewsCategory';

export type Article = {
  id: string;
  source: NewsSource;
  category: NewsCategory;
  title: string;
  summary?: string;
  publishedAt?: string;
  url: string;
};
