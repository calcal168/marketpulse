// Simple translation service using the MyMemory public translation API.
const TRANSLATION_API = 'https://api.mymemory.translated.net/get';

interface TranslationCache {
  [key: string]: string;
}

const translationCache: TranslationCache = {};

export async function translateText(text: string, targetLanguage: 'en' | 'zh'): Promise<string> {
  if (!text) return text;
  if (targetLanguage === 'en') return text;

  const cacheKey = `${text}_${targetLanguage}`;
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  const url = `${TRANSLATION_API}?q=${encodeURIComponent(text)}&langpair=en|zh-CN`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('Translation request failed:', response.status, response.statusText);
      return text;
    }

    const data = await response.json();
    const translatedText = data?.responseData?.translatedText;

    if (typeof translatedText !== 'string' || !translatedText.trim()) {
      console.warn('Translation error: invalid response', data);
      return text;
    }

    translationCache[cacheKey] = translatedText;
    return translatedText;
  } catch (error) {
    console.warn('Translation error:', error);
    return text;
  }
}
