import { Article } from '@/models/Article';
import { ArticleProvider } from './ArticleProvider';

export class FilteredProvider implements ArticleProvider {
  constructor(
    private provider: ArticleProvider,
    private matchesArticle: (article: Article) => boolean
  ) {}

  async fetchArticles(): Promise<Article[]> {
    const articles = await this.provider.fetchArticles();
    return articles.filter(this.matchesArticle);
  }
}
