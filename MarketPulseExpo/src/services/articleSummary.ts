import { Article } from '@/models/Article';
import { ArticleSummary } from '@/models/ArticleSummary';

const marketTerms = [
  'AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'META', 'AMZN', 'TSM',
  'Fed', 'inflation', 'rates', 'earnings', 'oil', 'gold', 'Bitcoin', 'China',
  'Apple', 'Microsoft', 'Nvidia', 'Tesla', 'Google', 'Meta', 'Amazon',
];

export function summarizeArticle(article: Article): ArticleSummary {
  const text = `${article.title}. ${article.summary ?? ''}`.replace(/\s+/g, ' ').trim();
  const sentences = splitSentences(text);
  const relatedTerms = extractRelatedTerms(text);

  return {
    bullets: buildBullets(article, sentences),
    whyItMatters: buildWhyItMatters(article, relatedTerms),
    relatedTerms,
  };
}

function buildBullets(article: Article, sentences: string[]): string[] {
  const bullets = [
    sentences[0] ?? article.title,
    sentences.find(sentence => /market|stock|shares|earnings|rate|inflation|economy|tech|ai|oil|gold/i.test(sentence)),
    article.summary,
  ]
    .filter((value): value is string => Boolean(value))
    .map(value => value.trim())
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 3);

  return bullets.length > 0 ? bullets : [article.title];
}

function buildWhyItMatters(article: Article, relatedTerms: string[]): string {
  if (article.category === 'Financial' || article.category === 'Economic') {
    return 'This may affect market sentiment, rates, earnings expectations, or risk appetite.';
  }
  if (article.category === 'Tech') {
    return 'This may affect technology stocks, AI themes, semiconductors, or growth expectations.';
  }
  if (relatedTerms.length > 0) {
    return `Watch for possible impact on ${relatedTerms.slice(0, 3).join(', ')}.`;
  }
  return 'This story is worth monitoring for follow-up headlines and market reaction.';
}

function extractRelatedTerms(text: string): string[] {
  const matches = new Set<string>();
  for (const term of marketTerms) {
    if (new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i').test(text)) {
      matches.add(normalizeTerm(term));
    }
  }
  return Array.from(matches).slice(0, 8);
}

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?\u3002\uff01\uff1f]+[.!?\u3002\uff01\uff1f]?/g) ?? [text])
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

function normalizeTerm(term: string): string {
  const normalized: Record<string, string> = {
    Apple: 'AAPL',
    Microsoft: 'MSFT',
    Nvidia: 'NVDA',
    Tesla: 'TSLA',
    Google: 'GOOGL',
    Meta: 'META',
    Amazon: 'AMZN',
  };

  return normalized[term] ?? term;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
