import { ArticleFilter } from '@/models/NewsSource';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { tintColor } from '@/theme/colors';

const filters: ArticleFilter[] = ['All', 'Yahoo', 'BBC', 'BBC中文', 'CNA', '新浪', 'AlJazeera'];

type Props = {
  selected: ArticleFilter;
  onSelect: (filter: ArticleFilter) => void;
};

export function FilterBar({ selected, onSelect }: Props) {
  const dark = useColorScheme() === 'dark';

  return (
    <View style={[styles.wrapper, {
      backgroundColor: dark ? '#0B0D12' : '#F5F7FA',
      borderBottomColor: dark ? '#20252E' : '#E3E7ED'
    }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.container}
      >
        {filters.map(filter => {
          const active = filter === selected;
          return (
            <Pressable
              key={filter}
              onPress={() => onSelect(filter)}
              style={[styles.pill, {
                backgroundColor: active ? tintColor : dark ? '#171B22' : '#FFFFFF',
                borderColor: active ? tintColor : dark ? '#2A2F38' : '#E1E5EA'
              }]}
            >
              <Text style={[styles.label, { color: active ? '#FFFFFF' : dark ? '#DDE3ED' : '#374151' }]}>{filter}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { height: 64, justifyContent: 'center', borderBottomWidth: 1, marginBottom: 8 },
  scroller: { flexGrow: 0 },
  container: { gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, alignItems: 'center' },
  pill: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, minHeight: 34, justifyContent: 'center' },
  label: { fontWeight: '800', fontSize: 12 }
});
