import { MarketBrief } from '@/models/MarketBrief';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { tintColor } from '@/theme/colors';

type Props = {
  brief?: MarketBrief;
  loading: boolean;
  error?: string;
  onGenerate: () => void;
};

export function MarketBriefPanel({ brief, loading, error, onGenerate }: Props) {
  const dark = useColorScheme() === 'dark';

  return (
    <View style={[styles.panel, { backgroundColor: dark ? '#171B22' : '#FFFFFF', borderColor: dark ? '#2A2F38' : '#DDE3EA' }]}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={[styles.title, { color: dark ? '#F5F7FA' : '#111827' }]}>AI Market Brief</Text>
          <Text style={[styles.subtitle, { color: dark ? '#8F98A8' : '#667085' }]}>
            {brief ? `${brief.mode === 'ai' ? 'AI' : 'Local'} summary` : 'Summarize hottest stories'}
          </Text>
        </View>
        <Pressable onPress={onGenerate} disabled={loading} style={[styles.button, { opacity: loading ? 0.65 : 1 }]}>
          <Text style={styles.buttonText}>{loading ? 'Thinking...' : brief ? 'Refresh' : 'Generate'}</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {brief ? (
        <View style={styles.body}>
          <Text style={[styles.headline, { color: dark ? '#F5F7FA' : '#111827' }]}>{brief.headline}</Text>
          <Text style={[styles.summary, { color: dark ? '#B8C0CC' : '#4B5563' }]}>{brief.summary}</Text>
          <InfoRow label="Themes" values={brief.themes} dark={dark} />
          <InfoRow label="Watch" values={brief.watchlist} dark={dark} />
          {brief.whyItMatters.slice(0, 2).map((item, index) => (
            <Text key={index} style={[styles.bullet, { color: dark ? '#DDE3ED' : '#374151' }]}>- {item}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function InfoRow({ label, values, dark }: { label: string; values: string[]; dark: boolean }) {
  if (values.length === 0) return null;

  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: dark ? '#8F98A8' : '#667085' }]}>{label}</Text>
      <Text style={[styles.infoText, { color: dark ? '#DDE3ED' : '#374151' }]} numberOfLines={2}>
        {values.join(', ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 8, padding: 12, marginHorizontal: 16, marginTop: 14, marginBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  titleGroup: { flex: 1 },
  title: { fontSize: 14, fontWeight: '800' },
  subtitle: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  button: { backgroundColor: tintColor, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, minWidth: 82, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  body: { marginTop: 10, gap: 7 },
  headline: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
  summary: { fontSize: 13, lineHeight: 18 },
  infoRow: { flexDirection: 'row', gap: 8 },
  infoLabel: { width: 48, fontSize: 12, fontWeight: '800' },
  infoText: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  bullet: { fontSize: 12, lineHeight: 17 },
  error: { color: '#D92D20', fontSize: 12, fontWeight: '700', marginTop: 8 }
});
