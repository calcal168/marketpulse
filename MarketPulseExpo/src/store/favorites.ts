import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article } from '@/models/Article';
import { categorizeArticle } from '@/services/categorizeArticle';

const KEY = 'marketpulse.favorites.v1';
const listeners = new Set<(count: number) => void>();

export async function loadFavorites(): Promise<Article[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as Article[]).map(article => ({
      ...article,
      category: article.category ?? categorizeArticle(article),
    }));
  } catch {
    return [];
  }
}

export async function saveFavorites(articles: Article[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(articles));
  listeners.forEach(listener => listener(articles.length));
}

export function subscribeToFavoriteCount(listener: (count: number) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
