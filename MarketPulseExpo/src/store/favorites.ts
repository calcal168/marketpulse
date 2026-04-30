import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article } from '@/models/Article';

const KEY = 'marketpulse.favorites.v1';

export async function loadFavorites(): Promise<Article[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Article[];
  } catch {
    return [];
  }
}

export async function saveFavorites(articles: Article[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(articles));
}
