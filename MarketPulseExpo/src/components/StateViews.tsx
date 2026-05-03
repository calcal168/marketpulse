import { ActivityIndicator, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { tintColor } from '@/theme/colors';

export function LoadingView() {
  const dark = useColorScheme() === 'dark';
  return (
    <View style={[styles.center, { backgroundColor: dark ? '#0B0D12' : '#F5F7FA' }]}>
      <ActivityIndicator size={32} color={tintColor} />
      <Text style={[styles.subtle, { color: dark ? '#8F98A8' : '#667085' }]}>Loading headlines...</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  const dark = useColorScheme() === 'dark';
  return (
    <View style={[styles.center, { backgroundColor: dark ? '#0B0D12' : '#F5F7FA' }]}>
      <Text style={[styles.title, { color: dark ? '#F5F7FA' : '#111827' }]}>Could not load news</Text>
      <Text style={[styles.subtle, { color: dark ? '#8F98A8' : '#667085' }]}>{message}</Text>
      <Pressable onPress={onRetry} style={styles.button}>
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

export function EmptyView({ title }: { title: string }) {
  const dark = useColorScheme() === 'dark';
  return (
    <View style={styles.center}>
      <View style={[styles.emptyPanel, { backgroundColor: dark ? '#16181D' : '#FFFFFF', borderColor: dark ? '#2A2F38' : '#E6E8EC' }]}>
        <Text style={[styles.subtle, { color: dark ? '#8F98A8' : '#667085', marginTop: 0 }]}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  subtle: { marginTop: 10, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  button: { backgroundColor: tintColor, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 6, marginTop: 16 },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
  emptyPanel: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 18, marginHorizontal: 16 }
});
