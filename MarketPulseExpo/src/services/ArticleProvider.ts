import { Article } from '@/models/Article';

export interface ArticleProvider {
  fetchArticles(): Promise<Article[]>;
}
