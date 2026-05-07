import { XMLParser } from 'fast-xml-parser';
import { Article } from '@/models/Article';
import { ArticleProvider } from './ArticleProvider';
import { NewsSource } from '@/models/NewsSource';
import { NewsCategory } from '@/models/NewsCategory';
import { categorizeArticle } from './categorizeArticle';
import { stripHtml } from './html';

const parser = new XMLParser({ ignoreAttributes: false });
const MAX_RSS_XML_CHARS = 220000;
const MAX_RSS_ITEMS = 30;

interface RssItem {
  title?: string;
  link?: string | { '#text': string };
  guid?: string | { '#text': string };
  description?: string;
  pubDate?: string;
}

interface RssChannel {
  item?: RssItem | RssItem[];
}

interface RssFeed {
  rss?: {
    channel?: RssChannel;
  };
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export class RssProvider implements ArticleProvider {
  constructor(private source: NewsSource, private url: string, private category?: NewsCategory, private timeoutMs?: number) {}

  async fetchArticles(): Promise<Article[]> {
    const controller = this.timeoutMs ? new AbortController() : undefined;
    const timeoutId = controller && this.timeoutMs
      ? setTimeout(() => controller.abort(), this.timeoutMs)
      : undefined;

    try {
      const response = await fetch(this.url, controller ? { signal: controller.signal } : undefined);

      if (!response.ok) {
        throw new Error(`${this.source} feed failed: ${response.status}`);
      }

      const xml = (await response.text()).slice(0, MAX_RSS_XML_CHARS);

      let parsed: RssFeed;
      try {
        parsed = parser.parse(xml);
      } catch (error) {
        throw new Error(`Failed to parse RSS XML for ${this.source}: ${(error as Error).message}`);
      }

      const items = asArray(parsed?.rss?.channel?.item).slice(0, MAX_RSS_ITEMS);

      return items
        .map((item): Article | undefined => {
          const rawLink = item.link
            ? typeof item.link === 'string' ? item.link : item.link['#text']
            : item.guid
              ? typeof item.guid === 'string' ? item.guid : item.guid['#text']
              : undefined;

          const link = typeof rawLink === 'string' &&
            rawLink.startsWith('http') &&
            !rawLink.includes('localhost')
            ? rawLink
            : undefined;

          const title = item.title ? stripHtml(item.title) : undefined;

          if (!link || !title) return undefined;

          const article = {
            id: `${this.source}-${link}`,
            source: this.source,
            category: this.category ?? 'Financial',
            title,
            summary: item.description ? stripHtml(item.description) : undefined,
            publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
            url: link,
          };

          return {
            ...article,
            category: this.category ?? categorizeArticle(article),
          };
        })
        .filter(Boolean) as Article[];
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}
