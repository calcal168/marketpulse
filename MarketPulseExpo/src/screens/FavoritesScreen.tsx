import { Article } from '@/models/Article';
import { loadFavorites, saveFavorites } from '@/store/favorites';
import { ArticleRow } from '@/components/ArticleRow';
import { EmptyView } from '@/components/StateViews';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function FavoritesScreen() {
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const [favorites, setFavorites] = useState<Article[]>([]);
  const favoriteIds = useMemo(() => new Set(favorites.map(article => article.id)), [favorites]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites().then(setFavorites);
    }, [])
  );

  async function toggleFavorite(article: Article) {
    const next = favorites.filter(item => item.id !== article.id);
    setFavorites(next);
    await saveFavorites(next);
  }

  async function openArticle(article: Article) {
    await WebBrowser.openBrowserAsync(article.url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: dark ? '#0B0D12' : '#F5F7FA' }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: dark ? '#20252E' : '#E3E7ED' }]}>
        <View>
          <Text style={[styles.kicker, { color: dark ? '#8F98A8' : '#667085' }]}>Reading list</Text>
          <Text style={[styles.title, { color: dark ? '#F5F7FA' : '#111827' }]}>Favorites</Text>
        </View>
        <Text style={[styles.subtitle, { color: dark ? '#AAB3C2' : '#4B5563' }]}>
          {favorites.length === 1 ? '1 saved article' : `${favorites.length} saved articles`}
        </Text>
      </View>
      <FlatList
        data={favorites}
        keyExtractor={item => item.id}
        ListEmptyComponent={<EmptyView title="Save articles from the feed and they will appear here." />}
        renderItem={({ item }) => (
          <ArticleRow
            article={item}
            isFavorite={favoriteIds.has(item.id)}
            onOpen={() => openArticle(item)}
            onToggleFavorite={() => toggleFavorite(item)}
          />
        )}
        contentContainerStyle={favorites.length === 0 ? styles.emptyList : styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  kicker: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0 },
  title: { fontSize: 30, fontWeight: '800', marginTop: 2 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 10, fontWeight: '700' },
  list: { paddingTop: 8, paddingBottom: 24 },
  emptyList: { flexGrow: 1 }
});
