import { tintColor } from '@/theme/colors';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

type ReaderMessage = {
  title?: string;
  text?: string;
};

const articleTextScript = `
  (function() {
    function clean(text) {
      return String(text || '')
        .replace(/\\s+/g, ' ')
        .trim();
    }

    function textFrom(selector) {
      var node = document.querySelector(selector);
      return node ? clean(node.innerText) : '';
    }

    var heading = document.querySelector('h1');
    var title = clean(heading ? heading.innerText : document.title);
    var root = document.querySelector('article') ||
      document.querySelector('main') ||
      document.querySelector('[role="main"]') ||
      document.body;
    var paragraphs = Array.prototype.slice.call(root ? root.querySelectorAll('p') : [])
      .map(function(node) { return clean(node.innerText); })
      .filter(function(value, index, all) {
        if (value.length < 45) return false;
        if (/^(advertisement|subscribe|sign up|log in|read more|share|follow us)$/i.test(value)) return false;
        return all.indexOf(value) === index;
      });
    var description = document.querySelector('meta[name="description"], meta[property="og:description"]');
    var text = paragraphs.length > 0
      ? paragraphs.join(' ')
      : clean(description ? description.getAttribute('content') : '');

    window.ReactNativeWebView.postMessage(JSON.stringify({ title: title, text: text }));
  })();
  true;
`;

export default function ArticleScreen() {
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ title?: string; url?: string; source?: string }>();
  const [pageTitle, setPageTitle] = useState(params.title ?? 'Article');
  const [articleText, setArticleText] = useState('');
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState(false);
  const speakingRef = useRef(false);

  const url = typeof params.url === 'string' ? params.url : '';
  const fallbackTitle = typeof params.title === 'string' ? params.title : 'Article';
  const source = typeof params.source === 'string' ? params.source : 'News';
  const readableText = useMemo(
    () => createReadableArticleText(pageTitle || fallbackTitle, articleText),
    [articleText, fallbackTitle, pageTitle]
  );
  const wordCount = readableText ? readableText.split(/\s+/).length : 0;

  useEffect(() => {
    return () => {
      speakingRef.current = false;
      Speech.stop();
    };
  }, []);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as ReaderMessage;
      const nextTitle = compactArticleText(message.title ?? '');
      const nextText = compactArticleText(message.text ?? '');

      if (nextTitle) setPageTitle(nextTitle);
      if (nextText) setArticleText(nextText);
    } catch {
      setArticleText(fallbackTitle);
    }
  }

  async function toggleReadArticle() {
    if (reading) {
      speakingRef.current = false;
      await Speech.stop();
      setReading(false);
      return;
    }

    if (!readableText) return;

    const chunks = chunkSpeechText(readableText);
    let index = 0;
    speakingRef.current = true;
    await Speech.stop();
    setReading(true);

    const speakNext = () => {
      if (!speakingRef.current) return;
      const next = chunks[index];
      if (!next) {
        speakingRef.current = false;
        setReading(false);
        return;
      }

      index += 1;
      Speech.speak(next, {
        language: getSpeechLanguage(readableText),
        pitch: 1,
        rate: 0.72,
        onDone: speakNext,
        onStopped: () => {
          speakingRef.current = false;
          setReading(false);
        },
        onError: () => {
          speakingRef.current = false;
          setReading(false);
        },
      });
    };

    speakNext();
  }

  if (!url) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: dark ? '#0B0D12' : '#F5F7FA', paddingTop: insets.top }]}>
        <Text style={[styles.errorTitle, { color: dark ? '#F5F7FA' : '#111827' }]}>Article link missing</Text>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { borderColor: dark ? '#394150' : '#D4D8E0' }]}>
          <Text style={[styles.backButtonText, { color: dark ? '#DDE3ED' : '#374151' }]}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: dark ? '#0B0D12' : '#F5F7FA' }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: dark ? '#20252E' : '#E3E7ED' }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.iconButton, { borderColor: dark ? '#394150' : '#D4D8E0' }]}>
          <Text style={[styles.iconButtonText, { color: dark ? '#DDE3ED' : '#374151' }]}>Back</Text>
        </Pressable>
        <View style={styles.titleGroup}>
          <Text numberOfLines={1} style={[styles.source, { color: dark ? '#8F98A8' : '#667085' }]}>{source}</Text>
          <Text numberOfLines={2} style={[styles.title, { color: dark ? '#F5F7FA' : '#111827' }]}>{pageTitle}</Text>
        </View>
        <Pressable
          onPress={toggleReadArticle}
          disabled={!readableText}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${reading ? 'Stop reading' : 'Read'} article`}
          style={[styles.readButton, {
            opacity: readableText ? 1 : 0.45,
            backgroundColor: reading ? tintColor : dark ? '#171B22' : '#FFFFFF',
            borderColor: reading ? tintColor : dark ? '#2A2F38' : '#E1E5EA'
          }]}
        >
          <Text style={[styles.readButtonText, { color: reading ? '#FFFFFF' : dark ? '#DDE3ED' : '#374151' }]}>
            {reading ? 'Stop' : 'Read'}
          </Text>
          <Text style={[styles.readButtonCount, { color: reading ? '#EAF4FF' : dark ? '#8F98A8' : '#667085' }]}>
            {wordCount > 0 ? `${wordCount} words` : 'loading'}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={[styles.loading, { backgroundColor: dark ? '#0B0D12' : '#F5F7FA' }]}>
          <ActivityIndicator color={tintColor} />
        </View>
      ) : null}

      <WebView
        source={{ uri: url }}
        injectedJavaScript={articleTextScript}
        onMessage={handleMessage}
        onLoadEnd={() => setLoading(false)}
        style={styles.webView}
      />
    </View>
  );
}

function compactArticleText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function createReadableArticleText(title: string, body: string): string {
  const cleanTitle = compactArticleText(title);
  const cleanBody = removeDuplicateHeadline(compactArticleText(body), cleanTitle);

  return [cleanTitle, cleanBody].filter(Boolean).join('. ');
}

function removeDuplicateHeadline(body: string, title: string): string {
  if (!body || !title) return body;

  const normalizedBody = body.toLowerCase();
  const normalizedTitle = title.toLowerCase();

  if (normalizedBody === normalizedTitle) return '';
  if (normalizedBody.startsWith(normalizedTitle)) {
    return body.slice(title.length).replace(/^[\s.:;-]+/, '');
  }

  return body;
}

function chunkSpeechText(text: string): string[] {
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const next = `${current} ${sentence}`.trim();
    if (next.length > 900 && current) {
      chunks.push(current);
      current = sentence.trim();
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function getSpeechLanguage(text: string): string {
  const chineseCount = (text.match(/[\u3400-\u9FFF]/g) ?? []).length;
  return chineseCount > text.length * 0.15 ? 'zh-CN' : 'en-US';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  header: { minHeight: 84, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, height: 38, alignItems: 'center', justifyContent: 'center' },
  iconButtonText: { fontSize: 13, fontWeight: '800' },
  titleGroup: { flex: 1, minWidth: 0 },
  source: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0 },
  title: { fontSize: 15, fontWeight: '800', lineHeight: 20, marginTop: 2 },
  readButton: { borderWidth: 1, borderRadius: 8, minWidth: 86, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  readButtonText: { fontSize: 14, fontWeight: '800' },
  readButtonCount: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  loading: { position: 'absolute', top: 84, left: 0, right: 0, zIndex: 2, paddingVertical: 12 },
  webView: { flex: 1 },
  errorTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  backButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  backButtonText: { fontSize: 14, fontWeight: '800' },
});
