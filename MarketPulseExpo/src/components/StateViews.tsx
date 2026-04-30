import { ActivityIndicator, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { tintColor } from '@/theme/colors';

export function LoadingView() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size={36} />
      <Text style={styles.subtle}>Loading headlines…</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  const dark = useColorScheme() === 'dark';
  return (
    <View style={styles.center}>
      <Text style={[styles.title, { color: dark ? '#FFFFFF' : '#111827' }]}>Could not load news</Text>
      <Text style={styles.subtle}>{message}</Text>
      <Pressable onPress={onRetry} style={styles.button}>
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

export function EmptyView({ title }: { title: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.subtle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtle: { color: '#8E8E93', marginTop: 10, textAlign: 'center' },
  button: { backgroundColor: tintColor, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, marginTop: 16 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' }
});
