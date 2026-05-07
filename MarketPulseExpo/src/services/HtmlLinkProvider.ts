import { Article } from '@/models/Article';
import { NewsCategory } from '@/models/NewsCategory';
import { NewsSource } from '@/models/NewsSource';
import { ArticleProvider } from './ArticleProvider';
import { cleanNewsText, stripHtml } from './html';

type HtmlLinkProviderOptions = {
  source: NewsSource;
  url: string;
  category?: NewsCategory;
  terms: string[];
};

export class HtmlLinkProvider implements ArticleProvider {
  constructor(private options: HtmlLinkProviderOptions) {}

  async fetchArticles(): Promise<Article[]> {
    const response = await fetch(this.options.url);

    if (!response.ok) {
      throw new Error(`${this.options.source} page failed: ${response.status}`);
    }

    const html = await response.text();
    const links = extractLinks(html, this.options.url);
    const terms = this.options.terms.map(term => term.toLowerCase());

    return links
      .filter(link => terms.length === 0 || terms.some(term => link.title.toLowerCase().includes(term) || link.url.toLowerCase().includes(term)))
      .filter((link, index, all) => all.findIndex(match => match.url === link.url) === index)
      .slice(0, 25)
      .map(link => ({
        id: `${this.options.source}-${link.url}`,
        source: this.options.source,
        category: this.options.category ?? 'Financial',
        title: link.title,
        url: link.url,
      }));
  }
}

function extractLinks(html: string, baseUrl: string): Array<{ title: string; url: string }> {
  const links: Array<{ title: string; url: string }> = [];
  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const rawUrl = cleanNewsText(match[1]);
    const title = stripHtml(match[2]);

    if (!rawUrl || !title || title.length < 6) continue;

    const url = resolveUrl(rawUrl, baseUrl);
    if (!url || !url.startsWith('http')) continue;

    links.push({ title, url });
  }

  return links;
}

function resolveUrl(rawUrl: string, baseUrl: string): string | undefined {
  try {
    return new URL(rawUrl, baseUrl).toString();
  } catch {
    return undefined;
  }
}
