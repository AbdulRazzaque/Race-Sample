import path from 'path';
import fs from 'fs';
// @ts-ignore
import { ArabicShaper } from 'arabic-persian-reshaper';

/**
 * Checks whether a string contains any Arabic characters.
 */
export function hasArabicCharacters(text: string | null | undefined): boolean {
  if (!text) return false;
  return /[\u0600-\u06FF\uFB50-\uFEFC]/.test(text);
}

/**
 * Formats mixed Arabic and English text for proper rendering in PDFKit:
 * 1. Accurately joins cursive Arabic letter glyphs using ArabicShaper
 * 2. Reorders Arabic words appropriately for visual RTL flow in LTR canvas
 * 3. Preserves English segments, numbers, symbols, and parentheses
 */
export function formatArabicForPdf(text: string | null | undefined): string {
  if (!text) return '';
  if (!hasArabicCharacters(text)) return text;

  // Handle strings with em-dash delimiters (e.g. "Arabic — English")
  if (text.includes(' — ')) {
    const parts = text.split(' — ');
    return parts.map((p) => formatArabicForPdf(p)).join(' — ');
  }

  // Handle parenthesized Arabic text like "Haqayeq (حقائق)" or "Category (حقائق)"
  if (/^[^(]*\([^)]*[\u0600-\u06FF][^)]*\)[^)]*$/.test(text)) {
    return text.replace(/\(([^)]+)\)/g, (match, inner) => {
      if (hasArabicCharacters(inner)) {
        return '(' + formatArabicForPdf(inner) + ')';
      }
      return match;
    });
  }

  // Split words by whitespace
  const words = text.split(/\s+/);
  const shapedWords = words.map((w) => {
    if (hasArabicCharacters(w)) {
      return ArabicShaper.convertArabic(w);
    }
    return w;
  });

  // Reorder words so that Arabic text flows naturally from right-to-left
  return shapedWords.reverse().join(' ');
}

/**
 * Resolves font paths for regular and bold TrueType fonts that support Unicode and Arabic
 */
export function getPdfFontPaths(): { regularFontPath: string; boldFontPath: string } {
  // Check candidate font directories
  const candidateDirs = [
    path.join(process.cwd(), 'public', 'fonts'),
    path.join(__dirname, '..', '..', '..', 'public', 'fonts'),
  ];

  const resourcesPath = (process as any).resourcesPath;
  if (resourcesPath) {
    candidateDirs.push(path.join(resourcesPath, 'standalone', 'public', 'fonts'));
  }

  let regularFontPath = '';
  let boldFontPath = '';

  for (const dir of candidateDirs) {
    const reg = path.join(dir, 'arial.ttf');
    const bold = path.join(dir, 'arialbd.ttf');
    if (!regularFontPath && fs.existsSync(reg)) regularFontPath = reg;
    if (!boldFontPath && fs.existsSync(bold)) boldFontPath = bold;
  }

  const winDir = process.env.WINDIR || process.env.SystemRoot || 'C:\\Windows';
  const sysFont = (name: string) => path.join(winDir, 'Fonts', name);

  if (!regularFontPath) regularFontPath = sysFont('arial.ttf');
  if (!boldFontPath) boldFontPath = sysFont('arialbd.ttf');

  return { regularFontPath, boldFontPath };
}
