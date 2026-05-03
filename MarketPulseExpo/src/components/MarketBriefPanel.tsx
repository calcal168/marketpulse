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
    <View style={[styles.panel, { backgroundColor: dark ? '#151922' : '#FFFFFF', borderColor: dark ? '#2A2F38' : '#DDE3EA' }]}>
      <View style={styles.topBar}>
        <View style={styles.headingBlock}>
          <View style={styles.titleLine}>
          <Text style={[styles.eyebrow, { color: dark ? '#8F98A8' : '#667085' }]}>AI News that Affects the Stock Market</Text>
            {brief ? (
              <View style={[styles.modeChip, { backgroundColor: brief.mode === 'ai' ? '#EAF4FF' : dark ? '#262B35' : '#F2F4F7' }]}>
                <Text style={[styles.modeText, { color: brief.mode === 'ai' ? tintColor : dark ? '#C8D0DD' : '#667085' }]}>
                  {brief.mode === 'ai' ? 'AI' : 'Local'}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.title, { color: dark ? '#F5F7FA' : '#111827' }]}>Market Impact Summary</Text>
        </View>
        <Pressable onPress={onGenerate} disabled={loading} style={[styles.button, { opacity: loading ? 0.65 : 1 }]}>
          <Text style={styles.buttonText}>{loading ? 'Generating' : brief ? 'Refresh' : 'Generate'}</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {brief ? (
        <View style={styles.body}>
          <Text style={[styles.headline, { color: dark ? '#F5F7FA' : '#111827' }]}>{brief.headline}</Text>
          <Text style={[styles.summary, { color: dark ? '#B8C0CC' : '#4B5563' }]}>{brief.summary}</Text>

          <ChipSection label="Key market themes" values={brief.themes} dark={dark} />
          <ChipSection label="Assets and names to watch" values={brief.watchlist} dark={dark} />

          {brief.whyItMatters.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: dark ? '#8F98A8' : '#667085' }]}>Why it matters</Text>
              {brief.whyItMatters.slice(0, 3).map((item, index) => (
                <View key={index} style={styles.reasonRow}>
                  <Text style={[styles.reasonDot, { color: tintColor }]}>•</Text>
                  <Text style={[styles.reasonText, { color: dark ? '#DDE3ED' : '#374151' }]}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={[styles.emptyText, { color: dark ? '#8F98A8' : '#667085' }]}>
          Generate a market-impact brief from the latest loaded headlines.
        </Text>
      )}
    </View>
  );
}

function ChipSection({ label, values, dark }: { label: string; values: string[]; dark: boolean }) {
  if (values.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: dark ? '#8F98A8' : '#667085' }]}>{label}</Text>
      <View style={styles.chipWrap}>
        {values.slice(0, 8).map(value => (
          <View key={value} style={[styles.chip, { backgroundColor: dark ? '#202631' : '#F2F6FB', borderColor: dark ? '#303847' : '#E1E7EF' }]}>
            <Text style={[styles.chipText, { color: dark ? '#DDE3ED' : '#344054' }]} numberOfLines={1}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 8, padding: 14, marginHorizontal: 16, marginTop: 14, marginBottom: 8 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  headingBlock: { flex: 1 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0 },
  title: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  modeChip: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  modeText: { fontSize: 10, fontWeight: '800' },
  button: { backgroundColor: tintColor, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, minWidth: 82, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  body: { marginTop: 12 },
  headline: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  summary: { fontSize: 13, lineHeight: 19, marginTop: 7 },
  section: { marginTop: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 7 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, maxWidth: '100%' },
  chipText: { fontSize: 12, fontWeight: '700' },
  reasonRow: { flexDirection: 'row', gap: 7, alignItems: 'flex-start', marginTop: 6 },
  reasonDot: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
  reasonText: { flex: 1, fontSize: 13, lineHeight: 18 },
  emptyText: { fontSize: 13, lineHeight: 18, marginTop: 10 },
  error: { color: '#D92D20', fontSize: 12, fontWeight: '700', marginTop: 8 }
});
