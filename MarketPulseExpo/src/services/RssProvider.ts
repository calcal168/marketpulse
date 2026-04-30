import { XMLParser } from 'fast-xml-parser';
import { Article } from '@/models/Article';
import { ArticleProvider } from './ArticleProvider';
import { NewsSource } from '@/models/NewsSource';
import { stripHtml } from './html';

const parser = new XMLParser({ ignoreAttributes: false });

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export class RssProvider implements ArticleProvider {
  constructor(private source: NewsSource, private url: string) {}

  async fetchArticles(): Promise<Article[]> {
    const response = await fetch(this.url);

   

    if (!response.ok) {
      throw new Error(`${this.source} feed failed: ${response.status}`);
    }

    const xml = await response.text();

    console.log('XML preview:', xml.slice(0, 300));
    console.log('==============================');

    const parsed = parser.parse(xml);
    const items = asArray(parsed?.rss?.channel?.item);

    return items
      .map((item: any): Article | undefined => {
        const rawLink =
          typeof item.link === 'string'
            ? item.link
            : item.guid?.['#text'];

        const link =
          typeof rawLink === 'string' &&
          rawLink.startsWith('http') &&
          !rawLink.includes('localhost')
            ? rawLink
            : undefined;

        const title = stripHtml(item.title);

        if (!link || !title) return undefined;

        return {
          id: `${this.source}-${link}`,
          source: this.source,
          title,
          summary: stripHtml(item.description),
          publishedAt: item.pubDate
            ? new Date(item.pubDate).toISOString()
            : undefined,
          url: link,
        };
      })
      .filter(Boolean) as Article[];
  }
}