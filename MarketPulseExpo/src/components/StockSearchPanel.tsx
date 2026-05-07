import { Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { tintColor } from '@/theme/colors';

type Props = {
  value: string;
  active: boolean;
  loading: boolean;
  resultCount: number;
  resolvedSymbol?: string;
  error?: string;
  onChangeText: (text: string) => void;
  onSearch: () => void;
  onClear: () => void;
};

export function StockSearchPanel({
  value,
  active,
  loading,
  resultCount,
  resolvedSymbol,
  error,
  onChangeText,
  onSearch,
  onClear,
}: Props) {
  const dark = useColorScheme() === 'dark';

  return (
    <View style={[styles.panel, { backgroundColor: dark ? '#151922' : '#FFFFFF', borderColor: dark ? '#2A2F38' : '#DDE3EA' }]}>
      <View style={styles.headingRow}>
        <View style={styles.headingBlock}>
          <Text style={[styles.eyebrow, { color: dark ? '#8F98A8' : '#667085' }]}>Global stock news</Text>
          <Text style={[styles.title, { color: dark ? '#F5F7FA' : '#111827' }]}>Search by symbol or company name</Text>
        </View>
        {active ? (
          <View style={[styles.resultBadge, { backgroundColor: dark ? '#202631' : '#F2F6FB', borderColor: dark ? '#303847' : '#E1E7EF' }]}>
            <Text style={[styles.resultBadgeText, { color: dark ? '#DDE3ED' : '#344054' }]}>{resultCount}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.inputShell, { backgroundColor: dark ? '#0F131A' : '#F8FAFC', borderColor: dark ? '#394150' : '#D4D8E0' }]}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSearch}
            placeholder="NVDA, Nvidia, 英伟达, 台积电..."
            placeholderTextColor={dark ? '#697386' : '#9AA3AF'}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: dark ? '#F5F7FA' : '#111827' }]}
          />
        </View>
        <Pressable
          onPress={onSearch}
          disabled={loading || value.trim().length === 0}
          style={[styles.button, { opacity: loading || value.trim().length === 0 ? 0.55 : 1, backgroundColor: tintColor }]}
        >
          <Text style={styles.buttonText}>{loading ? 'Searching' : 'Search'}</Text>
        </Pressable>
        {active ? (
          <Pressable
            onPress={onClear}
            style={[styles.clearButton, { borderColor: dark ? '#394150' : '#D4D8E0' }]}
          >
            <Text style={[styles.clearButtonText, { color: dark ? '#DDE3ED' : '#374151' }]}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {active && resolvedSymbol ? (
        <Text style={[styles.statusText, { color: dark ? '#B8C0CC' : '#4B5563' }]}>
          Showing worldwide news for {resolvedSymbol} from global and source-targeted feeds.
        </Text>
      ) : (
        <Text style={[styles.statusText, { color: dark ? '#8F98A8' : '#667085' }]}>
          Searches global and source-targeted stock news feeds.
        </Text>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 8, padding: 14, marginHorizontal: 12, marginBottom: 12 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headingBlock: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0 },
  title: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  resultBadge: { borderWidth: 1, borderRadius: 8, minWidth: 42, minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  resultBadgeText: { fontSize: 14, fontWeight: '800' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  inputShell: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 },
  input: { fontSize: 14, fontWeight: '700', minHeight: 40 },
  button: { borderRadius: 8, minWidth: 74, height: 42, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  clearButton: { borderWidth: 1, borderRadius: 8, minWidth: 60, height: 42, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  clearButtonText: { fontSize: 12, fontWeight: '800' },
  statusText: { fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 10 },
  errorText: { color: '#D92D20', fontSize: 12, fontWeight: '700', marginTop: 8 },
});
