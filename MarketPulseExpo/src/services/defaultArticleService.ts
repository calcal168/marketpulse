import { ArticleService } from './ArticleService';
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
    new RssProvider('AlJazeera', FEED_URLS.aljazeera)
  ]);
}
