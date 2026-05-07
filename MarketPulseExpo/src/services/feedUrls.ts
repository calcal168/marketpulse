export const FEED_URLS = {
  yahoo: 'https://news.google.com/rss/search?q=stock+market&hl=en-US&gl=US&ceid=US:en',
  reuters: 'https://feeds.bbci.co.uk/news/rss.xml',
  bbcchinese: 'https://feeds.bbci.co.uk/zhongwen/trad/rss.xml',
  cna: 'https://feeds.feedburner.com/rsscna/finance',
  sina: 'https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2509&k=&num=20&page=1',
  aljazeera: 'https://www.aljazeera.com/xml/rss/all.xml',
  sourceFallbacks: {
    yahooFinance: 'https://finance.yahoo.com/rss/topstories',
    nasdaq: 'https://www.nasdaq.com/feed/rssoutbound',
    sinaFinance: 'https://news.google.com/rss/search?q=site%3Afinance.sina.com.cn%20finance%20OR%20stocks&hl=zh-CN&gl=CN&ceid=CN%3Azh-Hans',
    eastmoney: 'https://news.google.com/rss/search?q=site%3Aeastmoney.com%20finance%20OR%20stocks&hl=zh-CN&gl=CN&ceid=CN%3Azh-Hans',
    tencentFinance: 'https://news.google.com/rss/search?q=site%3Afinance.qq.com%20finance%20OR%20stocks&hl=zh-CN&gl=CN&ceid=CN%3Azh-Hans',
    neteaseFinance: 'https://news.google.com/rss/search?q=site%3Amoney.163.com%20finance%20OR%20stocks&hl=zh-CN&gl=CN&ceid=CN%3Azh-Hans',
    futuMoomoo: 'https://news.google.com/rss/search?q=site%3Afutunn.com%20OR%20site%3Amoomoo.com%20stocks&hl=en-US&gl=US&ceid=US%3Aen',
    kr36Article: 'https://36kr.com/feed-article',
    kr36Newsflash: 'https://36kr.com/feed-newsflash'
  },
  global: {
    world: 'https://news.google.com/rss/search?q=world+news&hl=en-US&gl=US&ceid=US:en',
    business: 'https://news.google.com/rss/search?q=global+business+OR+markets&hl=en-US&gl=US&ceid=US:en',
    asia: 'https://news.google.com/rss/search?q=Asia+business+OR+China+markets+OR+Japan+markets&hl=en-US&gl=US&ceid=US:en',
    europe: 'https://news.google.com/rss/search?q=Europe+business+OR+EU+economy+OR+European+markets&hl=en-GB&gl=GB&ceid=GB:en',
    chineseBusiness: 'https://news.google.com/rss/search?q=全球+财经+OR+股票+OR+经济&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    traditionalChineseBusiness: 'https://news.google.com/rss/search?q=全球+財經+OR+股票+OR+經濟&hl=zh-TW&gl=TW&ceid=TW:zh-Hant'
  },
  categories: {
    political: 'https://news.google.com/rss/search?q=politics+OR+government+OR+election&hl=en-US&gl=US&ceid=US:en',
    financial: 'https://news.google.com/rss/search?q=stocks+OR+markets+OR+earnings+OR+finance&hl=en-US&gl=US&ceid=US:en',
    economic: 'https://news.google.com/rss/search?q=economy+OR+inflation+OR+jobs+OR+central+bank&hl=en-US&gl=US&ceid=US:en',
    people: 'https://news.google.com/rss/search?q=people+OR+celebrity+OR+profile+OR+interview&hl=en-US&gl=US&ceid=US:en',
    health: 'https://news.google.com/rss/search?q=health+OR+medicine+OR+healthcare+OR+hospital&hl=en-US&gl=US&ceid=US:en',
    tech: 'https://news.google.com/rss/search?q=technology+OR+AI+OR+software+OR+chips&hl=en-US&gl=US&ceid=US:en'
  }
};
