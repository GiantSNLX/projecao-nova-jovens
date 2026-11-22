import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import { formatHolyricsVersions } from './holyrics';

// Bundle PDF.js worker cleanly in Vite / GitHub Pages
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export interface ExtractedSongFromDoc {
  title: string;
  rawLyrics: string;
  oneLineTxt: string;
  twoLinesTxt: string;
}

const PT_CONNECTOR_ENDINGS = new Set([
  'e',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'em',
  'na',
  'no',
  'nas',
  'nos',
  'para',
  'pra',
  'pro',
  'com',
  'sem',
  'por',
  'pelo',
  'pela',
  'que',
  'o',
  'a',
  'os',
  'as',
  'um',
  'uma',
  'ao',
  'à',
  'às',
  'aos',
  'seu',
  'sua',
  'seus',
  'suas',
  'meu',
  'minha',
  'teu',
  'tua',
  'nosso',
  'nossa',
  'não',
  'nem',
  'mas',
  'ou',
  'se',
]);

function fixExtractionSpacing(line: string): string {
  // Corrige apenas junção evidente de extração (ex.: "JESUSENQUANTO" -> "JESUS ENQUANTO" não é trivial sem dicionário,
  // mas camel/digit/punctuation colados como "DeusFiel" ou "Senhor,eu" são corrigidos com segurança)
  return line
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/([a-záéíóúâêôãõç])([A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,})/g, '$1 $2')
    .replace(/([,.;!?])([A-Za-zÀ-ÿ])/g, '$1 $2')
    .trim();
}

function shouldMergeVisualWrap(prevLine: string, nextLine: string): boolean {
  if (!prevLine || !nextLine) return false;
  if (/^\[.+\]$/.test(prevLine) || /^\[.+\]$/.test(nextLine)) return false;
  if (/[.!?…]$/.test(prevLine)) return false;

  // Hyphenated wrap or ending in connector + next line starts lowercase / single orphan word
  if (prevLine.endsWith('-')) return true;

  const words = prevLine.toLowerCase().replace(/[,;:]+$/, '').split(/\s+/);
  const lastWord = words[words.length - 1] ?? '';
  const nextStartsLower = /^[a-záéíóúâêôãõç]/.test(nextLine);
  const nextIsSingleWord = nextLine.split(/\s+/).length === 1 && nextLine.length <= 14;

  if (PT_CONNECTOR_ENDINGS.has(lastWord) && (nextStartsLower || nextIsSingleWord)) {
    return true;
  }

  // Also merge when previous line has comma/no terminal punctuation and next starts lowercase
  if (nextStartsLower && !/[—–-]$/.test(prevLine)) {
    return true;
  }

  return false;
}

/**
 * Normaliza blocos de texto preservando ordem, repetições e unindo apenas quebras visuais de largura.
 */
export function normalizeSlideBlocks(
  blocks: string[][],
  songTitleToStrip?: string,
): string {
  const cleanTitle = songTitleToStrip?.trim().toLowerCase();
  const normalizedBlocks: string[] = [];

  for (let bIdx = 0; bIdx < blocks.length; bIdx += 1) {
    const rawLines = blocks[bIdx]
      .map(fixExtractionSpacing)
      .filter(Boolean);

    if (rawLines.length === 0) continue;

    // Remove title if it appears alone as header on the first slide/page
    if (
      bIdx === 0 &&
      cleanTitle &&
      rawLines[0].toLowerCase() === cleanTitle
    ) {
      rawLines.shift();
    }
    if (rawLines.length === 0) continue;

    // Merge visual line wraps inside the same slide/stanza
    const merged: string[] = [];
    for (const line of rawLines) {
      if (merged.length > 0 && shouldMergeVisualWrap(merged[merged.length - 1], line)) {
        const prev = merged[merged.length - 1];
        merged[merged.length - 1] = prev.endsWith('-')
          ? `${prev.slice(0, -1)}${line}`
          : `${prev} ${line}`;
      } else {
        merged.push(line);
      }
    }

    normalizedBlocks.push(merged.join('\n'));
  }

  return normalizedBlocks.join('\n\n');
}

function splitMultiSongText(pages: string[][], fallbackTitle: string): { title: string; blocks: string[][] }[] {
  // Detect explicit song markers like "M1:", "M2:", "1.", "Música 1:" at the start of a slide/page
  const songs: { title: string; blocks: string[][] }[] = [];
  let current: { title: string; blocks: string[][] } | null = null;

  for (const pageLines of pages) {
    const cleaned = pageLines.map(fixExtractionSpacing).filter(Boolean);
    if (cleaned.length === 0) continue;

    const first = cleaned[0];
    const marker = first.match(/^(?:M\d+|Música\s*\d+|\d+\s*[-.)])\s*[:.-]?\s*(.+)$/i);

    if (marker && first.length <= 70) {
      if (current && current.blocks.length > 0) songs.push(current);
      current = {
        title: marker[1].trim(),
        blocks: cleaned.length > 1 ? [cleaned.slice(1)] : [],
      };
    } else {
      if (!current) {
        current = { title: fallbackTitle, blocks: [] };
      }
      current.blocks.push(cleaned);
    }
  }

  if (current && current.blocks.length > 0) {
    songs.push(current);
  }

  return songs.length > 0 ? songs : [{ title: fallbackTitle, blocks: pages }];
}

export async function extractLyricsFromPptx(file: File): Promise<ExtractedSongFromDoc[]> {
  const zip = await JSZip.loadAsync(file);
  const slideEntries = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      return na - nb;
    });

  const slidesLines: string[][] = [];
  const parser = new DOMParser();

  for (const entryName of slideEntries) {
    const xmlStr = await zip.files[entryName].async('text');
    const doc = parser.parseFromString(xmlStr, 'application/xml');
    const paragraphs = Array.from(doc.getElementsByTagName('a:p'));

    const lines: string[] = [];
    for (const p of paragraphs) {
      const runs = Array.from(p.getElementsByTagName('a:t'));
      const text = runs.map((r) => r.textContent ?? '').join('');
      const fixed = fixExtractionSpacing(text);
      if (fixed) lines.push(fixed);
    }

    if (lines.length > 0) {
      slidesLines.push(lines);
    }
  }

  const baseTitle = file.name.replace(/\.[^.]+$/, '');
  const grouped = splitMultiSongText(slidesLines, baseTitle);

  return grouped.map((g) => {
    const rawLyrics = normalizeSlideBlocks(g.blocks, g.title);
    const { oneLineTxt, twoLinesTxt } = formatHolyricsVersions(rawLyrics, g.title);
    return {
      title: g.title,
      rawLyrics,
      oneLineTxt,
      twoLinesTxt,
    };
  });
}

export async function extractLyricsFromPdf(file: File): Promise<ExtractedSongFromDoc[]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pagesLines: string[][] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group items by Y coordinate to preserve visual lines in exact top-to-bottom order
    const rows: { y: number; items: { x: number; str: string }[] }[] = [];
    for (const item of textContent.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const x = item.transform[4];
      const y = item.transform[5];
      let row = rows.find((r) => Math.abs(r.y - y) <= 4);
      if (!row) {
        row = { y, items: [] };
        rows.push(row);
      }
      row.items.push({ x, str: item.str });
    }

    rows.sort((a, b) => b.y - a.y);
    const lines = rows
      .map((r) =>
        r.items
          .sort((a, b) => a.x - b.x)
          .map((i) => i.str)
          .join(' '),
      )
      .map(fixExtractionSpacing)
      .filter(Boolean);

    if (lines.length > 0) {
      pagesLines.push(lines);
    }
  }

  const baseTitle = file.name.replace(/\.[^.]+$/, '');
  const grouped = splitMultiSongText(pagesLines, baseTitle);

  return grouped.map((g) => {
    const rawLyrics = normalizeSlideBlocks(g.blocks, g.title);
    const { oneLineTxt, twoLinesTxt } = formatHolyricsVersions(rawLyrics, g.title);
    return {
      title: g.title,
      rawLyrics,
      oneLineTxt,
      twoLinesTxt,
    };
  });
}

export async function extractLyricsFromDocument(file: File): Promise<ExtractedSongFromDoc[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.pptx')) return extractLyricsFromPptx(file);
  if (lower.endsWith('.pdf')) return extractLyricsFromPdf(file);
  if (lower.endsWith('.txt')) {
    const text = await file.text();
    const rawBlocks = text
      .replace(/\r\n/g, '\n')
      .split(/\n\s*\n/)
      .map((b) => b.split('\n').filter(Boolean));
    const title = file.name.replace(/\.[^.]+$/, '');
    const rawLyrics = normalizeSlideBlocks(rawBlocks, title);
    const { oneLineTxt, twoLinesTxt } = formatHolyricsVersions(rawLyrics, title);
    return [{ title, rawLyrics, oneLineTxt, twoLinesTxt }];
  }
  throw new Error('Envie um arquivo .pdf, .pptx ou .txt.');
}
