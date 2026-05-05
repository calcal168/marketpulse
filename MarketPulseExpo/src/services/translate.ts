const TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';

type GoogleTranslateResponse = Array<Array<[string, string]>>;

export async function translateTextToChinese(text: string): Promise<string> {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean || /[\u3400-\u9FFF]/.test(clean)) return clean;

  const chunks = chunkForTranslation(clean);
  const translated = await Promise.all(chunks.map(translateChunkToChinese));
  return translated.join(' ').replace(/\s+/g, ' ').trim();
}

async function translateChunkToChinese(text: string): Promise<string> {
  const url = `${TRANSLATE_URL}?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Translate failed: ${response.status}`);
  }

  const data = await response.json() as GoogleTranslateResponse;
  return (data[0] ?? []).map(part => part[0]).join('');
}

function chunkForTranslation(text: string): string[] {
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const next = `${current} ${sentence}`.trim();
    if (next.length > 1400 && current) {
      chunks.push(current);
      current = sentence.trim();
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}
