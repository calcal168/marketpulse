import { Article } from '@/models/Article';
import { MarketBrief } from '@/models/MarketBrief';

const DEFAULT_BRIEF_URL = 'http://localhost:8787/market-brief';

export async function generateMarketBrief(articles: Article[]): Promise<MarketBrief> {
  const selected = articles.slice(0, 30).map(article => ({
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
  const topArticles = articles.slice(0, 6);
  const sourceCounts = new Map<string, number>();

  for (const article of articles) {
    sourceCounts.set(article.source, (sourceCounts.get(article.source) ?? 0) + 1);
  }

  const themes = Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([source]) => source);

  return {
    headline: topArticles[0]?.title ?? 'No market brief available',
    summary: 'Local brief generated from the latest feed order. Start the AI brief server with OPENAI_API_KEY for deeper synthesis.',
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

function extractWatchlist(articles: Article[]): string[] {
  const matches = new Set<string>();
  const pattern = /\b[A-Z]{2,6}\b|美联储|台积电|黄金|原油|美元|人民币|AI|Tesla|Nvidia/gi;

  for (const article of articles) {
    const text = `${article.title} ${article.summary ?? ''}`;
    for (const match of text.match(pattern) ?? []) {
      matches.add(match);
    }
  }

  return Array.from(matches).slice(0, 8);
}
