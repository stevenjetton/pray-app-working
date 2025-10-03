// utils/formatTranscriptParagraphs.ts

/**
 * Format a raw transcript string into paragraph-separated text with visible indentation
 * for React Native display.
 *
 * - Uses non-breaking spaces (\u00A0) so indentation is preserved when rendered.
 * - If already paragraph formatted, still adds indent to each paragraph.
 * - If unformatted, splits into sentences and groups every 3 sentences per paragraph.
 */

export function formatTranscriptParagraphs(rawText: string): string {
  if (!rawText) return '';

  // Visible indent — adjust number of NBSPs for preferred width
  const INDENT = '\u00A0\u00A0\u00A0\u00A0'; // ~4 non-breaking spaces

  // If already has paragraph breaks, trim/indent each existing paragraph
  if (/\n{2,}/.test(rawText)) {
    return rawText
      .trim()
      .split(/\n{2,}/)
      .map(p => INDENT + p.trim())
      .join('\n\n');
  }

  // Raw/continuous transcript: split into sentences
  const sentences = rawText.match(/[^.!?]+[.!?]+/g) || [rawText];
  const paragraphs: string[] = [];
  let buffer: string[] = [];

  sentences.forEach(sentence => {
    buffer.push(sentence.trim());
    if (buffer.length >= 3) { // group every 3 sentences
      paragraphs.push(buffer.join(' '));
      buffer = [];
    }
  });

  // Handle last partial paragraph
  if (buffer.length) {
    paragraphs.push(buffer.join(' '));
  }

  // Indent each paragraph & join
  return paragraphs.map(p => INDENT + p).join('\n\n');
}
