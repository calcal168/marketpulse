import { ArticleService } from './ArticleService';
import { BloombergSitemapProvider } from './BloombergSitemapProvider';
import { RssProvider } from './RssProvider';
import { FEED_URLS } from './feedUrls';

export function makeDefaultArticleService(): ArticleService {
  return new ArticleService([
    new RssProvider('Yahoo', FEED_URLS.yahoo),
    new BloombergSitemapProvider(FEED_URLS.bloombergSitemap),
    new RssProvider('AlJazeera', FEED_URLS.aljazeera)
  ]);
}
