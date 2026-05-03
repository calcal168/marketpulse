import { Article } from '@/models/Article';
import { ArticleProvider } from './ArticleProvider';
import { cleanNewsText } from './html';

interface SinaRollItem {
  docid?: string;
  url?: string;
  wapurl?: string;
  title?: string;
  intro?: string;
  summary?: string;
  ctime?: string;
  mtime?: string;
}

interface SinaRollResponse {
  result?: {
    data?: SinaRollItem[];
  };
}

export class SinaRollProvider implements ArticleProvider {
  constructor(private url: string) {}

  async fetchArticles(): Promise<Article[]> {
    const response = await fetch(this.url);

    if (!response.ok) {
      throw new Error(`Sina feed failed: ${response.status}`);
    }

    let payload: SinaRollResponse;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error(`Failed to parse Sina JSON: ${(error as Error).message}`);
    }

    return (payload.result?.data ?? [])
      .map((item): Article | undefined => {
        const link = item.url?.startsWith('http')
          ? item.url
          : item.wapurl?.startsWith('http')
            ? item.wapurl
            : undefined;
        const title = cleanNewsText(item.title);

        if (!link || !title) return undefined;

        const timestamp = Number(item.ctime ?? item.mtime);

        return {
          id: `新浪-${item.docid ?? link}`,
          source: '新浪',
          title,
          summary: cleanNewsText(item.intro) || cleanNewsText(item.summary),
          publishedAt: Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp * 1000).toISOString() : undefined,
          url: link,
        };
      })
      .filter(Boolean) as Article[];
  }
}
