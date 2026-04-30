import { ArticleFilter } from '@/models/NewsSource';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { tintColor } from '@/theme/colors';

const filters: ArticleFilter[] = ['All', 'Yahoo', 'Bloomberg'];

type Props = {
  selected: ArticleFilter;
  onSelect: (filter: ArticleFilter) => void;
};

export function FilterBar({ selected, onSelect }: Props) {
  const dark = useColorScheme() === 'dark';

  return (
    <View style={styles.container}>
      {filters.map(filter => {
        const active = filter === selected;
        return (
          <Pressable
            key={filter}
            onPress={() => onSelect(filter)}
            style={[styles.pill, { backgroundColor: active ? tintColor : dark ? '#2C2C2E' : '#E5E7EB' }]}
          >
            <Text style={[styles.label, { color: active ? '#FFFFFF' : dark ? '#FFFFFF' : '#111827' }]}>{filter}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  pill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  label: { fontWeight: '700' }
});
