import { Article } from '@/models/Article';
import { ArticleProvider } from './ArticleProvider';
import { NewsCategory } from '@/models/NewsCategory';
import { RssProvider } from './RssProvider';

type StockAlias = {
  symbol: string;
  names: string[];
};

const PROVIDER_TIMEOUT_MS = 1200;
const SEARCH_BUDGET_MS = 1800;

const aliases: StockAlias[] = [
  { symbol: 'AAPL', names: ['apple', '苹果', '蘋果'] },
  { symbol: 'MSFT', names: ['microsoft', '微软', '微軟'] },
  { symbol: 'NVDA', names: ['nvidia', '英伟达', '輝達', '英偉達'] },
  { symbol: 'TSLA', names: ['tesla', '特斯拉'] },
  { symbol: 'GOOGL', names: ['google', 'alphabet', '谷歌'] },
  { symbol: 'META', names: ['meta', 'facebook', '脸书', '臉書'] },
  { symbol: 'AMZN', names: ['amazon', '亚马逊', '亞馬遜'] },
  { symbol: 'TSM', names: ['tsmc', 'taiwan semiconductor', '台积电', '台積電'] },
  { symbol: 'BABA', names: ['alibaba', '阿里巴巴'] },
  { symbol: 'BIDU', names: ['baidu', '百度'] },
  { symbol: 'TCEHY', names: ['tencent', '腾讯', '騰訊'] },
  { symbol: 'NIO', names: ['nio', '蔚来', '蔚來'] },
  { symbol: 'XPEV', names: ['xpeng', '小鹏', '小鵬'] },
  { symbol: 'LI', names: ['li auto', '理想汽车', '理想汽車'] },
  {
    symbol: 'FUTU',
    names: [
      'futu',
      'futu holdings',
      'moomoo',
      '\u5bcc\u9014',
      '\u5bcc\u9014\u63a7\u80a1',
      '\u5bcc\u9014\u8bc1\u5238',
      '\u5bcc\u9014\u8b49\u5238',
      '\u5bcc\u9014\u725b\u725b',
    ],
  },
  {
    symbol: '300476.SZ',
    names: [
      '\u80dc\u5b8f\u79d1\u6280',
      '\u52dd\u5b8f\u79d1\u6280',
      '\u80dc\u5b8f',
      '\u52dd\u5b8f',
      'victory giant technology',
      'shenghong technology',
    ],
  },
];

const locales = [
  { hl: 'en-US', gl: 'US', ceid: 'US:en' },
  { hl: 'en-CA', gl: 'CA', ceid: 'CA:en' },
  { hl: 'en-GB', gl: 'GB', ceid: 'GB:en' },
  { hl: 'zh-CN', gl: 'CN', ceid: 'CN:zh-Hans' },
  { hl: 'zh-TW', gl: 'TW', ceid: 'TW:zh-Hant' },
  { hl: 'zh-HK', gl: 'HK', ceid: 'HK:zh-Hant' },
];

export type StockSearchResolution = {
  symbol: string;
  directSymbol?: string;
  terms: string[];
};

export type StockNewsSearchResult = {
  articles: Article[];
  resolution: StockSearchResolution;
};

export async function fetchGlobalStockNews(input: string): Promise<StockNewsSearchResult> {
  const resolution = resolveStockSearch(input);
  if (resolution.terms.length === 0) {
    return { articles: [], resolution };
  }

  const providers = createStockNewsProviders(resolution);
  const results = await settleWithin(
    providers.map(provider => fetchProviderWithTimeout(provider, PROVIDER_TIMEOUT_MS)),
    SEARCH_BUDGET_MS
  );
  const articles = results
    .flatMap(result => result.status === 'fulfilled' ? result.value : [])
    .filter(article => articleMatchesStockSearch(article, resolution))
    .filter((article, index, all) => all.findIndex(match => sameStockNewsArticle(match, article)) === index)
    .sort((a, b) => new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime());

  return { articles, resolution };
}

async function fetchProviderWithTimeout(provider: ArticleProvider, timeoutMs: number): Promise<Article[]> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      provider.fetchArticles(),
      new Promise<Article[]>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Provider timed out')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function settleWithin<T>(promises: Array<Promise<T>>, budgetMs: number): Promise<Array<PromiseSettledResult<T>>> {
  const results: Array<PromiseSettledResult<T> | undefined> = new Array(promises.length);
  let pending = promises.length;

  await Promise.race([
    new Promise<void>(resolve => {
      const finishOne = (index: number, result: PromiseSettledResult<T>) => {
        results[index] = result;
        pending -= 1;
        if (pending === 0) resolve();
      };

      promises.forEach((promise, index) => {
        promise.then(
          value => finishOne(index, { status: 'fulfilled', value }),
          reason => finishOne(index, { status: 'rejected', reason })
        );
      });
    }),
    new Promise<void>(resolve => setTimeout(resolve, budgetMs)),
  ]);

  return results.filter((result): result is PromiseSettledResult<T> => Boolean(result));
}

export function resolveStockSearch(input: string): StockSearchResolution {
  const clean = input.trim();
  if (!clean) return { symbol: '', terms: [] };

  const normalized = clean.toLowerCase();
  const alias = aliases.find(item =>
    item.symbol.toLowerCase() === normalized ||
    item.names.some(name => name.toLowerCase() === normalized)
  );

  const inputLooksLikeSymbol = looksLikeTicker(clean);
  const symbol = alias?.symbol ?? (inputLooksLikeSymbol ? clean.toUpperCase() : clean);
  const terms = Array.from(new Set([
    symbol,
    clean,
    ...(alias?.names ?? []),
  ].filter(Boolean)));

  return {
    symbol,
    directSymbol: alias?.symbol ?? (inputLooksLikeSymbol ? clean.toUpperCase() : undefined),
    terms,
  };
}

function createStockNewsProviders(resolution: StockSearchResolution): ArticleProvider[] {
  const baseQuery = buildOrQuery(resolution.terms);
  const providers: ArticleProvider[] = [
    new RssProvider('Google News', buildGoogleNewsSearchUrl(baseQuery, locales[0]), 'Financial', PROVIDER_TIMEOUT_MS),
    new RssProvider('Google News', buildGoogleNewsSearchUrl(baseQuery, locales[3]), 'Financial', PROVIDER_TIMEOUT_MS),
    ...createSourceTargetedProviders(resolution),
  ];

  return providers;
}

function createSourceTargetedProviders(resolution: StockSearchResolution): ArticleProvider[] {
  const terms = resolution.terms;
  const cnQuery = buildOrQuery(terms);
  const enQuery = buildOrQuery(terms.filter(term => /^[\x00-\x7F]+$/.test(term)));
  const hasChineseTerm = terms.some(term => /[\u3400-\u9FFF]/.test(term));

  const chineseProviders = [
    new RssProvider('Sina Finance', buildGoogleNewsSearchUrl(`(${cnQuery}) site:finance.sina.com.cn`, locales[3]), 'Financial', PROVIDER_TIMEOUT_MS),
    new RssProvider('Eastmoney', buildGoogleNewsSearchUrl(`(${cnQuery}) site:eastmoney.com`, locales[3]), 'Financial', PROVIDER_TIMEOUT_MS),
    new RssProvider('36Kr', buildGoogleNewsSearchUrl(`(${cnQuery}) site:36kr.com`, locales[3]), 'Tech', PROVIDER_TIMEOUT_MS),
  ];
  const englishProviders = [
    new RssProvider('Moomoo/Futu', buildGoogleNewsSearchUrl(`(${enQuery || cnQuery}) site:futunn.com`, locales[0]), 'Financial', PROVIDER_TIMEOUT_MS),
    new RssProvider('Yahoo Finance', buildGoogleNewsSearchUrl(`(${enQuery || cnQuery}) site:finance.yahoo.com`, locales[0]), 'Financial', PROVIDER_TIMEOUT_MS),
    new RssProvider('Nasdaq', buildGoogleNewsSearchUrl(`(${enQuery || cnQuery}) site:nasdaq.com`, locales[0]), 'Financial', PROVIDER_TIMEOUT_MS),
  ];

  return hasChineseTerm ? chineseProviders : englishProviders;
}

function buildOrQuery(terms: string[]): string {
  return terms.map(term => `"${term}"`).join(' OR ');
}

function buildGoogleNewsSearchUrl(query: string, locale: { hl: string; gl: string; ceid: string }): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${locale.hl}&gl=${locale.gl}&ceid=${locale.ceid}`;
}

function articleMatchesStockSearch(article: Article, resolution: StockSearchResolution): boolean {
  const text = `${article.title} ${article.summary ?? ''} ${article.url}`.toLowerCase();
  return resolution.terms
    .map(term => term.toLowerCase().trim())
    .filter(term => term.length >= 2)
    .some(term => text.includes(term));
}

function looksLikeTicker(value: string): boolean {
  return /^[A-Za-z0-9.:-]{1,12}$/.test(value.trim());
}

function sameStockNewsArticle(a: Article, b: Article): boolean {
  return canonicalUrl(a.url) === canonicalUrl(b.url) || normalizeTitle(a.title) === normalizeTitle(b.title);
}

function canonicalUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+-\s+[^-]+$/g, '')
    .replace(/\s+\|\s+.+$/g, '')
    .replace(/[^\p{L}\p{N}\u3400-\u9FFF]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
