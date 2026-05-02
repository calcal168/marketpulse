import { Article } from '@/models/Article';
import { ArticleFilter } from '@/models/NewsSource';
import { makeDefaultArticleService } from '@/services/defaultArticleService';
import { loadFavorites, saveFavorites } from '@/store/favorites';
import { ArticleRow } from '@/components/ArticleRow';
import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { FilterBar } from '@/components/FilterBar';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const articleService = makeDefaultArticleService();

export function FeedScreen() {
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const [articles, setArticles] = useState<Article[]>([]);
  const [favorites, setFavorites] = useState<Article[]>([]);
  const [filter, setFilter] = useState<ArticleFilter>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  const filtered = useMemo(() => {
    let result = articles;
    if (filter !== 'All') {
      result = result.filter(article => article.source === filter);
    }
    if (searchText) {
      result = result.filter(article => article.title.toLowerCase().includes(searchText.toLowerCase()));
    }
    return result;
  }, [articles, filter, searchText]);

  const favoriteIds = useMemo(() => new Set(favorites.map(article => article.id)), [favorites]);

  const refresh = useCallback(async (isPull = false) => {
    try {
      setError(null);
      isPull ? setRefreshing(true) : setLoading(true);
      const [nextArticles, storedFavorites] = await Promise.all([
        articleService.fetchCombinedFeed(),
        loadFavorites()
      ]);
      setArticles(nextArticles);
      setFavorites(storedFavorites);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh(false);
  }, [refresh]);

  async function toggleFavorite(article: Article) {
    const next = favoriteIds.has(article.id)
      ? favorites.filter(item => item.id !== article.id)
      : [article, ...favorites];
    setFavorites(next);
    await saveFavorites(next);
  }

  async function openArticle(article: Article) {
    await WebBrowser.openBrowserAsync(article.url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET
    });
  }

  if (loading) return <LoadingView />;
  if (error && articles.length === 0) return <ErrorView message={error} onRetry={() => refresh(false)} />;

  return (
    <View style={[styles.container, { backgroundColor: dark ? '#000000' : '#F3F4F6' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: dark ? '#FFFFFF' : '#111827', paddingTop: insets.top + 18 }]}>MarketPulse</Text>
      </View>
      <Text style={styles.subtitle}>Yahoo + Bloomberg + Al Jazeera headlines</Text>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: dark ? '#FFFFFF' : '#111827', borderColor: dark ? '#333333' : '#CCCCCC' }]}
          placeholder="Search articles..."
          placeholderTextColor={dark ? '#888888' : '#666666'}
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <FilterBar selected={filter} onSelect={setFilter} />
      {error ? <Text style={styles.inlineError}>Some sources failed: {error}</Text> : null}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} />}
        ListEmptyComponent={<EmptyView title="No articles for this filter." />}
        renderItem={({ item }) => (
          <ArticleRow
            article={item}
            isFavorite={favoriteIds.has(item.id)}
            onOpen={() => openArticle(item)}
            onToggleFavorite={() => toggleFavorite(item)}
            highlightText={searchText}
          />
        )}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
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
  subtitle: { color: '#8E8E93', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    height: 40,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1 },
  inlineError: { color: '#FF453A', paddingHorizontal: 16, marginBottom: 8 }
});
