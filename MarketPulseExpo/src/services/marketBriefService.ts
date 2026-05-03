import { Article } from '@/models/Article';
import { MarketBrief } from '@/models/MarketBrief';

const DEFAULT_BRIEF_URL = 'http://localhost:8787/market-brief';

export async function generateMarketBrief(articles: Article[]): Promise<MarketBrief> {
  const selected = selectMarketMovingArticles(articles).map(article => ({
    title: article.title,
    summary: article.summary,
    source: article.source,
    publishedAt: article.publishedAt,
    url: article.url,
  }));

  try {
    const response = await fetch(process.env.EXPO_PUBLIC_MARKET_BRIEF_URL ?? DEFAULT_BRIEF_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles: selected }),
    });

    if (!response.ok) {
      throw new Error(`Brief server failed: ${response.status}`);
    }

    return await response.json() as MarketBrief;
  } catch {
    return createLocalBrief(articles);
  }
}

function createLocalBrief(articles: Article[]): MarketBrief {
  const topArticles = selectMarketMovingArticles(articles).slice(0, 6);
  const themes = extractThemes(topArticles);

  return {
    headline: topArticles[0]?.title ?? 'No market brief available',
    summary: 'Local market-impact brief generated from headlines most likely to affect stocks. Start the AI brief server with OPENAI_API_KEY for deeper synthesis.',
    themes,
    whyItMatters: topArticles.slice(0, 3).map(article => article.title),
    watchlist: extractWatchlist(topArticles),
    sources: topArticles.slice(0, 4).map(article => ({
      title: article.title,
      source: article.source,
      url: article.url,
    })),
    generatedAt: new Date().toISOString(),
    mode: 'local',
  };
}

function selectMarketMovingArticles(articles: Article[]): Article[] {
  const scored = articles
    .map(article => ({ article, score: marketImpactScore(article) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map(item => item.article);

  return scored.length > 0 ? scored : articles.slice(0, 30);
}

function marketImpactScore(article: Article): number {
  const text = `${article.title} ${article.summary ?? ''}`.toLowerCase();
  const rules: Array<[RegExp, number]> = [
    [/\b(stock|stocks|shares|market|nasdaq|s&p|dow|earnings|revenue|profit|ipo)\b/, 4],
    [/\b(fed|rate|inflation|treasury|yield|jobs|gdp|central bank)\b|美联储|利率|通胀|央行/, 4],
    [/\b(nvidia|tesla|apple|microsoft|amazon|meta|tsmc|semiconductor|chip|ai)\b|台积电|半导体|芯片/, 3],
    [/\b(oil|gold|crude|energy|commodity|dollar|yuan)\b|原油|黄金|美元|人民币/, 3],
    [/\b(china|tariff|sanction|trade|geopolitical|election|policy)\b|中国|关税|制裁|政策/, 2],
    [/\b(crypto|bitcoin|ethereum|btc)\b|比特币|加密/, 2],
  ];

  return rules.reduce((score, [pattern, weight]) => score + (pattern.test(text) ? weight : 0), 0);
}

function extractWatchlist(articles: Article[]): string[] {
  const matches = new Set<string>();
  const stopWords = new Set(['THE', 'AND', 'FOR', 'WITH', 'THIS', 'THAT', 'FROM', 'BBC', 'CNA', 'US', 'UK', 'TO']);
  const pattern = /\b[A-Z]{2,6}\b|美联储|台积电|黄金|原油|美元|人民币|Tesla|Nvidia|Apple|Microsoft|Amazon|Meta|Bitcoin|Gold|Oil/g;

  for (const article of articles) {
    const text = `${article.title} ${article.summary ?? ''}`;
    for (const match of text.match(pattern) ?? []) {
      if (!stopWords.has(match.toUpperCase())) {
        matches.add(normalizeWatchTerm(match));
      }
    }
  }

  return Array.from(matches).slice(0, 8);
}

function extractThemes(articles: Article[]): string[] {
  const text = articles.map(article => `${article.title} ${article.summary ?? ''}`).join(' ').toLowerCase();
  const themeRules: Array<[string, RegExp]> = [
    ['AI and semiconductors', /\b(ai|nvidia|nvda|chip|semiconductor|tsmc|台积电)\b/],
    ['Rates and central banks', /\b(fed|rate|inflation|treasury|yield|central bank|美联储|利率|通胀)\b/],
    ['China and Asia markets', /\b(china|hong kong|taiwan|yuan|人民币|中国|香港|台湾)\b/],
    ['Energy and commodities', /\b(oil|crude|gold|gas|energy|原油|黄金|能源)\b/],
    ['Earnings and corporate news', /\b(earnings|revenue|profit|shares|stock|ipo|财报|股票)\b/],
    ['Geopolitics and policy risk', /\b(war|tariff|sanction|election|policy|geopolitical|关税|制裁)\b/],
    ['Crypto and digital assets', /\b(bitcoin|crypto|ethereum|btc|加密|比特币)\b/],
  ];

  const themes = themeRules.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
  return themes.length > 0 ? themes.slice(0, 5) : ['Market-moving headlines'];
}

function normalizeWatchTerm(term: string): string {
  const normalized: Record<string, string> = {
    Nvidia: 'Nvidia',
    Tesla: 'Tesla',
    Apple: 'Apple',
    Microsoft: 'Microsoft',
    Amazon: 'Amazon',
    Meta: 'Meta',
    Bitcoin: 'Bitcoin',
    Gold: 'Gold',
    Oil: 'Oil',
  };

  return normalized[term] ?? term;
}
