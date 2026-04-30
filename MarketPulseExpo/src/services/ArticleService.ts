import { Article } from '@/models/Article';
import { ArticleProvider } from './ArticleProvider';

export class ArticleService {
  constructor(private providers: ArticleProvider[]) {}

  async fetchCombinedFeed(): Promise<Article[]> {
    const results = await Promise.allSettled(this.providers.map(provider => provider.fetchArticles()));
    const articles = results.flatMap(result => (result.status === 'fulfilled' ? result.value : []));

    if (articles.length === 0) {
      const error = results.find(result => result.status === 'rejected');
      throw new Error(error?.status === 'rejected' ? String(error.reason?.message ?? error.reason) : 'No articles available');
    }

    return articles
      .filter((article, index, all) => all.findIndex(match => match.url === article.url) === index)
      .sort((a, b) => new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime());
  }
}
