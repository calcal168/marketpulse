import { Article } from '@/models/Article';
import { NewsCategoryFilter } from '@/models/NewsCategory';
import { ArticleFilter } from '@/models/NewsSource';
import { makeDefaultArticleService } from '@/services/defaultArticleService';
import { StockNewsSearchResult, StockSearchResolution, fetchGlobalStockNews } from '@/services/stockNewsSearch';
import {
  KeywordAlertSettings,
  ensureNotificationPermission,
  loadKeywordAlertSettings,
  notifyKeywordMatches,
  parseKeywordInput,
  saveKeywordAlertSettings
} from '@/store/keywordAlerts';
import { loadFavorites, saveFavorites } from '@/store/favorites';
import { ArticleRow } from '@/components/ArticleRow';
import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { FilterBar } from '@/components/FilterBar';
import { StockSearchPanel } from '@/components/StockSearchPanel';
import { tintColor } from '@/theme/colors';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, StyleSheet, Switch, Text, TextInput, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const articleService = makeDefaultArticleService();
const STOCK_SEARCH_UI_TIMEOUT_MS = 3500;
const defaultAlertKeywords = ['NVIDIA', 'Fed', 'Tesla', '\u7f8e\u8054\u50a8', '\u53f0\u79ef\u7535', '\u9ec4\u91d1', '\u539f\u6cb9'];
const defaultAlertSettings: KeywordAlertSettings = {
  enabled: false,
  keywords: ['Nvidia', 'Fed', 'Tesla', '美联储', '台积电', '黄金', '原油'],
};
defaultAlertSettings.keywords = defaultAlertKeywords;

export function FeedScreen() {
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const [articles, setArticles] = useState<Article[]>([]);
  const [favorites, setFavorites] = useState<Article[]>([]);
  const [filter, setFilter] = useState<ArticleFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState<NewsCategoryFilter>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [newsSearchModalOpen, setNewsSearchModalOpen] = useState(false);
  const [alertSettings, setAlertSettings] = useState<KeywordAlertSettings>(defaultAlertSettings);
  const [keywordAlertModalOpen, setKeywordAlertModalOpen] = useState(false);
  const [keywordText, setKeywordText] = useState('');
  const [readingFeed, setReadingFeed] = useState(false);
  const [readingPaused, setReadingPaused] = useState(false);
  const [readingArticleId, setReadingArticleId] = useState<string | undefined>();
  const [stockSearchText, setStockSearchText] = useState('');
  const [stockSearchResults, setStockSearchResults] = useState<Article[]>([]);
  const [stockSearchResolution, setStockSearchResolution] = useState<StockSearchResolution>();
  const [stockSearchLoading, setStockSearchLoading] = useState(false);
  const [stockSearchError, setStockSearchError] = useState<string | undefined>();
  const [stockSearchModalOpen, setStockSearchModalOpen] = useState(false);
  const readingSessionRef = useRef(0);
  const listRef = useRef<FlatList<Article>>(null);
  const stockSearchSessionRef = useRef(0);
  const stockSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stockSearchActive = Boolean(stockSearchResolution);

  const filtered = useMemo(() => {
    let result = stockSearchActive ? stockSearchResults : articles;
    if (filter !== 'All') {
      result = result.filter(article => article.source === filter);
    }
    if (categoryFilter !== 'All') {
      result = result.filter(article => article.category === categoryFilter);
    }
    if (searchText) {
      result = result.filter(article => article.title.toLowerCase().includes(searchText.toLowerCase()));
    }
    return result;
  }, [articles, categoryFilter, filter, searchText, stockSearchActive, stockSearchResults]);

  const favoriteIds = useMemo(() => new Set(favorites.map(article => article.id)), [favorites]);

  const refresh = useCallback(async (isPull = false) => {
    try {
      setError(null);
      isPull ? setRefreshing(true) : setLoading(true);
      const [nextArticles, storedFavorites] = await Promise.all([
        articleService.fetchCombinedFeed(),
        loadFavorites()
      ]);
      const storedAlertSettings = await loadKeywordAlertSettings();

      setArticles(nextArticles);
      setFavorites(storedFavorites);
      setAlertSettings(storedAlertSettings);
      setKeywordText(isDefaultAlertKeywordList(storedAlertSettings.keywords) ? '' : storedAlertSettings.keywords.join(', '));
      await notifyKeywordMatches(nextArticles, storedAlertSettings);
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

  useEffect(() => () => {
    if (stockSearchTimeoutRef.current) {
      clearTimeout(stockSearchTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (readingFeed) {
      readingSessionRef.current += 1;
      Speech.stop();
      setReadingFeed(false);
      setReadingPaused(false);
      setReadingArticleId(undefined);
    }
  }, [categoryFilter, filter, searchText, stockSearchActive]);

  async function toggleAlerts(enabled: boolean) {
    const permitted = enabled ? await ensureNotificationPermission() : true;
    const next = { ...alertSettings, enabled: enabled && permitted };
    setAlertSettings(next);
    await saveKeywordAlertSettings(next);
  }

  async function saveKeywords() {
    const keywords = parseKeywordInput(keywordText);
    const next = {
      ...alertSettings,
      keywords: keywords.length > 0 ? keywords : defaultAlertSettings.keywords,
    };
    setAlertSettings(next);
    setKeywordText(isDefaultAlertKeywordList(next.keywords) ? '' : next.keywords.join(', '));
    await saveKeywordAlertSettings(next);
  }

  async function searchStockNews() {
    const query = stockSearchText.trim();
    if (!query || stockSearchLoading) return;

    const sessionId = stockSearchSessionRef.current + 1;
    stockSearchSessionRef.current = sessionId;
    if (stockSearchTimeoutRef.current) {
      clearTimeout(stockSearchTimeoutRef.current);
    }
    stockSearchTimeoutRef.current = setTimeout(() => {
      if (stockSearchSessionRef.current === sessionId) {
        stockSearchSessionRef.current += 1;
        setStockSearchLoading(false);
        setStockSearchError('The news search took too long. Please try again.');
      }
    }, STOCK_SEARCH_UI_TIMEOUT_MS);

    try {
      setStockSearchError(undefined);
      setStockSearchLoading(true);
      setStockSearchResults([]);
      setStockSearchResolution(undefined);
      const result = await Promise.race<StockNewsSearchResult>([
        fetchGlobalStockNews(query),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('The news search took too long. Please try again.')), STOCK_SEARCH_UI_TIMEOUT_MS);
        }),
      ]);
      if (stockSearchSessionRef.current !== sessionId) return;
      setStockSearchResults(result.articles);
      setStockSearchResolution(result.resolution);
      setCategoryFilter('All');
      setFilter('All');
      setStockSearchModalOpen(false);
    } catch (err) {
      if (stockSearchSessionRef.current === sessionId) {
        setStockSearchError(err instanceof Error ? err.message : 'Could not search stock news');
      }
    } finally {
      if (stockSearchSessionRef.current === sessionId) {
        if (stockSearchTimeoutRef.current) {
          clearTimeout(stockSearchTimeoutRef.current);
          stockSearchTimeoutRef.current = undefined;
        }
        setStockSearchLoading(false);
      }
    }
  }

  function clearStockNewsSearch() {
    stockSearchSessionRef.current += 1;
    if (stockSearchTimeoutRef.current) {
      clearTimeout(stockSearchTimeoutRef.current);
      stockSearchTimeoutRef.current = undefined;
    }
    setStockSearchResults([]);
    setStockSearchResolution(undefined);
    setStockSearchError(undefined);
    setStockSearchLoading(false);
    setStockSearchModalOpen(false);
  }

  function selectCategoryFilter(nextFilter: NewsCategoryFilter) {
    clearStockNewsSearch();
    setCategoryFilter(nextFilter);
  }

  function selectSourceFilter(nextFilter: ArticleFilter) {
    clearStockNewsSearch();
    setFilter(nextFilter);
  }

  async function toggleReadFeed() {
    if (readingFeed) {
      await Speech.stop();
      setReadingFeed(false);
      setReadingPaused(false);
      setReadingArticleId(undefined);
      return;
    }

    const headlines = filtered;
    if (headlines.length === 0) return;

    const sessionId = readingSessionRef.current + 1;
    readingSessionRef.current = sessionId;
    await Speech.stop();
    setReadingFeed(true);
    setReadingPaused(false);
    speakHeadlinesSequentially(
      headlines,
      filter,
      categoryFilter,
      (article, index) => {
        setReadingArticleId(article?.id);
        if (article) {
          listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 });
        }
      },
      () => readingSessionRef.current === sessionId,
      () => {
        if (readingSessionRef.current === sessionId) {
          setReadingFeed(false);
          setReadingPaused(false);
          setReadingArticleId(undefined);
        }
      }
    );
  }

  async function stopReading() {
    readingSessionRef.current += 1;
    await Speech.stop();
    setReadingFeed(false);
    setReadingPaused(false);
    setReadingArticleId(undefined);
  }

  async function togglePauseReading() {
    if (!readingFeed) return;

    try {
      if (readingPaused) {
        await Speech.resume();
        setReadingPaused(false);
      } else {
        await Speech.pause();
        setReadingPaused(true);
      }
    } catch {
      setReadingPaused(false);
    }
  }

  async function toggleFavorite(article: Article) {
    const next = favoriteIds.has(article.id)
      ? favorites.filter(item => item.id !== article.id)
      : [article, ...favorites];
    setFavorites(next);
    await saveFavorites(next);
  }

  async function openArticle(article: Article) {
    readingSessionRef.current += 1;
    await Speech.stop();
    setReadingFeed(false);
    setReadingPaused(false);
    setReadingArticleId(undefined);

    router.push({
      pathname: '/article',
      params: {
        title: article.title,
        url: article.url,
        source: article.source,
      },
    });
  }

  if (loading) return <LoadingView />;
  if (error && articles.length === 0) return <ErrorView message={error} onRetry={() => refresh(false)} />;

  return (
    <View style={[styles.container, { backgroundColor: dark ? '#0B0D12' : '#F5F7FA' }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: dark ? '#20252E' : '#E3E7ED' }]}>
        <View style={styles.titleRow}>
          <View style={styles.brandRow}>
            <View style={[styles.logoShell, { backgroundColor: dark ? '#111827' : '#FFFFFF', borderColor: dark ? '#2A2F38' : '#DDE3EA' }]}>
              <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
            </View>
            <View>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.title, { color: dark ? '#F5F7FA' : '#111827' }]}>MarketPulse</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerFilters}>
          <FilterBar selected={filter} onSelect={selectSourceFilter} />
          <FilterBar selected={categoryFilter} onSelect={selectCategoryFilter} variant="category" />
        </View>

        <View style={styles.audioControlRow}>
          <Pressable
            onPress={toggleReadFeed}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Read ${filtered.length} shown headlines`}
            style={[styles.readButton, {
              backgroundColor: readingFeed ? '#0A84FF' : '#147BFF',
              borderColor: readingFeed ? '#0A84FF' : '#147BFF'
            }]}
          >
            <Text style={styles.readButtonText}>
              Read
            </Text>
          </Pressable>
          <Pressable
            onPress={togglePauseReading}
            disabled={!readingFeed}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${readingPaused ? 'Resume' : 'Pause'} reading headlines`}
            style={[styles.pauseReadButton, {
              opacity: readingFeed ? 1 : 0.58,
              borderColor: '#F59E0B',
              backgroundColor: '#F59E0B'
            }]}
          >
            <Text style={styles.pauseReadButtonText}>{readingPaused ? 'Resume' : 'Pause'}</Text>
          </Pressable>
          <Pressable
            onPress={stopReading}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Stop reading headlines"
            style={[styles.stopReadButton, {
              opacity: readingFeed ? 1 : 0.78,
              borderColor: '#EF4444',
              backgroundColor: '#EF4444'
            }]}
          >
            <Text style={styles.stopReadButtonText}>Stop</Text>
          </Pressable>
          <Text style={[styles.audioCount, { color: dark ? '#8F98A8' : '#667085' }]} numberOfLines={1}>
            {filtered.length} shown
          </Text>
        </View>

        <View style={styles.newsSearchRow}>
          <Pressable
            onPress={() => setNewsSearchModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open news keyword search"
            style={[styles.newsSearchButton, { backgroundColor: tintColor }]}
          >
            <Text numberOfLines={1} style={styles.newsSearchButtonText}>
              {searchText ? `News Search: ${searchText}` : 'Search News'}
            </Text>
          </Pressable>
          {searchText ? (
            <Pressable
              onPress={() => setSearchText('')}
              accessibilityRole="button"
              accessibilityLabel="Clear news keyword search"
              style={[styles.newsSearchClearButton, { borderColor: dark ? '#2A2F38' : '#DDE3EA', backgroundColor: dark ? '#171B22' : '#FFFFFF' }]}
            >
              <Text style={[styles.newsSearchClearText, { color: dark ? '#DDE3ED' : '#374151' }]}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={() => setKeywordAlertModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open keyword news alert settings"
          style={[styles.keywordAlertButton, { backgroundColor: tintColor }]}
        >
          <Text numberOfLines={1} style={styles.keywordAlertButtonText}>
            {alertSettings.enabled ? 'Keyword News Alert: On' : 'Keyword News Alert'}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.stockSearchBar, { backgroundColor: dark ? '#0B0D12' : '#F5F7FA', borderBottomColor: dark ? '#20252E' : '#E3E7ED' }]}>
        <Pressable
          onPress={() => setStockSearchModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open global stock news search"
          style={[styles.stockSearchButton, { backgroundColor: tintColor }]}
        >
          <Text style={styles.stockSearchButtonText}>
            {stockSearchActive ? `Stock Results: ${stockSearchResults.length}` : 'Global Stock Search'}
          </Text>
        </Pressable>
        {stockSearchActive || stockSearchLoading ? (
          <Pressable
            onPress={clearStockNewsSearch}
            accessibilityRole="button"
            accessibilityLabel="Clear global stock news search"
            style={[styles.stockSearchClearButton, {
              backgroundColor: dark ? '#171B22' : '#FFFFFF',
              borderColor: dark ? '#2A2F38' : '#DDE3EA'
            }]}
          >
            <Text style={[styles.stockSearchClearText, { color: dark ? '#DDE3ED' : '#374151' }]}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.inlineError}>Some sources failed: {error}</Text> : null}
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={item => item.id}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 }), 250);
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} />}
        ListEmptyComponent={<EmptyView title="No articles for this filter." />}
        renderItem={({ item }) => (
          <ArticleRow
            article={item}
            isFavorite={favoriteIds.has(item.id)}
            onOpen={() => openArticle(item)}
            onToggleFavorite={() => toggleFavorite(item)}
            highlightText={searchText}
            isReading={readingArticleId === item.id}
          />
        )}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
      />
      <Modal visible={stockSearchModalOpen} transparent animationType="fade" onRequestClose={() => setStockSearchModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.stockModalBackdrop}>
          <Pressable style={styles.stockModalDismiss} onPress={() => setStockSearchModalOpen(false)} />
          <View style={[styles.stockModalCard, { backgroundColor: dark ? '#0B0D12' : '#F5F7FA' }]}>
            <View style={styles.stockModalHeader}>
              <Text style={[styles.stockModalTitle, { color: dark ? '#F5F7FA' : '#111827' }]}>Stock News Search</Text>
              <Pressable onPress={() => setStockSearchModalOpen(false)} hitSlop={10}>
                <Text style={[styles.stockModalClose, { color: dark ? '#DDE3ED' : '#374151' }]}>Close</Text>
              </Pressable>
            </View>
            <StockSearchPanel
              value={stockSearchText}
              active={stockSearchActive}
              loading={stockSearchLoading}
              resultCount={stockSearchResults.length}
              resolvedSymbol={stockSearchResolution?.symbol}
              error={stockSearchError}
              onChangeText={setStockSearchText}
              onSearch={searchStockNews}
              onClear={clearStockNewsSearch}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={newsSearchModalOpen} transparent animationType="fade" onRequestClose={() => setNewsSearchModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.newsModalBackdrop}>
          <Pressable style={styles.newsModalDismiss} onPress={() => setNewsSearchModalOpen(false)} />
          <View style={[styles.newsModalCard, { backgroundColor: dark ? '#151922' : '#FFFFFF', borderColor: dark ? '#2A2F38' : '#DDE3EA' }]}>
            <View style={[styles.newsModalHeader, { borderBottomColor: dark ? '#2A2F38' : '#E3E7ED' }]}>
              <Text style={[styles.newsModalTitle, { color: dark ? '#F5F7FA' : '#111827' }]}>Search News</Text>
              <Pressable onPress={() => setNewsSearchModalOpen(false)} hitSlop={10}>
                <Text style={[styles.newsModalClose, { color: dark ? '#DDE3ED' : '#374151' }]}>Close</Text>
              </Pressable>
            </View>
            <View style={styles.newsModalBody}>
              <View style={[styles.newsModalInputShell, { backgroundColor: dark ? '#0F131A' : '#F8FAFC', borderColor: dark ? '#394150' : '#D4D8E0' }]}>
                <TextInput
                  style={[styles.newsModalInput, { color: dark ? '#F5F7FA' : '#111827' }]}
                  placeholder="Company, market, keyword..."
                  placeholderTextColor={dark ? '#697386' : '#9AA3AF'}
                  value={searchText}
                  onChangeText={setSearchText}
                  onSubmitEditing={() => setNewsSearchModalOpen(false)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>
              <View style={styles.newsModalActions}>
                <Pressable
                  onPress={() => setSearchText('')}
                  style={[styles.newsModalSecondaryButton, { borderColor: dark ? '#394150' : '#D4D8E0' }]}
                >
                  <Text style={[styles.newsModalSecondaryText, { color: dark ? '#DDE3ED' : '#374151' }]}>Clear</Text>
                </Pressable>
                <Pressable
                  onPress={() => setNewsSearchModalOpen(false)}
                  style={[styles.newsModalPrimaryButton, { backgroundColor: tintColor }]}
                >
                  <Text style={styles.newsModalPrimaryText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={keywordAlertModalOpen} transparent animationType="fade" onRequestClose={() => setKeywordAlertModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keywordModalBackdrop}>
          <Pressable style={styles.keywordModalDismiss} onPress={() => setKeywordAlertModalOpen(false)} />
          <View style={[styles.keywordModalCard, { backgroundColor: dark ? '#151922' : '#FFFFFF', borderColor: dark ? '#2A2F38' : '#DDE3EA' }]}>
            <View style={[styles.keywordModalHeader, { borderBottomColor: dark ? '#2A2F38' : '#E3E7ED' }]}>
              <View>
                <Text style={[styles.keywordModalTitle, { color: dark ? '#F5F7FA' : '#111827' }]}>Keyword News Alert</Text>
                <Text style={[styles.keywordModalSubtitle, { color: dark ? '#8F98A8' : '#667085' }]}>Notify on matches</Text>
              </View>
              <Pressable onPress={() => setKeywordAlertModalOpen(false)} hitSlop={10}>
                <Text style={[styles.keywordModalClose, { color: dark ? '#DDE3ED' : '#374151' }]}>Close</Text>
              </Pressable>
            </View>
            <View style={styles.keywordModalBody}>
              <View style={styles.keywordModalToggleRow}>
                <Text style={[styles.keywordModalToggleText, { color: dark ? '#F5F7FA' : '#111827' }]}>Notifications</Text>
                <Switch
                  value={alertSettings.enabled}
                  onValueChange={toggleAlerts}
                  trackColor={{ false: dark ? '#394150' : '#D4D8E0', true: '#84C5FF' }}
                  thumbColor={alertSettings.enabled ? '#0A84FF' : dark ? '#8F98A8' : '#FFFFFF'}
                />
              </View>
              <TextInput
                style={[styles.keywordModalInput, {
                  color: dark ? '#F5F7FA' : '#111827',
                  borderColor: dark ? '#394150' : '#D4D8E0',
                  backgroundColor: dark ? '#0F131A' : '#F8FAFC'
                }]}
                value={keywordText}
                onChangeText={setKeywordText}
                onBlur={saveKeywords}
                onSubmitEditing={saveKeywords}
                placeholder={defaultAlertKeywords.join(', ')}
                placeholderTextColor={dark ? '#697386' : '#9AA3AF'}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <Pressable
                onPress={async () => {
                  await saveKeywords();
                  setKeywordAlertModalOpen(false);
                }}
                style={[styles.keywordModalDoneButton, { backgroundColor: tintColor }]}
              >
                <Text style={styles.keywordModalDoneText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerFilters: { marginHorizontal: -16, marginTop: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logoShell: { width: 42, height: 42, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo: { width: 34, height: 34, borderRadius: 7 },
  title: { fontSize: 30, fontWeight: '800', flexShrink: 1 },
  audioControlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  readButton: { flex: 1, borderWidth: 1, borderRadius: 8, minHeight: 42, paddingHorizontal: 10, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', shadowColor: '#0A84FF', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  readButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  stopReadButton: { flex: 1, borderWidth: 1, borderRadius: 8, minHeight: 42, paddingHorizontal: 10, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', shadowColor: '#111827', shadowOpacity: 0.1, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  stopReadButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  pauseReadButton: { flex: 1, borderWidth: 1, borderRadius: 8, minHeight: 42, paddingHorizontal: 10, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', shadowColor: '#F59E0B', shadowOpacity: 0.14, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  pauseReadButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  audioCount: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '700' },
  countBadge: { borderWidth: 1, borderRadius: 8, minWidth: 72, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  countValue: { fontSize: 18, fontWeight: '800' },
  countLabel: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  newsSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  newsSearchButton: { flex: 1, borderRadius: 8, height: 42, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  newsSearchButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  newsSearchClearButton: { borderWidth: 1, borderRadius: 8, height: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  newsSearchClearText: { fontSize: 12, fontWeight: '800' },
  keywordAlertButton: { borderRadius: 8, minHeight: 42, marginTop: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  keywordAlertButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  stockSearchBar: { minHeight: 54, borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockSearchButton: { flex: 1, minHeight: 38, borderRadius: 8, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  stockSearchButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  stockSearchClearButton: { minHeight: 38, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  stockSearchClearText: { fontSize: 12, fontWeight: '800' },
  stockModalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.42)', justifyContent: 'center', padding: 16 },
  stockModalDismiss: { ...StyleSheet.absoluteFillObject },
  stockModalCard: { borderRadius: 8, overflow: 'hidden' },
  stockModalHeader: { minHeight: 50, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stockModalTitle: { fontSize: 16, fontWeight: '800' },
  stockModalClose: { fontSize: 13, fontWeight: '800' },
  newsModalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.42)', justifyContent: 'center', padding: 16 },
  newsModalDismiss: { ...StyleSheet.absoluteFillObject },
  newsModalCard: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  newsModalHeader: { minHeight: 50, borderBottomWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newsModalTitle: { fontSize: 16, fontWeight: '800' },
  newsModalClose: { fontSize: 13, fontWeight: '800' },
  newsModalBody: { padding: 14 },
  newsModalInputShell: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  newsModalInput: { minHeight: 44, fontSize: 15, fontWeight: '700' },
  newsModalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  newsModalSecondaryButton: { borderWidth: 1, borderRadius: 8, minHeight: 40, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  newsModalSecondaryText: { fontSize: 12, fontWeight: '800' },
  newsModalPrimaryButton: { borderRadius: 8, minHeight: 40, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  newsModalPrimaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  keywordModalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.42)', justifyContent: 'center', padding: 16 },
  keywordModalDismiss: { ...StyleSheet.absoluteFillObject },
  keywordModalCard: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  keywordModalHeader: { minHeight: 58, borderBottomWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  keywordModalTitle: { fontSize: 16, fontWeight: '800' },
  keywordModalSubtitle: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  keywordModalClose: { fontSize: 13, fontWeight: '800' },
  keywordModalBody: { padding: 14 },
  keywordModalToggleRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  keywordModalToggleText: { fontSize: 14, fontWeight: '800' },
  keywordModalInput: { borderWidth: 1, borderRadius: 8, minHeight: 44, paddingHorizontal: 12, fontSize: 13, fontWeight: '700' },
  keywordModalDoneButton: { borderRadius: 8, minHeight: 40, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  keywordModalDoneText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  list: { paddingTop: 14, paddingBottom: 24 },
  emptyList: { flexGrow: 1 },
  inlineError: { color: '#D92D20', paddingHorizontal: 16, marginBottom: 8, fontSize: 13, fontWeight: '700' }
});

function isDefaultAlertKeywordList(keywords: string[]): boolean {
  const normalizedKeywords = keywords.map(keyword => keyword.toLowerCase()).sort().join('|');
  const normalizedDefaults = defaultAlertKeywords.map(keyword => keyword.toLowerCase()).sort().join('|');
  return normalizedKeywords === normalizedDefaults;
}

function createFeedSpeechIntro(filter: ArticleFilter, categoryFilter: NewsCategoryFilter): string {
  const sourceIntro = filter === 'All' ? 'all news feeds' : `${filter} news`;
  const categoryIntro = categoryFilter === 'All' ? '' : ` in ${categoryFilter}`;
  return `MarketPulse headlines from ${sourceIntro}${categoryIntro}.`;
}

function speakHeadlinesSequentially(
  articles: Article[],
  filter: ArticleFilter,
  categoryFilter: NewsCategoryFilter,
  onActiveArticle: (article: Article | undefined, index: number) => void,
  isActive: () => boolean,
  onFinished: () => void
): void {
  const entries: Array<{ text: string; language: string; article?: Article; articleIndex?: number }> = [
    { text: createFeedSpeechIntro(filter, categoryFilter), language: 'en-US' },
    ...articles.map((article, index) => ({
      text: `${index + 1}. ${article.title}`,
      language: getTextSpeechLanguage(article.title),
      article,
      articleIndex: index,
    })),
  ];
  let index = 0;

  const speakNext = () => {
    if (!isActive()) return;

    const entry = entries[index];
    if (!entry) {
      onFinished();
      return;
    }

    index += 1;
    onActiveArticle(entry.article, entry.articleIndex ?? -1);
    Speech.speak(entry.text, {
      language: entry.language,
      pitch: 1,
      rate: 0.72,
      onDone: () => {
        setTimeout(() => {
          if (isActive()) {
            speakNext();
          }
        }, 160);
      },
      onStopped: onFinished,
      onError: onFinished,
    });
  };

  speakNext();
}

function getTextSpeechLanguage(text: string): string {
  return /[\u3400-\u9FFF]/.test(text) ? 'zh-CN' : 'en-US';
}
