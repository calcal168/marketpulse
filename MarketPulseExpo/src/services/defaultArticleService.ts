import { ArticleService } from './ArticleService';
import { HtmlLinkProvider } from './HtmlLinkProvider';
import { RssProvider } from './RssProvider';
import { SinaRollProvider } from './SinaRollProvider';
import { FEED_URLS } from './feedUrls';

export function makeDefaultArticleService(): ArticleService {
  return new ArticleService([
    new RssProvider('Yahoo', FEED_URLS.yahoo),
    new RssProvider('BBC', FEED_URLS.reuters),
    new RssProvider('BBC中文', FEED_URLS.bbcchinese),
    new RssProvider('CNA', FEED_URLS.cna),
    new SinaRollProvider(FEED_URLS.sina),
    new RssProvider('AlJazeera', FEED_URLS.aljazeera),
    new RssProvider('Yahoo Finance', FEED_URLS.sourceFallbacks.yahooFinance, 'Financial'),
    new RssProvider('Nasdaq', FEED_URLS.sourceFallbacks.nasdaq, 'Financial'),
    new RssProvider('Sina Finance', FEED_URLS.sourceFallbacks.sinaFinance, 'Financial'),
    new RssProvider('Eastmoney', FEED_URLS.sourceFallbacks.eastmoney, 'Financial'),
    new RssProvider('Tencent Finance', FEED_URLS.sourceFallbacks.tencentFinance, 'Financial'),
    new RssProvider('NetEase Finance', FEED_URLS.sourceFallbacks.neteaseFinance, 'Financial'),
    new RssProvider('Moomoo/Futu', FEED_URLS.sourceFallbacks.futuMoomoo, 'Financial'),
    new RssProvider('36Kr', FEED_URLS.sourceFallbacks.kr36Article, 'Tech'),
    new RssProvider('36Kr', FEED_URLS.sourceFallbacks.kr36Newsflash, 'Tech'),
    new HtmlLinkProvider({ source: 'Sina Finance', url: 'https://finance.sina.com.cn/', category: 'Financial', terms: [] }),
    new HtmlLinkProvider({ source: 'Eastmoney', url: 'https://finance.eastmoney.com/', category: 'Financial', terms: [] }),
    new HtmlLinkProvider({ source: 'Tencent Finance', url: 'https://finance.qq.com/', category: 'Financial', terms: [] }),
    new HtmlLinkProvider({ source: 'NetEase Finance', url: 'https://money.163.com/', category: 'Financial', terms: [] }),
    new HtmlLinkProvider({ source: 'Moomoo/Futu', url: 'https://www.futunn.com/en', category: 'Financial', terms: [] }),
    new RssProvider('Google News', FEED_URLS.global.world, 'Political'),
    new RssProvider('Google News', FEED_URLS.global.business, 'Financial'),
    new RssProvider('Google News', FEED_URLS.global.asia, 'Economic'),
    new RssProvider('Google News', FEED_URLS.global.europe, 'Economic'),
    new RssProvider('Google News', FEED_URLS.global.chineseBusiness, 'Financial'),
    new RssProvider('Google News', FEED_URLS.global.traditionalChineseBusiness, 'Financial'),
    new RssProvider('Google News', FEED_URLS.categories.political, 'Political'),
    new RssProvider('Google News', FEED_URLS.categories.financial, 'Financial'),
    new RssProvider('Google News', FEED_URLS.categories.economic, 'Economic'),
    new RssProvider('Google News', FEED_URLS.categories.people, 'People'),
    new RssProvider('Google News', FEED_URLS.categories.health, 'Health'),
    new RssProvider('Google News', FEED_URLS.categories.tech, 'Tech'),
  ]);
}
