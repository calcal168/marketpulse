import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article } from '@/models/Article';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const SETTINGS_KEY = 'marketpulse.keywordAlerts.v1';
const NOTIFIED_KEY = 'marketpulse.keywordAlerts.notified.v1';
const DEFAULT_KEYWORDS = ['Nvidia', 'Fed', 'Tesla', '\u7f8e\u8054\u50a8', '\u53f0\u79ef\u7535', '\u9ec4\u91d1', '\u539f\u6cb9'];

export type KeywordAlertSettings = {
  enabled: boolean;
  keywords: string[];
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function loadKeywordAlertSettings(): Promise<KeywordAlertSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return { enabled: false, keywords: DEFAULT_KEYWORDS };

  try {
    const parsed = JSON.parse(raw) as Partial<KeywordAlertSettings>;
    const keywords = normalizeKeywords(parsed.keywords);
    return {
      enabled: Boolean(parsed.enabled),
      keywords: keywords.length > 0 ? keywords : DEFAULT_KEYWORDS,
    };
  } catch {
    return { enabled: false, keywords: DEFAULT_KEYWORDS };
  }
}

export async function saveKeywordAlertSettings(settings: KeywordAlertSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
    enabled: settings.enabled,
    keywords: normalizeKeywords(settings.keywords),
  }));
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function notifyKeywordMatches(articles: Article[], settings: KeywordAlertSettings): Promise<number> {
  if (!settings.enabled || Platform.OS === 'web') return 0;

  const keywords = normalizeKeywords(settings.keywords);
  if (keywords.length === 0) return 0;

  const permitted = await ensureNotificationPermission();
  if (!permitted) return 0;

  const notified = await loadNotifiedIds();
  const matches = articles
    .map(article => ({ article, keyword: findMatchingKeyword(article, keywords) }))
    .filter((match): match is { article: Article; keyword: string } => Boolean(match.keyword) && !notified.has(match.article.id))
    .slice(0, 3);

  for (const { article, keyword } of matches) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `MarketPulse: ${keyword}`,
        body: article.title,
        data: { articleId: article.id, url: article.url },
      },
      trigger: null,
    });
    notified.add(article.id);
  }

  await saveNotifiedIds(notified);
  return matches.length;
}

export function parseKeywordInput(input: string): string[] {
  return normalizeKeywords(input.split(/[,，\n]/));
}

function normalizeKeywords(keywords: unknown): string[] {
  if (!Array.isArray(keywords)) return [];

  return Array.from(new Set(
    keywords
      .filter((keyword): keyword is string => typeof keyword === 'string')
      .map(keyword => keyword.trim())
      .filter(Boolean)
  ));
}

function findMatchingKeyword(article: Article, keywords: string[]): string | undefined {
  const haystack = `${article.title} ${article.summary ?? ''}`.toLowerCase();
  return keywords.find(keyword => haystack.includes(keyword.toLowerCase()));
}

async function loadNotifiedIds(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(NOTIFIED_KEY);
  if (!raw) return new Set();

  try {
    const ids = JSON.parse(raw);
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

async function saveNotifiedIds(ids: Set<string>): Promise<void> {
  await AsyncStorage.setItem(NOTIFIED_KEY, JSON.stringify(Array.from(ids).slice(-300)));
}
