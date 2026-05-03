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
    const articles = Array.isArray(body.articles) ? body.articles.slice(0, 30) : [];

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
        'Summarize the hottest market-moving news from the provided feed items.',
        'Write in concise Simplified Chinese.',
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
  const top = articles.slice(0, 6);
  const sources = top.slice(0, 4).map(article => ({
    title: String(article.title ?? ''),
    source: String(article.source ?? ''),
    url: String(article.url ?? ''),
  }));

  return {
    headline: String(top[0]?.title ?? 'No market brief available'),
    summary: '\u672c\u5730\u7b80\u62a5\uff1a\u5df2\u6309\u5f53\u524d\u65b0\u95fb\u6d41\u987a\u5e8f\u6574\u7406\u70ed\u70b9\u3002\u8bbe\u7f6e OPENAI_API_KEY \u540e\u4f1a\u751f\u6210\u771f\u6b63\u7684 AI \u5e02\u573a\u6458\u8981\u3002',
    themes: Array.from(new Set(top.map(article => article.source).filter(Boolean))).slice(0, 4),
    whyItMatters: top.slice(0, 3).map(article => String(article.title ?? '')),
    watchlist: extractWatchlist(top),
    sources,
    generatedAt: new Date().toISOString(),
    mode: 'local',
  };
}

function extractWatchlist(articles) {
  const matches = new Set();
  const pattern = /\b[A-Z]{2,6}\b|\u7f8e\u8054\u50a8|\u53f0\u79ef\u7535|\u9ec4\u91d1|\u539f\u6cb9|\u7f8e\u5143|\u4eba\u6c11\u5e01|AI|Tesla|Nvidia/gi;

  for (const article of articles) {
    const text = `${article.title ?? ''} ${article.summary ?? ''}`;
    for (const match of text.match(pattern) ?? []) {
      matches.add(match);
    }
  }

  return Array.from(matches).slice(0, 8);
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
