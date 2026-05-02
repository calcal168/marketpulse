export type Language = 'en' | 'zh';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    marketPulse: 'MarketPulse',
    headline: 'Yahoo + Bloomberg + Al Jazeera headlines',
    search: 'Search articles...',
    favorites: 'Favorites',
    noArticles: 'No articles for this filter.',
    saveFavorites: 'Save articles from the feed and they will appear here.',
    someFailed: 'Some sources failed: ',
  },
  zh: {
    marketPulse: '市场脉动',
    headline: '雅虎 + 彭博社 + 半岛电视台新闻头条',
    search: '搜索文章...',
    favorites: '收藏',
    noArticles: '该筛选条件下没有文章。',
    saveFavorites: '从信息源保存文章，它们将出现在这里。',
    someFailed: '某些来源失败：',
  },
};

export function t(key: keyof typeof translations.en, language: Language): string {
  return translations[language][key] || translations.en[key];
}
