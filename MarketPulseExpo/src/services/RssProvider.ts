import { XMLParser } from 'fast-xml-parser';
import { Article } from '@/models/Article';
import { ArticleProvider } from './ArticleProvider';
import { NewsSource } from '@/models/NewsSource';
import { stripHtml } from './html';

const parser = new XMLParser({ ignoreAttributes: false });

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
  constructor(private source: NewsSource, private url: string) {}

  async fetchArticles(): Promise<Article[]> {
    const response = await fetch(this.url);

    if (!response.ok) {
      throw new Error(`${this.source} feed failed: ${response.status}`);
    }

    const xml = await response.text();

    let parsed: RssFeed;
    try {
      parsed = parser.parse(xml);
    } catch (error) {
      throw new Error(`Failed to parse RSS XML for ${this.source}: ${(error as Error).message}`);
    }

    const items = asArray(parsed?.rss?.channel?.item);

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

        return {
          id: `${this.source}-${link}`,
          source: this.source,
          title,
          summary: item.description ? stripHtml(item.description) : undefined,
          publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
          url: link,
        };
      })
      .filter(Boolean) as Article[];
  }
}