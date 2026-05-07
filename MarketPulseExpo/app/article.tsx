import { tintColor } from '@/theme/colors';
import { translateTextToChinese } from '@/services/translate';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

type ReaderMessage = {
  action?: 'translateNodes';
  title?: string;
  text?: string;
  nodes?: string[];
};

const articleTextScript = `
  (function() {
    function clean(text) {
      return String(text || '')
        .replace(/\\s+/g, ' ')
        .trim();
    }

    function isBlockedElement(element) {
      if (!element) return true;
      var blockedTags = ['ASIDE', 'FOOTER', 'HEADER', 'NAV', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'FORM', 'BUTTON'];
      var current = element;
      while (current && current !== document.body) {
        if (blockedTags.indexOf(current.tagName) >= 0) return true;
        var marker = ((current.id || '') + ' ' + (current.className || '') + ' ' + (current.getAttribute('role') || '') + ' ' + (current.getAttribute('aria-label') || '')).toLowerCase();
        if (/(^|\\s)(ad|ads|advert|advertisement|promo|sponsor|sponsored|subscribe|newsletter|cookie|banner|share|social|related|recommend|sidebar|comment|comments|footer|nav|menu)(\\s|$|-|_)/.test(marker)) return true;
        current = current.parentElement;
      }
      return false;
    }

    var heading = document.querySelector('h1');
    var title = clean(heading ? heading.innerText : document.title);
    var root = document.querySelector('article:not([class*="related"]):not([class*="promo"])') ||
      document.querySelector('main') ||
      document.querySelector('[role="main"]') ||
      document.querySelector('[class*="article"], [class*="story"], [class*="content"]') ||
      document.body;
    var paragraphs = Array.prototype.slice.call(root ? root.querySelectorAll('p, h2, h3') : [])
      .filter(function(node) {
        if (isBlockedElement(node)) return false;
        var linkText = Array.prototype.slice.call(node.querySelectorAll('a')).map(function(link) { return clean(link.innerText); }).join(' ');
        var nodeText = clean(node.innerText);
        if (linkText.length > nodeText.length * 0.65) return false;
        return true;
      })
      .map(function(node) { return clean(node.innerText); })
      .filter(function(value, index, all) {
        if (value.length < 18) return false;
        if (/^(advertisement|subscribe|sign up|log in|read more|share|follow us|related topics|more from|recommended|sponsored)$/i.test(value)) return false;
        if (/(cookie policy|privacy policy|all rights reserved|download our app|enable notifications|sign up for|subscribe to|follow us on|share this article)/i.test(value)) return false;
        return all.indexOf(value) === index;
      });
    var description = document.querySelector('meta[name="description"], meta[property="og:description"]');
    var text = paragraphs.length > 0
      ? paragraphs.join('\\n\\n')
      : clean(description ? description.getAttribute('content') : '');

    window.ReactNativeWebView.postMessage(JSON.stringify({ title: title, text: text }));
  })();
  true;
`;

const collectTranslationNodesScript = `
  (function() {
    function clean(text) {
      return String(text || '').replace(/\\s+/g, ' ').trim();
    }

    function isVisible(element) {
      if (!element) return false;
      var style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      var rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    function isBlockedElement(element) {
      if (!element) return true;
      var blockedTags = ['ASIDE', 'FOOTER', 'HEADER', 'NAV', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'FORM', 'BUTTON'];
      var current = element;
      while (current && current !== document.body) {
        if (blockedTags.indexOf(current.tagName) >= 0) return true;
        var marker = ((current.id || '') + ' ' + (current.className || '') + ' ' + (current.getAttribute('role') || '') + ' ' + (current.getAttribute('aria-label') || '')).toLowerCase();
        if (/(^|\\s)(ad|ads|advert|advertisement|promo|sponsor|sponsored|subscribe|newsletter|cookie|banner|share|social|related|recommend|sidebar|comment|comments|footer|nav|menu)(\\s|$|-|_)/.test(marker)) return true;
        current = current.parentElement;
      }
      return false;
    }

    var root = document.querySelector('article') ||
      document.querySelector('main') ||
      document.querySelector('[role="main"]') ||
      document.body;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        var text = clean(node.nodeValue);
        if (text.length < 2 || text.length > 700) return NodeFilter.FILTER_REJECT;
        if (/^[\\d\\W_]+$/.test(text)) return NodeFilter.FILTER_REJECT;
        if (/^(advertisement|subscribe|sign up|log in|share|follow us|related topics|more from|recommended|sponsored)$/i.test(text)) return NodeFilter.FILTER_REJECT;
        if (/(cookie policy|privacy policy|all rights reserved|download our app|enable notifications|sign up for|subscribe to|follow us on|share this article)/i.test(text)) return NodeFilter.FILTER_REJECT;
        var parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG'].indexOf(parent.tagName) >= 0) return NodeFilter.FILTER_REJECT;
        if (isBlockedElement(parent)) return NodeFilter.FILTER_REJECT;
        return isVisible(parent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    var nodes = [];
    var current;
    while ((current = walker.nextNode()) && nodes.length < 90) {
      nodes.push(clean(current.nodeValue));
    }

    window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'translateNodes', nodes: nodes }));
  })();
  true;
`;

const clearArticleHighlightScript = `
  (function() {
    var mark = document.querySelector('[data-marketpulse-reading-highlight="true"]');
    if (mark && mark.parentNode) {
      mark.replaceWith(document.createTextNode(mark.textContent || ''));
    }
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
  const [translatedText, setTranslatedText] = useState('');
  const [translatedReadableText, setTranslatedReadableText] = useState('');
  const [translating, setTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [webError, setWebError] = useState('');
  const [paused, setPaused] = useState(false);
  const speakingRef = useRef(false);
  const readingSessionRef = useRef(0);
  const webViewRef = useRef<WebView>(null);
  const translationSessionRef = useRef(0);

  const url = typeof params.url === 'string' ? params.url : '';
  const fallbackTitle = typeof params.title === 'string' ? params.title : 'Article';
  const source = typeof params.source === 'string' ? params.source : 'News';
  const readableText = useMemo(
    () => createReadableArticleText(pageTitle || fallbackTitle, articleText),
    [articleText, fallbackTitle, pageTitle]
  );
  const readableEntries = useMemo(
    () => createReadableArticleEntries(pageTitle || fallbackTitle, articleText),
    [articleText, fallbackTitle, pageTitle]
  );
  const translatedReadableEntries = useMemo(
    () => translatedReadableText ? splitReadableText(translatedReadableText) : [],
    [translatedReadableText]
  );
  const speechText = showTranslation && translatedReadableText ? translatedReadableText : readableText;

  useEffect(() => {
    return () => {
      speakingRef.current = false;
      readingSessionRef.current += 1;
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    speakingRef.current = false;
    readingSessionRef.current += 1;
    Speech.stop();
    setPageTitle(fallbackTitle);
    setArticleText('');
    setTranslatedText('');
    setTranslatedReadableText('');
    setTranslating(false);
    setShowTranslation(false);
    setWebError('');
    setReading(false);
    setPaused(false);
    setLoading(true);
  }, [fallbackTitle, url]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as ReaderMessage;
      if (message.action === 'translateNodes') {
        translateWebPageNodes(message.nodes ?? []);
        return;
      }

      const nextTitle = compactArticleText(message.title ?? '');
      const nextText = normalizeArticleBody(message.text ?? '');

      if (nextTitle) setPageTitle(nextTitle);
      if (nextText) setArticleText(nextText);
    } catch {
      setArticleText(fallbackTitle);
    }
  }

  async function toggleReadArticle() {
    if (reading) {
      await stopArticleSound();
      return;
    }

    const speechEntries = showTranslation && translatedReadableEntries.length > 0
      ? translatedReadableEntries
      : readableEntries;
    if (speechEntries.length === 0) return;

    let index = 0;
    const sessionId = readingSessionRef.current + 1;
    readingSessionRef.current = sessionId;
    speakingRef.current = true;
    await Speech.stop();
    setReading(true);
    webViewRef.current?.injectJavaScript(createPrepareArticleHighlightScript());

    const speakNext = () => {
      if (!speakingRef.current || readingSessionRef.current !== sessionId) return;
      const next = speechEntries[index];
      if (!next) {
        if (readingSessionRef.current === sessionId) {
          speakingRef.current = false;
          setReading(false);
          setPaused(false);
          webViewRef.current?.injectJavaScript(clearArticleHighlightScript);
        }
        return;
      }

      index += 1;
      webViewRef.current?.injectJavaScript(createHighlightTextScript(index - 1));
      Speech.speak(next, {
        language: getSpeechLanguage(next),
        pitch: 1,
        rate: 0.72,
        onDone: () => {
          setTimeout(() => {
            if (readingSessionRef.current === sessionId) {
              speakNext();
            }
          }, 180);
        },
        onStopped: () => {
          if (readingSessionRef.current === sessionId) {
            speakingRef.current = false;
            setReading(false);
            setPaused(false);
          }
        },
        onError: () => {
          if (readingSessionRef.current === sessionId) {
            speakingRef.current = false;
            setReading(false);
            setPaused(false);
          }
        },
      });
    };

    speakNext();
  }

  async function stopArticleSound() {
    readingSessionRef.current += 1;
    speakingRef.current = false;
    webViewRef.current?.injectJavaScript(clearArticleHighlightScript);
    await Speech.stop();
    setReading(false);
    setPaused(false);
  }

  async function togglePauseArticleSound() {
    if (!reading) return;

    try {
      if (paused) {
        await Speech.resume();
        setPaused(false);
      } else {
        await Speech.pause();
        setPaused(true);
      }
    } catch {
      setPaused(false);
    }
  }

  async function goBack() {
    await stopArticleSound();
    router.back();
  }

  async function openInBrowser() {
    if (url) {
      await WebBrowser.openBrowserAsync(url);
    }
  }

  async function toggleTranslation() {
    if (showTranslation) {
      webViewRef.current?.reload();
      setShowTranslation(false);
      setTranslatedText('');
      setTranslatedReadableText('');
      return;
    }

    if (translating) return;
    translationSessionRef.current += 1;
    setTranslating(true);
    webViewRef.current?.injectJavaScript(collectTranslationNodesScript);
  }

  async function translateWebPageNodes(nodes: string[]) {
    const sessionId = translationSessionRef.current;
    if (!nodes.length) {
      setTranslating(false);
      return;
    }

    try {
      const [translatedNodes, nextReadableEntries] = await Promise.all([
        Promise.all(nodes.map(node => translateTextToChinese(node))),
        Promise.all(readableEntries.map(entry => translateTextToChinese(entry))),
      ]);
      if (translationSessionRef.current !== sessionId) return;
      webViewRef.current?.injectJavaScript(createReplaceTextNodesScript(translatedNodes));
      setTranslatedText(translatedNodes.join('. '));
      setTranslatedReadableText(nextReadableEntries.join('\n\n'));
      setShowTranslation(true);
    } finally {
      if (translationSessionRef.current === sessionId) {
        setTranslating(false);
      }
    }
  }

  if (!url) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: dark ? '#0B0D12' : '#F5F7FA', paddingTop: insets.top }]}>
        <Text style={[styles.errorTitle, { color: dark ? '#F5F7FA' : '#111827' }]}>Article link missing</Text>
        <Pressable onPress={goBack} style={[styles.backButton, { borderColor: dark ? '#394150' : '#D4D8E0' }]}>
          <Text style={[styles.backButtonText, { color: dark ? '#DDE3ED' : '#374151' }]}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: dark ? '#0B0D12' : '#F5F7FA' }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: dark ? '#20252E' : '#E3E7ED' }]}>
        <Pressable onPress={goBack} hitSlop={8} style={[styles.iconButton, { borderColor: dark ? '#394150' : '#D4D8E0' }]}>
          <Text style={[styles.iconButtonText, { color: dark ? '#DDE3ED' : '#374151' }]}>Back</Text>
        </Pressable>
        <View style={styles.titleGroup}>
          <Text numberOfLines={1} style={[styles.source, { color: dark ? '#8F98A8' : '#667085' }]}>{source}</Text>
          <Text numberOfLines={2} style={[styles.title, { color: dark ? '#F5F7FA' : '#111827' }]}>{pageTitle}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={toggleTranslation}
            disabled={!readableText || translating}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${showTranslation ? 'Show original' : 'Translate'} article`}
            style={[styles.smallButton, {
              opacity: readableText && !translating ? 1 : 0.45,
              backgroundColor: showTranslation ? tintColor : dark ? '#171B22' : '#FFFFFF',
              borderColor: showTranslation ? tintColor : dark ? '#2A2F38' : '#E1E5EA'
            }]}
          >
            <Text style={[styles.smallButtonText, { color: showTranslation ? '#FFFFFF' : dark ? '#DDE3ED' : '#374151' }]}>
              {translating ? '...' : showTranslation ? 'Original' : 'Translate'}
            </Text>
          </Pressable>
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
              Read
            </Text>
          </Pressable>
          <Pressable
            onPress={stopArticleSound}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Stop article sound"
            style={[styles.stopSoundButton, {
              opacity: reading ? 1 : 0.65,
              backgroundColor: dark ? '#171B22' : '#FFFFFF',
              borderColor: dark ? '#394150' : '#D4D8E0'
            }]}
          >
            <Text style={[styles.stopSoundButtonText, { color: dark ? '#DDE3ED' : '#374151' }]}>Stop</Text>
          </Pressable>
          <Pressable
            onPress={togglePauseArticleSound}
            disabled={!reading}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${paused ? 'Resume' : 'Pause'} article sound`}
            style={[styles.pauseSoundButton, {
              opacity: reading ? 1 : 0.65,
              backgroundColor: dark ? '#171B22' : '#FFFFFF',
              borderColor: dark ? '#394150' : '#D4D8E0'
            }]}
          >
            <Text style={[styles.pauseSoundButtonText, { color: dark ? '#DDE3ED' : '#374151' }]}>{paused ? 'Resume' : 'Pause'}</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={[styles.loading, { backgroundColor: dark ? '#0B0D12' : '#F5F7FA' }]}>
          <ActivityIndicator color={tintColor} />
        </View>
      ) : null}

      {webError ? (
        <View style={[styles.webErrorView, { backgroundColor: dark ? '#0B0D12' : '#F5F7FA' }]}>
          <Text style={[styles.webErrorTitle, { color: dark ? '#F5F7FA' : '#111827' }]}>This article could not load in the app</Text>
          <Text style={[styles.webErrorText, { color: dark ? '#B8C0CC' : '#4B5563' }]}>
            Some news sites block in-app loading or use security settings iOS does not accept.
          </Text>
          <Pressable onPress={openInBrowser} style={[styles.openBrowserButton, { backgroundColor: tintColor }]}>
            <Text style={styles.openBrowserButtonText}>Open in Browser</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          injectedJavaScript={articleTextScript}
          onMessage={handleMessage}
          onLoadStart={() => {
            setLoading(true);
            setWebError('');
          }}
          onLoadEnd={() => setLoading(false)}
          onError={(event) => {
            setLoading(false);
            setWebError(event.nativeEvent.description || 'Article failed to load');
          }}
          style={styles.webView}
        />
      )}
    </View>
  );
}

function createReplaceTextNodesScript(translatedNodes: string[]): string {
  return `
    (function() {
      var translations = ${JSON.stringify(translatedNodes)};
      var index = 0;

      function clean(text) {
        return String(text || '').replace(/\\s+/g, ' ').trim();
      }

      function isVisible(element) {
        if (!element) return false;
        var style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        var rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      function isBlockedElement(element) {
        if (!element) return true;
        var blockedTags = ['ASIDE', 'FOOTER', 'HEADER', 'NAV', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'FORM', 'BUTTON'];
        var current = element;
        while (current && current !== document.body) {
          if (blockedTags.indexOf(current.tagName) >= 0) return true;
          var marker = ((current.id || '') + ' ' + (current.className || '') + ' ' + (current.getAttribute('role') || '') + ' ' + (current.getAttribute('aria-label') || '')).toLowerCase();
          if (/(^|\\s)(ad|ads|advert|advertisement|promo|sponsor|sponsored|subscribe|newsletter|cookie|banner|share|social|related|recommend|sidebar|comment|comments|footer|nav|menu)(\\s|$|-|_)/.test(marker)) return true;
          current = current.parentElement;
        }
        return false;
      }

      var root = document.querySelector('article') ||
        document.querySelector('main') ||
        document.querySelector('[role="main"]') ||
        document.body;
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function(node) {
          var text = clean(node.nodeValue);
          if (text.length < 2 || text.length > 700) return NodeFilter.FILTER_REJECT;
          if (/^[\\d\\W_]+$/.test(text)) return NodeFilter.FILTER_REJECT;
          if (/^(advertisement|subscribe|sign up|log in|share|follow us|related topics|more from|recommended|sponsored)$/i.test(text)) return NodeFilter.FILTER_REJECT;
          if (/(cookie policy|privacy policy|all rights reserved|download our app|enable notifications|sign up for|subscribe to|follow us on|share this article)/i.test(text)) return NodeFilter.FILTER_REJECT;
          var parent = node.parentElement;
          if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG'].indexOf(parent.tagName) >= 0) return NodeFilter.FILTER_REJECT;
          if (isBlockedElement(parent)) return NodeFilter.FILTER_REJECT;
          return isVisible(parent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });

      var current;
      while ((current = walker.nextNode()) && index < translations.length) {
        current.nodeValue = translations[index];
        index += 1;
      }
    })();
    true;
  `;
}

function createPrepareArticleHighlightScript(): string {
  return `
    (function() {
      var existing = Array.prototype.slice.call(document.querySelectorAll('[data-marketpulse-word="true"]'));
      existing.forEach(function(node) {
        node.replaceWith(document.createTextNode(node.textContent || ''));
      });

      function clean(text) {
        return String(text || '').replace(/\\s+/g, ' ').trim();
      }

      function isVisible(element) {
        if (!element) return false;
        var style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        var rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      function isBlockedElement(element) {
        if (!element) return true;
        var blockedTags = ['ASIDE', 'FOOTER', 'HEADER', 'NAV', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'FORM', 'BUTTON'];
        var current = element;
        while (current && current !== document.body) {
          if (blockedTags.indexOf(current.tagName) >= 0) return true;
          var marker = ((current.id || '') + ' ' + (current.className || '') + ' ' + (current.getAttribute('role') || '') + ' ' + (current.getAttribute('aria-label') || '')).toLowerCase();
          if (/(^|\\s)(ad|ads|advert|advertisement|promo|sponsor|sponsored|subscribe|newsletter|cookie|banner|share|social|related|recommend|sidebar|comment|comments|footer|nav|menu)(\\s|$|-|_)/.test(marker)) return true;
          current = current.parentElement;
        }
        return false;
      }

      function shouldUseElement(element) {
        if (!element || isBlockedElement(element) || !isVisible(element)) return false;
        var text = clean(element.innerText);
        if (text.length < 2) return false;
        if (/^(advertisement|subscribe|sign up|log in|read more|share|follow us|related topics|more from|recommended|sponsored)$/i.test(text)) return false;
        if (/(cookie policy|privacy policy|all rights reserved|download our app|enable notifications|sign up for|subscribe to|follow us on|share this article)/i.test(text)) return false;
        return true;
      }

      function wrapTextNode(node, entryIndex, wordIndexRef) {
        var text = node.nodeValue || '';
        var regex = /[\\u3400-\\u9FFF]|[A-Za-z0-9]+(?:['’\\-][A-Za-z0-9]+)?/g;
        var parent = node.parentNode;
        if (!parent || parent.nodeType !== 1) return;
        var fragment = document.createDocumentFragment();
        var lastIndex = 0;
        var match;
        var wrapped = false;

        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
          }
          var span = document.createElement('span');
          span.setAttribute('data-marketpulse-word', 'true');
          span.setAttribute('data-marketpulse-entry', String(entryIndex));
          span.setAttribute('data-marketpulse-word-index', String(wordIndexRef.value));
          span.textContent = match[0];
          fragment.appendChild(span);
          wordIndexRef.value += 1;
          lastIndex = match.index + match[0].length;
          wrapped = true;
        }

        if (!wrapped) return;
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        parent.replaceChild(fragment, node);
      }

      function wrapElement(element, entryIndex) {
        element.setAttribute('data-marketpulse-entry-container', String(entryIndex));
        var wordIndexRef = { value: 0 };
        var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
          acceptNode: function(node) {
            var parent = node.parentElement;
            if (!parent || parent.closest('[data-marketpulse-word="true"]')) return NodeFilter.FILTER_REJECT;
            if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG'].indexOf(parent.tagName) >= 0) return NodeFilter.FILTER_REJECT;
            return clean(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          }
        });
        var nodes = [];
        var current;
        while ((current = walker.nextNode())) {
          nodes.push(current);
        }
        nodes.forEach(function(node) {
          wrapTextNode(node, entryIndex, wordIndexRef);
        });
      }

      var root = document.querySelector('article') ||
        document.querySelector('main') ||
        document.querySelector('[role="main"]') ||
        document.body;
      var heading = document.querySelector('h1');
      var elements = [];
      if (heading && shouldUseElement(heading)) elements.push(heading);
      Array.prototype.slice.call(root ? root.querySelectorAll('p, h2, h3') : []).forEach(function(element) {
        if (element !== heading && shouldUseElement(element)) {
          elements.push(element);
        }
      });

      elements.forEach(function(element, entryIndex) {
        wrapElement(element, entryIndex);
      });
    })();
    true;
  `;
}

function createHighlightTextScript(activeIndex: number): string {
  return `
    (function() {
      var active = document.querySelector('[data-marketpulse-reading-highlight="true"]');
      if (active) {
        active.removeAttribute('data-marketpulse-reading-highlight');
        active.style.backgroundColor = '';
        active.style.color = '';
        active.style.padding = '';
        active.style.borderRadius = '';
        active.style.boxShadow = '';
      }

      var target = document.querySelector('[data-marketpulse-entry-container="${activeIndex}"]') ||
        document.querySelector('[data-marketpulse-entry="${activeIndex}"][data-marketpulse-word="true"]');
      if (!target) return true;
      target.setAttribute('data-marketpulse-reading-highlight', 'true');
      target.style.backgroundColor = '#FEF08A';
      target.style.color = '#111827';
      target.style.padding = '4px 5px';
      target.style.borderRadius = '6px';
      target.style.boxShadow = '0 0 0 2px rgba(250, 204, 21, 0.45)';
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    })();
    true;
  `;
}

function compactArticleText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeArticleBody(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(compactArticleText)
    .filter(Boolean)
    .join('\n\n');
}

function createReadableArticleText(title: string, body: string): string {
  return createReadableArticleEntries(title, body).join('. ');
}

function createReadableArticleEntries(title: string, body: string): string[] {
  const cleanTitle = compactArticleText(title);
  const cleanBody = removeDuplicateHeadline(normalizeArticleBody(body), cleanTitle);
  const bodyEntries = splitReadableText(cleanBody);

  return [cleanTitle, ...bodyEntries].filter(Boolean);
}

function splitReadableText(text: string): string[] {
  return text
    .split(/\n{2,}|(?<=[.!?\u3002\uff01\uff1f])\s+(?=[A-Z\u3400-\u9FFF])/)
    .map(compactArticleText)
    .filter(value => value.length > 0);
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
  headerActions: { alignItems: 'center', gap: 6 },
  smallButton: { borderWidth: 1, borderRadius: 8, minWidth: 86, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center' },
  smallButtonText: { fontSize: 12, fontWeight: '800' },
  readButton: { borderWidth: 1, borderRadius: 8, minWidth: 118, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  readButtonText: { fontSize: 14, fontWeight: '800' },
  stopSoundButton: { borderWidth: 1, borderRadius: 8, minWidth: 118, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  stopSoundButtonText: { fontSize: 11, fontWeight: '800' },
  pauseSoundButton: { borderWidth: 1, borderRadius: 8, minWidth: 118, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  pauseSoundButtonText: { fontSize: 11, fontWeight: '800' },
  loading: { position: 'absolute', top: 84, left: 0, right: 0, zIndex: 2, paddingVertical: 12 },
  webView: { flex: 1 },
  webErrorView: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  webErrorTitle: { fontSize: 18, lineHeight: 24, fontWeight: '800', textAlign: 'center' },
  webErrorText: { fontSize: 14, lineHeight: 21, fontWeight: '600', textAlign: 'center', marginTop: 10 },
  openBrowserButton: { borderRadius: 8, minHeight: 42, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  openBrowserButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  errorTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  backButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  backButtonText: { fontSize: 14, fontWeight: '800' },
});
