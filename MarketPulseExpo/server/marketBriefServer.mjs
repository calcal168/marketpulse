import http from 'node:http';

const PORT = Number(process.env.MARKET_BRIEF_PORT ?? 8787);
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5-mini';

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'summary', 'themes', 'whyItMatters', 'watchlist', 'sources'],
  properties: {
    headline: { type: 'string' },
    summary: { type: 'string' },
    themes: { type: 'array', items: { type: 'string' } },
    whyItMatters: { type: 'array', items: { type: 'string' } },
    watchlist: { type: 'array', items: { type: 'string' } },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'source', 'url'],
        properties: {
          title: { type: 'string' },
          source: { type: 'string' },
          url: { type: 'string' },
        },
      },
    },
  },
};

const server = http.createServer(async (request, response) => {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== 'POST' || request.url !== '/market-brief') {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  try {
    const body = await readJson(request);
    const rawArticles = Array.isArray(body.articles) ? body.articles : [];
    const articles = selectMarketMovingArticles(rawArticles);

    if (articles.length === 0) {
      sendJson(response, 400, { error: 'No articles provided' });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      sendJson(response, 200, createLocalBrief(articles));
      return;
    }

    const brief = await createAiBrief(articles);
    sendJson(response, 200, {
      ...brief,
      generatedAt: new Date().toISOString(),
      mode: 'ai',
    });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

server.listen(PORT, () => {
  console.log(`Market brief server listening on http://localhost:${PORT}/market-brief`);
  if (!process.env.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY is not set. Server will return local fallback briefs.');
  }
});

async function createAiBrief(articles) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      instructions: [
        'You are a market news analyst for a mobile app.',
        'Review all provided feed items and summarize only the news that is likely to deeply affect the stock market.',
        'Prioritize central banks, rates, inflation, earnings, major companies, AI/semiconductors, commodities, currencies, geopolitics, trade policy, and China/US market risk.',
        'Ignore soft news, sports, lifestyle, crime, weather, and human-interest stories unless they have a clear market impact.',
        'Write in concise Simplified Chinese.',
        'Themes must be market concepts such as rates, AI chips, China, energy, earnings, geopolitics, crypto, or consumer demand. Do not use source names as themes.',
        'Watchlist must contain only assets, tickers, companies, commodities, currencies, or central banks. Do not include ordinary words.',
        'Do not invent facts. Use only the provided article titles, summaries, sources, and URLs.',
      ].join('\n'),
      input: JSON.stringify({ articles }),
      text: {
        format: {
          type: 'json_schema',
          name: 'market_brief',
          strict: true,
          schema,
        },
      },
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `OpenAI request failed: ${response.status}`);
  }

  const outputText = payload.output_text ?? payload.output?.flatMap(item => item.content ?? [])
    .find(part => part.type === 'output_text')?.text;

  if (!outputText) {
    throw new Error('OpenAI response did not include output text');
  }

  return JSON.parse(outputText);
}

function createLocalBrief(articles) {
  const top = selectMarketMovingArticles(articles).slice(0, 6);
  const sources = top.slice(0, 4).map(article => ({
    title: String(article.title ?? ''),
    source: String(article.source ?? ''),
    url: String(article.url ?? ''),
  }));

  return {
    headline: String(top[0]?.title ?? 'No market brief available'),
    summary: '\u672c\u5730\u7b80\u62a5\uff1a\u5df2\u4f18\u5148\u6574\u7406\u6700\u53ef\u80fd\u5f71\u54cd\u80a1\u5e02\u7684\u65b0\u95fb\u3002\u8bbe\u7f6e OPENAI_API_KEY \u540e\u4f1a\u751f\u6210\u66f4\u6df1\u5165\u7684 AI \u5e02\u573a\u5f71\u54cd\u6458\u8981\u3002',
    themes: extractThemes(top),
    whyItMatters: top.slice(0, 3).map(article => String(article.title ?? '')),
    watchlist: extractWatchlist(top),
    sources,
    generatedAt: new Date().toISOString(),
    mode: 'local',
  };
}

function selectMarketMovingArticles(articles) {
  const scored = articles
    .map(article => ({ article, score: marketImpactScore(article) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map(item => item.article);

  return scored.length > 0 ? scored : articles.slice(0, 30);
}

function marketImpactScore(article) {
  const text = `${article.title ?? ''} ${article.summary ?? ''}`.toLowerCase();
  const rules = [
    [/\b(stock|stocks|shares|market|nasdaq|s&p|dow|earnings|revenue|profit|ipo)\b/, 4],
    [/\b(fed|rate|inflation|treasury|yield|jobs|gdp|central bank)\b|\u7f8e\u8054\u50a8|\u5229\u7387|\u901a\u80c0|\u592e\u884c/, 4],
    [/\b(nvidia|tesla|apple|microsoft|amazon|meta|tsmc|semiconductor|chip|ai)\b|\u53f0\u79ef\u7535|\u534a\u5bfc\u4f53|\u82af\u7247/, 3],
    [/\b(oil|gold|crude|energy|commodity|dollar|yuan)\b|\u539f\u6cb9|\u9ec4\u91d1|\u7f8e\u5143|\u4eba\u6c11\u5e01/, 3],
    [/\b(china|tariff|sanction|trade|geopolitical|election|policy)\b|\u4e2d\u56fd|\u5173\u7a0e|\u5236\u88c1|\u653f\u7b56/, 2],
    [/\b(crypto|bitcoin|ethereum|btc)\b|\u6bd4\u7279\u5e01|\u52a0\u5bc6/, 2],
  ];

  return rules.reduce((score, [pattern, weight]) => score + (pattern.test(text) ? weight : 0), 0);
}

function extractWatchlist(articles) {
  const matches = new Set();
  const stopWords = new Set(['THE', 'AND', 'FOR', 'WITH', 'THIS', 'THAT', 'FROM', 'BBC', 'CNA', 'US', 'UK', 'TO']);
  const pattern = /\b[A-Z]{2,6}\b|\u7f8e\u8054\u50a8|\u53f0\u79ef\u7535|\u9ec4\u91d1|\u539f\u6cb9|\u7f8e\u5143|\u4eba\u6c11\u5e01|Tesla|Nvidia|Apple|Microsoft|Amazon|Meta|Bitcoin|Gold|Oil/g;

  for (const article of articles) {
    const text = `${article.title ?? ''} ${article.summary ?? ''}`;
    for (const match of text.match(pattern) ?? []) {
      if (!stopWords.has(match.toUpperCase())) {
        matches.add(match);
      }
    }
  }

  return Array.from(matches).slice(0, 8);
}

function extractThemes(articles) {
  const text = articles.map(article => `${article.title ?? ''} ${article.summary ?? ''}`).join(' ').toLowerCase();
  const themeRules = [
    ['AI and semiconductors', /\b(ai|nvidia|nvda|chip|semiconductor|tsmc|\u53f0\u79ef\u7535)\b/],
    ['Rates and central banks', /\b(fed|rate|inflation|treasury|yield|central bank|\u7f8e\u8054\u50a8|\u5229\u7387|\u901a\u80c0)\b/],
    ['China and Asia markets', /\b(china|hong kong|taiwan|yuan|\u4eba\u6c11\u5e01|\u4e2d\u56fd|\u9999\u6e2f|\u53f0\u6e7e)\b/],
    ['Energy and commodities', /\b(oil|crude|gold|gas|energy|\u539f\u6cb9|\u9ec4\u91d1|\u80fd\u6e90)\b/],
    ['Earnings and corporate news', /\b(earnings|revenue|profit|shares|stock|ipo|\u8d22\u62a5|\u80a1\u7968)\b/],
    ['Geopolitics and policy risk', /\b(war|tariff|sanction|election|policy|geopolitical|\u5173\u7a0e|\u5236\u88c1)\b/],
    ['Crypto and digital assets', /\b(bitcoin|crypto|ethereum|btc|\u52a0\u5bc6|\u6bd4\u7279\u5e01)\b/],
  ];

  const themes = themeRules.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
  return themes.length > 0 ? themes.slice(0, 5) : ['Market-moving headlines'];
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        request.destroy();
        reject(new Error('Request body too large'));
      }
    });
    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
