export interface MentionMatch {
  handle: string;
  start: number;
  end: number;
}

export const MENTION_PATTERN = /(?<![a-zA-Z0-9_])@([a-zA-Z][a-zA-Z0-9._-]*)/g;

const INLINE_CODE_PATTERN = /`[^`]*`/g;

export function parseMentions(text: string): MentionMatch[] {
  // Mask inline code spans so @mentions inside them are ignored
  const masked = text.replace(INLINE_CODE_PATTERN, (match) =>
    " ".repeat(match.length)
  );

  const matches: MentionMatch[] = [];
  let match: RegExpExecArray | null;

  // Reset lastIndex for global regex
  MENTION_PATTERN.lastIndex = 0;

  while ((match = MENTION_PATTERN.exec(masked)) !== null) {
    matches.push({
      handle: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return matches;
}
