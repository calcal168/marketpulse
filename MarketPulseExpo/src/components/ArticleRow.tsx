import { Article } from '@/models/Article';
import { summarizeArticle } from '@/services/articleSummary';
import { formatRelativeDate } from '@/services/date';
import { translateTextToChinese } from '@/services/translate';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { tintColor } from '@/theme/colors';

type Props = {
  article: Article;
  isFavorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  highlightText?: string;
  isReading?: boolean;
};

export function ArticleRow({ article, isFavorite, onOpen, onToggleFavorite, highlightText, isReading = false }: Props) {
  const dark = useColorScheme() === 'dark';
  const [translatedTitle, setTranslatedTitle] = useState<string>();
  const [translatedSummary, setTranslatedSummary] = useState<string>();
  const [translating, setTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const displayTitle = showTranslation ? translatedTitle ?? article.title : article.title;
  const displaySummary = showTranslation ? translatedSummary ?? article.summary : article.summary;
  const articleSummary = useMemo(() => summarizeArticle(article), [article]);
  const host = getHost(article.url);

  useEffect(() => {
    setTranslatedTitle(undefined);
    setTranslatedSummary(undefined);
    setTranslating(false);
    setShowTranslation(false);
    setShowSummary(false);
  }, [article.id]);

  async function shareArticle() {
    await Share.share({
      title: article.title,
      message: `${article.title}\n\n${article.url}`,
      url: article.url,
    });
  }

  async function toggleTranslation() {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }

    if (translatedTitle || translating) {
      setShowTranslation(true);
      return;
    }

    try {
      setTranslating(true);
      const [nextTitle, nextSummary] = await Promise.all([
        translateTextToChinese(article.title),
        article.summary ? translateTextToChinese(article.summary) : Promise.resolve(undefined),
      ]);
      setTranslatedTitle(nextTitle);
      setTranslatedSummary(nextSummary);
      setShowTranslation(true);
    } finally {
      setTranslating(false);
    }
  }

  const renderHighlightedTitle = () => {
    if (!highlightText || !displayTitle.toLowerCase().includes(highlightText.toLowerCase())) {
      return <Text style={[styles.title, { color: dark ? '#F5F7FA' : '#111827' }]}>{displayTitle}</Text>;
    }

    const escaped = highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = displayTitle.split(regex);

    return (
      <Text style={[styles.title, { color: dark ? '#F5F7FA' : '#111827' }]}>
        {parts.map((part, index) =>
          part.toLowerCase() === highlightText.toLowerCase() ? (
            <Text key={index} style={{ backgroundColor: dark ? '#FACC15' : '#FEF08A', color: '#111827' }}>{part}</Text>
          ) : (
            <Text key={index}>{part}</Text>
          )
        )}
      </Text>
    );
  };

  return (
    <View style={[styles.card, {
      backgroundColor: isReading ? dark ? '#1D2430' : '#EAF4FF' : dark ? '#16181D' : '#FFFFFF',
      borderColor: isReading ? tintColor : dark ? '#2A2F38' : '#E6E8EC'
    }]}>
      <Pressable onPress={onOpen}>
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <View style={[styles.sourceBadge, { backgroundColor: dark ? '#1E293B' : '#EEF6FF' }]}>
              <Text style={[styles.source, { color: dark ? '#93C5FD' : tintColor }]} numberOfLines={1}>{article.source}</Text>
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: dark ? '#222018' : '#FFF7E6' }]}>
              <Text style={[styles.category, { color: dark ? '#FACC15' : '#92400E' }]} numberOfLines={1}>{article.category}</Text>
            </View>
          </View>
          <Text style={[styles.time, { color: dark ? '#8F98A8' : '#6B7280' }]}>{formatRelativeDate(article.publishedAt)}</Text>
        </View>

        {isReading ? (
          <Text style={[styles.title, styles.readingTitle, { color: dark ? '#FFFFFF' : '#0F172A' }]}>{displayTitle}</Text>
        ) : renderHighlightedTitle()}

        {displaySummary ? (
          <Text numberOfLines={2} style={[styles.summary, { color: dark ? '#B8C0CC' : '#4B5563' }]}>{displaySummary}</Text>
        ) : null}

        <Text numberOfLines={1} style={[styles.link, { color: dark ? '#8F98A8' : '#6B7280' }]}>{host}</Text>
      </Pressable>

      {showSummary ? (
        <View style={[styles.summaryPanel, { backgroundColor: dark ? '#111827' : '#F8FAFC', borderColor: dark ? '#2A2F38' : '#E1E7EF' }]}>
          <Text style={[styles.summaryPanelTitle, { color: dark ? '#F5F7FA' : '#111827' }]}>AI-style summary</Text>
          {articleSummary.bullets.map((bullet, index) => (
            <View key={`${article.id}-summary-${index}`} style={styles.summaryBulletRow}>
              <Text style={[styles.summaryDot, { color: tintColor }]}>•</Text>
              <Text style={[styles.summaryBullet, { color: dark ? '#DDE3ED' : '#374151' }]}>{bullet}</Text>
            </View>
          ))}
          <Text style={[styles.whyItMatters, { color: dark ? '#B8C0CC' : '#4B5563' }]}>{articleSummary.whyItMatters}</Text>
          {articleSummary.relatedTerms.length > 0 ? (
            <Text style={[styles.relatedTerms, { color: dark ? '#8F98A8' : '#667085' }]}>
              Related: {articleSummary.relatedTerms.join(', ')}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => setShowSummary(value => !value)}
          hitSlop={8}
          style={[styles.actionButton, {
            backgroundColor: showSummary ? tintColor : 'transparent',
            borderColor: showSummary ? tintColor : dark ? '#394150' : '#D4D8E0'
          }]}
        >
          <Text style={[styles.actionText, { color: showSummary ? '#FFFFFF' : dark ? '#DDE3ED' : '#374151' }]}>
            Summary
          </Text>
        </Pressable>
        <Pressable
          onPress={toggleTranslation}
          disabled={translating}
          hitSlop={8}
          style={[styles.actionButton, {
            opacity: translating ? 0.6 : 1,
            backgroundColor: showTranslation ? tintColor : 'transparent',
            borderColor: showTranslation ? tintColor : dark ? '#394150' : '#D4D8E0'
          }]}
        >
          <Text style={[styles.actionText, { color: showTranslation ? '#FFFFFF' : dark ? '#DDE3ED' : '#374151' }]}>
            {translating ? 'Translating' : showTranslation ? 'Original' : 'Translate'}
          </Text>
        </Pressable>
        <Pressable
          onPress={shareArticle}
          hitSlop={8}
          style={[styles.actionButton, { borderColor: dark ? '#394150' : '#D4D8E0' }]}
        >
          <Text style={[styles.actionText, { color: dark ? '#DDE3ED' : '#374151' }]}>Share</Text>
        </Pressable>
        <Pressable
          onPress={onToggleFavorite}
          hitSlop={8}
          style={[styles.actionButton, {
            backgroundColor: isFavorite ? tintColor : 'transparent',
            borderColor: isFavorite ? tintColor : dark ? '#394150' : '#D4D8E0'
          }]}
        >
          <Text style={[styles.actionText, { color: isFavorite ? '#FFFFFF' : dark ? '#DDE3ED' : '#374151' }]}>
            {isFavorite ? 'Saved' : 'Save'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function getHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    borderWidth: 1
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 9 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  sourceBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, maxWidth: '50%' },
  categoryBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, maxWidth: '46%' },
  source: { fontSize: 12, fontWeight: '800' },
  category: { fontSize: 12, fontWeight: '800' },
  time: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  readingTitle: { backgroundColor: '#FEF08A' },
  summary: { marginTop: 7, fontSize: 13, lineHeight: 19 },
  link: { marginTop: 12, fontSize: 12, fontWeight: '600' },
  summaryPanel: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 12 },
  summaryPanelTitle: { fontSize: 13, fontWeight: '800', marginBottom: 7 },
  summaryBulletRow: { flexDirection: 'row', gap: 7, alignItems: 'flex-start', marginTop: 4 },
  summaryDot: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
  summaryBullet: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  whyItMatters: { fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 9 },
  relatedTerms: { fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 7 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  actionButton: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, minWidth: 58, alignItems: 'center' },
  actionText: { fontSize: 12, fontWeight: '800' }
});
