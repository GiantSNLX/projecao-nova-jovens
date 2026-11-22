import { createWorker } from 'tesseract.js';
import type { RunItem, RunItemType, ServiceSong } from '../types/portal';
import { formatLyricsForHolyrics } from './holyrics';

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
    // Detect date like 21/11/2026
    const dateMatch = rawLine.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateMatch && !detectedDate) {
      detectedDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }

    // Normalize common OCR typos in time: l9h00, 19hOO, 19:00
    const normalizedLine = rawLine
      .replace(/^[lI](\d)/, '1$1')
      .replace(/(\d{1,2})[hH]([oO0]{2})/, '$1h00')
      .replace(/(\d{1,2})[hH:](\d{2})/, '$1:$2');

    const lineMatch = normalizedLine.match(
      /^(\d{1,2}:\d{2})\s*[–—\-=~.]*\s*(.+)$/,
    );
    if (!lineMatch) continue;

    const timeParts = lineMatch[1].split(':');
    const plannedTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1]}`;
    let rest = lineMatch[2].trim();

    // Extract duration "(5min)" or "(lmin)"
    let durationMinutes = 5;
    const durMatch = rest.match(/\((\d+|[lI])\s*min\)/i);
    if (durMatch) {
      durationMinutes = durMatch[1].toLowerCase() === 'l' || durMatch[1].toLowerCase() === 'i'
        ? 1
        : Number(durMatch[1]) || 5;
      rest = rest.replace(durMatch[0], '').trim();
    } else if (/^fim$/i.test(rest)) {
      durationMinutes = 0;
    }

    // Fix common OCR M1/M2/M3/M4 reading like "Ml:" or "M1."
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
      const placeholderLyrics = `[Verso 1]\nAguardando Ministério de Música importar a letra de ${songTitle}`;
      detectedSongs.push({
        id: `sng-${Date.now()}-${detectedSongs.length + 1}`,
        songCode,
        orderIndex: detectedSongs.length + 1,
        title: songTitle,
        artist: '',
        key: '',
        rawLyrics: '',
        holyricsTxt: formatLyricsForHolyrics(placeholderLyrics, songTitle, ''),
        approved: false,
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
 * Executa OCR real em português direto no navegador a partir de uma imagem do roteiro.
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
    return parseScheduleText(data.text, teamLabel, addedBy);
  } finally {
    await worker.terminate();
  }
}
