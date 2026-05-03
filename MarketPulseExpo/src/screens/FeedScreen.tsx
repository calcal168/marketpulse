import { Article } from '@/models/Article';
import { ArticleFilter } from '@/models/NewsSource';
import { MarketBrief } from '@/models/MarketBrief';
import { makeDefaultArticleService } from '@/services/defaultArticleService';
import { generateMarketBrief } from '@/services/marketBriefService';
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
import { MarketBriefPanel } from '@/components/MarketBriefPanel';
import { EmptyView, ErrorView, LoadingView } from '@/components/StateViews';
import { FilterBar } from '@/components/FilterBar';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Switch, Text, TextInput, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const articleService = makeDefaultArticleService();
const defaultAlertSettings: KeywordAlertSettings = {
  enabled: false,
  keywords: ['Nvidia', 'Fed', 'Tesla', '美联储', '台积电', '黄金', '原油'],
};

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
  const [alertSettings, setAlertSettings] = useState<KeywordAlertSettings>(defaultAlertSettings);
  const [keywordText, setKeywordText] = useState(defaultAlertSettings.keywords.join(', '));
  const [marketBrief, setMarketBrief] = useState<MarketBrief | undefined>();
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | undefined>();

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
      const storedAlertSettings = await loadKeywordAlertSettings();

      setArticles(nextArticles);
      setFavorites(storedFavorites);
      setAlertSettings(storedAlertSettings);
      setKeywordText(storedAlertSettings.keywords.join(', '));
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
    setKeywordText(next.keywords.join(', '));
    await saveKeywordAlertSettings(next);
  }

  async function generateBrief() {
    try {
      setBriefError(undefined);
      setBriefLoading(true);
      const brief = await generateMarketBrief(articles);
      setMarketBrief(brief);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'Could not generate brief');
    } finally {
      setBriefLoading(false);
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
    await WebBrowser.openBrowserAsync(article.url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET
    });
  }

  if (loading) return <LoadingView />;
  if (error && articles.length === 0) return <ErrorView message={error} onRetry={() => refresh(false)} />;

  return (
    <View style={[styles.container, { backgroundColor: dark ? '#0B0D12' : '#F5F7FA' }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: dark ? '#20252E' : '#E3E7ED' }]}>
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.kicker, { color: dark ? '#8F98A8' : '#667085' }]}>Market intelligence</Text>
            <Text style={[styles.title, { color: dark ? '#F5F7FA' : '#111827' }]}>MarketPulse</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: dark ? '#171B22' : '#FFFFFF', borderColor: dark ? '#2A2F38' : '#E1E5EA' }]}>
            <Text style={[styles.countValue, { color: dark ? '#F5F7FA' : '#111827' }]}>{filtered.length}</Text>
            <Text style={[styles.countLabel, { color: dark ? '#8F98A8' : '#667085' }]}>shown</Text>
          </View>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: dark ? '#171B22' : '#FFFFFF', borderColor: dark ? '#2A2F38' : '#DDE3EA' }]}>
          <Text style={[styles.searchLabel, { color: dark ? '#8F98A8' : '#667085' }]}>Search</Text>
          <TextInput
            style={[styles.searchInput, { color: dark ? '#F5F7FA' : '#111827' }]}
            placeholder="Company, market, keyword..."
            placeholderTextColor={dark ? '#697386' : '#9AA3AF'}
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: dark ? '#8F98A8' : '#667085' }]}>Source: {filter}</Text>
          <Text style={[styles.metaText, { color: dark ? '#8F98A8' : '#667085' }]}>{favorites.length} saved</Text>
        </View>

        <View style={[styles.alertPanel, { backgroundColor: dark ? '#171B22' : '#FFFFFF', borderColor: dark ? '#2A2F38' : '#DDE3EA' }]}>
          <View style={styles.alertHeader}>
            <View style={styles.alertTitleGroup}>
              <Text style={[styles.alertTitle, { color: dark ? '#F5F7FA' : '#111827' }]}>Keyword alerts</Text>
              <Text style={[styles.alertSubtitle, { color: dark ? '#8F98A8' : '#667085' }]}>Notify on matches</Text>
            </View>
            <Switch
              value={alertSettings.enabled}
              onValueChange={toggleAlerts}
              trackColor={{ false: dark ? '#394150' : '#D4D8E0', true: '#84C5FF' }}
              thumbColor={alertSettings.enabled ? '#0A84FF' : dark ? '#8F98A8' : '#FFFFFF'}
            />
          </View>
          <TextInput
            style={[styles.keywordInput, {
              color: dark ? '#F5F7FA' : '#111827',
              borderColor: dark ? '#394150' : '#D4D8E0',
              backgroundColor: dark ? '#0F131A' : '#F8FAFC'
            }]}
            value={keywordText}
            onChangeText={setKeywordText}
            onBlur={saveKeywords}
            onSubmitEditing={saveKeywords}
            placeholder="Nvidia, Fed, 美联储..."
            placeholderTextColor={dark ? '#697386' : '#9AA3AF'}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <FilterBar selected={filter} onSelect={setFilter} />
      {error ? <Text style={styles.inlineError}>Some sources failed: {error}</Text> : null}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} />}
        ListEmptyComponent={<EmptyView title="No articles for this filter." />}
        ListHeaderComponent={(
          <MarketBriefPanel
            brief={marketBrief}
            loading={briefLoading}
            error={briefError}
            onGenerate={generateBrief}
          />
        )}
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
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  kicker: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0 },
  title: { fontSize: 30, fontWeight: '800', marginTop: 2 },
  countBadge: { borderWidth: 1, borderRadius: 8, minWidth: 72, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  countValue: { fontSize: 18, fontWeight: '800' },
  countLabel: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  searchContainer: { borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 12, marginTop: 12 },
  searchLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0 },
  searchInput: { flex: 1, fontSize: 15, height: 44 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 10 },
  metaText: { fontSize: 12, fontWeight: '700' },
  alertPanel: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 10 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  alertTitleGroup: { flex: 1 },
  alertTitle: { fontSize: 13, fontWeight: '800' },
  alertSubtitle: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  keywordInput: { borderWidth: 1, borderRadius: 6, minHeight: 32, paddingHorizontal: 9, marginTop: 7, fontSize: 12, fontWeight: '600' },
  list: { paddingTop: 14, paddingBottom: 24 },
  emptyList: { flexGrow: 1 },
  inlineError: { color: '#D92D20', paddingHorizontal: 16, marginBottom: 8, fontSize: 13, fontWeight: '700' }
});
