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
    <View style={[styles.container, { backgroundColor: dark ? '#000000' : '#F3F4F6' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: dark ? '#FFFFFF' : '#111827', paddingTop: insets.top + 18 }]}>Favorites</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, gap: 12 },
  title: { fontSize: 34, fontWeight: '800', flex: 1, paddingTop: 18 },
  langButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', minWidth: 70 },
  langButtonText: { fontSize: 22 },
  langButtonLabel: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1 }
});
