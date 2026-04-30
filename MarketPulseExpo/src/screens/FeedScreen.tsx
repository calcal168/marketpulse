import { Article } from '@/models/Article';
import { ArticleFilter } from '@/models/NewsSource';
import { makeDefaultArticleService } from '@/services/defaultArticleService';
import { loadFavorites, saveFavorites } from '@/store/favorites';
import { ArticleRow } from '@/components/ArticleRow';
import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { FilterBar } from '@/components/FilterBar';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View, useColorScheme } from 'react-native';

const articleService = makeDefaultArticleService();

export function FeedScreen() {
  const dark = useColorScheme() === 'dark';
  const [articles, setArticles] = useState<Article[]>([]);
  const [favorites, setFavorites] = useState<Article[]>([]);
  const [filter, setFilter] = useState<ArticleFilter>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'All') return articles;
    return articles.filter(article => article.source === filter);
  }, [articles, filter]);

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
      <Text style={[styles.title, { color: dark ? '#FFFFFF' : '#111827' }]}>MarketPulse</Text>
      <Text style={styles.subtitle}>Yahoo + Bloomberg headlines</Text>
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
          />
        )}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 34, fontWeight: '800', paddingHorizontal: 16, paddingTop: 18 },
  subtitle: { color: '#8E8E93', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1 },
  inlineError: { color: '#FF453A', paddingHorizontal: 16, marginBottom: 8 }
});
