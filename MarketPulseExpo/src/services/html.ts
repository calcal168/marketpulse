export function stripHtml(input?: string): string | undefined {
  if (!input) return undefined;
  return cleanNewsText(input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' '));
}

export function cleanNewsText(input?: string): string | undefined {
  if (!input) return undefined;

  return decodePercentEscapes(input)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodePercentEscapes(input: string): string {
  return input
    .replace(/\s*%\s*/g, '%')
    .replace(/(?:%[0-9A-Fa-f]{2})+/g, match => {
      try {
        return decodeURIComponent(match);
      } catch {
        return match;
      }
    });
}
