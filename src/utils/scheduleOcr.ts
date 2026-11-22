import { createWorker } from 'tesseract.js';
import type { RunItem, RunItemType, ServiceSong } from '../types/portal';

export interface ParsedScheduleResult {
  detectedDate?: string;
  rawText: string;
  runItems: RunItem[];
  detectedSongs: ServiceSong[];
}

function classifyItemType(title: string): RunItemType {
  const lower = title.toLowerCase();
  if (/^m\d+\s*[:.-]/.test(lower)) return 'WORSHIP';
  if (lower.includes('vídeo') || lower.includes('video') || lower.includes('abertura')) return 'OPENING';
  if (lower.includes('aviso')) return 'ANNOUNCEMENTS';
  if (lower.includes('mensagem') || lower.includes('palavra') || lower.includes('pregação')) return 'WORD';
  if (lower.includes('oferta') || lower.includes('dízimo')) return 'OFFERING';
  if (lower.includes('fim') || lower.includes('encerramento') || lower.includes('oração final')) return 'CLOSING';
  return 'PROGRAMMING';
}

function normalizeTimePrefix(rawLine: string): string {
  return rawLine
    .replace(/^[lI](\d)/, '1$1')
    .replace(/(\d{1,2})[hH]([oO0]{2})/, '$1h00')
    .replace(/(\d{1,2})[hH:](\d{2})/, '$1:$2');
}

/**
 * Remove lixo visual do rodapé (logos "NOVA JOVENS 2 | PROGRAMAÇÃO ABC J2")
 * mantendo apenas a linha de data/título e os horários até "FIM".
 */
export function cleanScheduleOcrText(rawOcr: string): string {
  const lines = rawOcr
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const kept: string[] = [];

  for (const line of lines) {
    // Keep title/date line at top if it has a date like 21/11/2026
    if (/\d{2}\/\d{2}\/\d{4}/.test(line) && kept.length === 0) {
      kept.push(line);
      continue;
    }

    const norm = normalizeTimePrefix(line);
    if (/^\d{1,2}:\d{2}\s*/.test(norm)) {
      kept.push(line);
      // Stop reading right after the "FIM" line so bottom logos are ignored
      if (/\bfim\b/i.test(line)) break;
    }
  }

  return kept.join('\n');
}

/**
 * Interpreta o texto de um roteiro no padrão Nova Jovens (ex.: "19h00 – Vídeo Nova Jovens 2 (1min)").
 */
export function parseScheduleText(
  rawText: string,
  teamLabel = 'Programação',
  addedBy = 'Programação',
): ParsedScheduleResult {
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let detectedDate: string | undefined;
  const runItems: RunItem[] = [];
  const detectedSongs: ServiceSong[] = [];

  for (const rawLine of lines) {
    const dateMatch = rawLine.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateMatch && !detectedDate) {
      detectedDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }

    const normalizedLine = normalizeTimePrefix(rawLine);
    const lineMatch = normalizedLine.match(
      /^(\d{1,2}:\d{2})\s*[–—\-=~.]*\s*(.+)$/,
    );
    if (!lineMatch) continue;

    const timeParts = lineMatch[1].split(':');
    const plannedTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1]}`;
    let rest = lineMatch[2].trim();

    let durationMinutes = 5;
    const durMatch = rest.match(/\((\d+|[lI])\s*min\)/i);
    if (durMatch) {
      durationMinutes =
        durMatch[1].toLowerCase() === 'l' || durMatch[1].toLowerCase() === 'i'
          ? 1
          : Number(durMatch[1]) || 5;
      rest = rest.replace(durMatch[0], '').trim();
    } else if (/^fim$/i.test(rest)) {
      durationMinutes = 0;
    }

    rest = rest.replace(/^M([1-9lI])\s*[:.-]\s*/i, (_, num: string) => {
      const fixed = num.toLowerCase() === 'l' || num.toLowerCase() === 'i' ? '1' : num;
      return `M${fixed}: `;
    });

    const songMatch = rest.match(/^(M\d+):\s*(.+)$/i);
    const itemType = classifyItemType(rest);
    const runId = `run-${Date.now()}-${runItems.length + 1}`;

    runItems.push({
      id: runId,
      orderIndex: runItems.length + 1,
      plannedTime,
      durationMinutes,
      title: rest,
      description: songMatch
        ? `Música ${songMatch[1].toUpperCase()} — letra no Holyrics.`
        : itemType === 'CLOSING'
          ? 'Encerramento do culto.'
          : `${teamLabel} · ${plannedTime}`,
      itemType,
      responsibleName: songMatch ? 'Música' : teamLabel,
      songCode: songMatch ? songMatch[1].toUpperCase() : undefined,
      requiresMedia: itemType !== 'WORSHIP' && itemType !== 'CLOSING',
      liveStatus: 'PENDING',
    });

    if (songMatch) {
      const songTitle = songMatch[2].trim();
      const songCode = songMatch[1].toUpperCase();
      detectedSongs.push({
        id: `sng-${Date.now()}-${detectedSongs.length + 1}`,
        songCode,
        orderIndex: detectedSongs.length + 1,
        title: songTitle,
        rawLyrics: '',
        holyricsTxt: '',
        approved: false,
        validatedBySchedule: false,
        addedBy,
      });
    }
  }

  return {
    detectedDate,
    rawText,
    runItems,
    detectedSongs,
  };
}

/**
 * Normaliza nome de música removendo acentos, pontuações, parênteses e palavras curtas comuns
 * para validar músicas mesmo com pequenas variações entre Música e Roteiro.
 */
export function normalizeSongTitle(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^m\d+\s*[:.-]\s*/i, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarityTokens(text: string): string[] {
  const stopWords = new Set(['de', 'do', 'da', 'dos', 'das', 'e', 'a', 'o', 'em', 'por', 'para', 'ao', 'um', 'uma']);
  return normalizeSongTitle(text)
    .split(' ')
    .filter((w) => w.length > 1 && !stopWords.has(w));
}

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function findMatchingSong(
  scheduleSongTitle: string,
  existingSongs: ServiceSong[],
  usedIds: Set<string> = new Set(),
): ServiceSong | undefined {
  const targetNorm = normalizeSongTitle(scheduleSongTitle);
  const targetTokens = similarityTokens(scheduleSongTitle);
  if (!targetNorm) return undefined;

  let bestMatch: ServiceSong | undefined;
  let bestScore = 0;

  for (const song of existingSongs) {
    if (usedIds.has(song.id)) continue;
    const candNorm = normalizeSongTitle(song.title);
    if (!candNorm) continue;

    if (candNorm === targetNorm) return song;

    let score = 0;
    if (candNorm.includes(targetNorm) || targetNorm.includes(candNorm)) {
      const minLen = Math.min(candNorm.length, targetNorm.length);
      if (minLen >= 4) score = Math.max(score, 0.9);
    }

    const candTokens = similarityTokens(song.title);
    if (targetTokens.length > 0 && candTokens.length > 0) {
      let matchedTokens = 0;
      for (const tt of targetTokens) {
        const hit = candTokens.some(
          (ct) => ct === tt || (tt.length >= 4 && ct.length >= 4 && editDistance(tt, ct) <= 1),
        );
        if (hit) matchedTokens += 1;
      }
      const ratio = matchedTokens / Math.max(targetTokens.length, candTokens.length);
      if (ratio >= 0.55 || (matchedTokens >= 2 && matchedTokens / Math.min(targetTokens.length, candTokens.length) >= 0.8)) {
        score = Math.max(score, ratio);
      }
    }

    const maxLen = Math.max(candNorm.length, targetNorm.length);
    if (maxLen > 0) {
      const charSim = 1 - editDistance(candNorm, targetNorm) / maxLen;
      if (charSim >= 0.72) score = Math.max(score, charSim);
    }

    if (score > bestScore && score >= 0.55) {
      bestScore = score;
      bestMatch = song;
    }
  }

  return bestMatch;
}

/**
 * Executa OCR em português direto no navegador e já limpa o rodapé dos logotipos.
 */
export async function readScheduleFromImage(
  file: File,
  teamLabel: string,
  addedBy: string,
  onProgress?: (pct: number) => void,
): Promise<ParsedScheduleResult> {
  const worker = await createWorker('por', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round((m.progress || 0) * 100));
      }
    },
  });

  try {
    const { data } = await worker.recognize(file);
    const cleaned = cleanScheduleOcrText(data.text);
    return parseScheduleText(cleaned || data.text, teamLabel, addedBy);
  } finally {
    await worker.terminate();
  }
}
