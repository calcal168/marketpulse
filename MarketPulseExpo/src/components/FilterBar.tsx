import { ArticleFilter } from '@/models/NewsSource';
import { NewsCategoryFilter } from '@/models/NewsCategory';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { tintColor } from '@/theme/colors';
import { useState } from 'react';

const sourceFilters: ArticleFilter[] = ['All', 'Yahoo', 'Yahoo Finance', 'Nasdaq', 'Sina Finance', 'Eastmoney', 'Tencent Finance', 'NetEase Finance', '36Kr', 'Moomoo/Futu', 'BBC', 'BBC中文', 'CNA', '新浪', 'AlJazeera', 'Google News'];
const categoryFilters: NewsCategoryFilter[] = ['All', 'Political', 'Financial', 'Economic', 'People', 'Health', 'Tech'];

type Props<T extends string> = {
  selected: T;
  onSelect: (filter: T) => void;
  variant?: 'source' | 'category';
};

export function FilterBar<T extends ArticleFilter | NewsCategoryFilter>({ selected, onSelect, variant = 'source' }: Props<T>) {
  const dark = useColorScheme() === 'dark';
  const [open, setOpen] = useState(false);
  const filters = (variant === 'category' ? categoryFilters : sourceFilters) as T[];
  const label = variant === 'category' ? 'Category' : 'News Feed';

  return (
    <View style={[styles.wrapper, {
      backgroundColor: dark ? '#0B0D12' : '#F5F7FA',
      borderBottomColor: dark ? '#20252E' : '#E3E7ED'
    }]}>
      <View style={styles.row}>
        <Text numberOfLines={1} style={[styles.fieldLabel, { color: dark ? '#8F98A8' : '#667085' }]}>{label}</Text>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Choose ${label.toLowerCase()}`}
          style={[styles.selector, {
            backgroundColor: dark ? '#171B22' : '#FFFFFF',
            borderColor: dark ? '#2A2F38' : '#DDE3EA'
          }]}
        >
          <Text numberOfLines={1} style={[styles.selectedText, { color: dark ? '#F5F7FA' : '#111827' }]}>{selected}</Text>
          <Text style={[styles.chevron, { color: dark ? '#8F98A8' : '#667085' }]}>v</Text>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropDismiss} onPress={() => setOpen(false)} />
          <View style={[styles.menu, {
            backgroundColor: dark ? '#151922' : '#FFFFFF',
            borderColor: dark ? '#2A2F38' : '#DDE3EA'
          }]}
          >
            <View style={[styles.menuHeader, { borderBottomColor: dark ? '#2A2F38' : '#E3E7ED' }]}>
              <Text style={[styles.menuTitle, { color: dark ? '#F5F7FA' : '#111827' }]}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Text style={[styles.closeText, { color: dark ? '#DDE3ED' : '#374151' }]}>Close</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.options}>
              {filters.map(filter => {
                const active = filter === selected;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => {
                      onSelect(filter);
                      setOpen(false);
                    }}
                    style={[styles.option, {
                      backgroundColor: active ? tintColor : dark ? '#0F131A' : '#F8FAFC',
                      borderColor: active ? tintColor : dark ? '#303847' : '#E1E7EF'
                    }]}
                  >
                    <Text style={[styles.optionText, { color: active ? '#FFFFFF' : dark ? '#DDE3ED' : '#374151' }]}>{filter}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { minHeight: 52, justifyContent: 'center', borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldLabel: { width: 74, fontSize: 10, fontWeight: '800', letterSpacing: 0 },
  selector: { flex: 1, minHeight: 38, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectedText: { flex: 1, fontSize: 14, fontWeight: '800' },
  chevron: { fontSize: 13, fontWeight: '900' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.34)', justifyContent: 'center', paddingHorizontal: 20 },
  backdropDismiss: { ...StyleSheet.absoluteFillObject },
  menu: { borderWidth: 1, borderRadius: 8, maxHeight: '72%', overflow: 'hidden' },
  menuHeader: { minHeight: 52, borderBottomWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuTitle: { fontSize: 15, fontWeight: '800' },
  closeText: { fontSize: 13, fontWeight: '800' },
  options: { padding: 10, gap: 8 },
  option: { borderWidth: 1, borderRadius: 8, minHeight: 42, paddingHorizontal: 12, justifyContent: 'center' },
  optionText: { fontSize: 14, fontWeight: '800' }
});
