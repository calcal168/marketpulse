import { Article } from '@/models/Article';
import { formatRelativeDate } from '@/services/date';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { tintColor } from '@/theme/colors';

type Props = {
  article: Article;
  isFavorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
};

export function ArticleRow({ article, isFavorite, onOpen, onToggleFavorite }: Props) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  return (
    <Pressable onPress={onOpen} style={[styles.card, { backgroundColor: dark ? '#1C1C1E' : '#FFFFFF' }]}>
      <View style={styles.header}>
        <Text style={[styles.source, { color: tintColor }]}>{article.source}</Text>
        <Text style={[styles.time, { color: dark ? '#A1A1A6' : '#6B7280' }]}>{formatRelativeDate(article.publishedAt)}</Text>
      </View>
      <Text style={[styles.title, { color: dark ? '#FFFFFF' : '#111827' }]}>{article.title}</Text>
      {article.summary ? (
        <Text numberOfLines={3} style={[styles.summary, { color: dark ? '#D1D1D6' : '#4B5563' }]}>{article.summary}</Text>
      ) : null}
      <View style={styles.footer}>
        <Text numberOfLines={1} style={[styles.link, { color: dark ? '#A1A1A6' : '#6B7280' }]}>{article.url}</Text>
        <Pressable onPress={onToggleFavorite} hitSlop={12}>
          <Text style={styles.star}>{isFavorite ? '★' : '☆'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  source: { fontSize: 13, fontWeight: '700' },
  time: { fontSize: 13 },
  title: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  summary: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  link: { flex: 1, fontSize: 12 },
  star: { fontSize: 28, color: tintColor }
});
