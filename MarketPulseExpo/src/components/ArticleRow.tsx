import { Article } from '@/models/Article';
import { formatRelativeDate } from '@/services/date';
import { Pressable, Share, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { tintColor } from '@/theme/colors';

type Props = {
  article: Article;
  isFavorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  highlightText?: string;
};

export function ArticleRow({ article, isFavorite, onOpen, onToggleFavorite, highlightText }: Props) {
  const dark = useColorScheme() === 'dark';
  const displayTitle = article.title;
  const displaySummary = article.summary;
  const host = getHost(article.url);

  async function shareArticle() {
    await Share.share({
      title: article.title,
      message: `${article.title}\n\n${article.url}`,
      url: article.url,
    });
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
    <View style={[styles.card, { backgroundColor: dark ? '#16181D' : '#FFFFFF', borderColor: dark ? '#2A2F38' : '#E6E8EC' }]}>
      <Pressable onPress={onOpen}>
        <View style={styles.header}>
          <View style={[styles.sourceBadge, { backgroundColor: dark ? '#1E293B' : '#EEF6FF' }]}>
            <Text style={[styles.source, { color: dark ? '#93C5FD' : tintColor }]} numberOfLines={1}>{article.source}</Text>
          </View>
          <Text style={[styles.time, { color: dark ? '#8F98A8' : '#6B7280' }]}>{formatRelativeDate(article.publishedAt)}</Text>
        </View>

        {renderHighlightedTitle()}

        {displaySummary ? (
          <Text numberOfLines={2} style={[styles.summary, { color: dark ? '#B8C0CC' : '#4B5563' }]}>{displaySummary}</Text>
        ) : null}

        <Text numberOfLines={1} style={[styles.link, { color: dark ? '#8F98A8' : '#6B7280' }]}>{host}</Text>
      </Pressable>

      <View style={styles.actions}>
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
  sourceBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, maxWidth: '62%' },
  source: { fontSize: 12, fontWeight: '800' },
  time: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  summary: { marginTop: 7, fontSize: 13, lineHeight: 19 },
  link: { marginTop: 12, fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  actionButton: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, minWidth: 58, alignItems: 'center' },
  actionText: { fontSize: 12, fontWeight: '800' }
});
