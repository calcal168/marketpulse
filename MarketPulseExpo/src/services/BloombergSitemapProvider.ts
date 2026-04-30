import { XMLParser } from 'fast-xml-parser';
import { Article } from '@/models/Article';
import { ArticleProvider } from './ArticleProvider';
import { stripHtml } from './html';

const parser = new XMLParser({ ignoreAttributes: false });

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanTitleFromUrl(url: string): string {
  const last = url.split('/').filter(Boolean).pop() ?? url;
  return last
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

export class BloombergSitemapProvider implements ArticleProvider {
  constructor(private url: string) {}

  async fetchArticles(): Promise<Article[]> {
    const response = await fetch(this.url);
    if (!response.ok) throw new Error(`Bloomberg sitemap failed: ${response.status}`);

    const xml = await response.text();
    const parsed = parser.parse(xml);
    const entries = asArray(parsed?.urlset?.url);

    return entries
      .map((entry: any): Article | undefined => {
        const loc = typeof entry.loc === 'string' ? entry.loc : undefined;
        if (!loc) return undefined;
        const news = entry['news:news'];
        const rawTitle = news?.['news:title'];
        const title = stripHtml(rawTitle) ?? cleanTitleFromUrl(loc);

        return {
          id: `Bloomberg-${loc}`,
          source: 'Bloomberg',
          title,
          summary: undefined,
          publishedAt: news?.['news:publication_date'] ? new Date(news['news:publication_date']).toISOString() : undefined,
          url: loc
        };
      })
      .filter(Boolean) as Article[];
  }
}
