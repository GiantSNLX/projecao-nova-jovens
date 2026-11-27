import JSZip from 'jszip';
import type {
  MediaAsset,
  MediaCategory,
  MediaValidationStatus,
  ServiceState,
  StageScreen,
} from '../types/portal';
import { TEAM_LABELS, TRIGGER_LABELS } from '../data/initialState';

const VIDEO_EXTS = ['.mp4', '.mov', '.mkv', '.avi', '.wmv', '.webm'];
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg'];
const AUDIO_EXTS = ['.mp3', '.wav', '.aac', '.ogg'];
const DOC_EXTS = ['.pdf'];

export function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
}

export function detectMediaCategory(filename: string): MediaCategory | null {
  const ext = getExtension(filename);
  if (VIDEO_EXTS.includes(ext)) return 'VIDEO';
  if (IMAGE_EXTS.includes(ext)) return 'IMAGE';
  if (AUDIO_EXTS.includes(ext)) return 'AUDIO';
  if (DOC_EXTS.includes(ext)) return 'DOCUMENT';
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) return '-';
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function sanitizeSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Formata uma letra fielmente para o Holyrics 2.29.1 sem alterar ordem ou repetições.
 * Gera duas versões:
 *  - 1 linha por slide (para Retorno e Studio)
 *  - até 2 linhas consecutivas por slide (para Principal)
 */
export function formatHolyricsVersions(
  rawLyrics: string,
  songTitleToExclude?: string,
): { oneLineTxt: string; twoLinesTxt: string } {
  const cleanTitle = songTitleToExclude?.trim().toLowerCase();

  const stanzas = rawLyrics
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !/^\[.+\]$/.test(l)),
    )
    .filter((lines) => lines.length > 0);

  // Strip song title if it is the very first standalone line
  if (
    stanzas.length > 0 &&
    cleanTitle &&
    stanzas[0][0]?.toLowerCase() === cleanTitle
  ) {
    stanzas[0].shift();
    if (stanzas[0].length === 0) stanzas.shift();
  }

  const allSingleLines: string[] = [];
  const twoLineBlocks: string[] = [];

  for (const lines of stanzas) {
    for (const line of lines) {
      allSingleLines.push(line);
    }

    for (let i = 0; i < lines.length; i += 2) {
      const pair = lines.slice(i, i + 2);
      twoLineBlocks.push(pair.join('\n'));
    }
  }

  return {
    oneLineTxt: allSingleLines.join('\n\n'),
    twoLinesTxt: twoLineBlocks.join('\n\n'),
  };
}

export function formatLyricsForHolyrics(
  rawLyrics: string,
  title: string,
  _artist = '',
  _key?: string,
  _bpm?: number,
): string {
  return formatHolyricsVersions(rawLyrics, title).twoLinesTxt;
}

export function validateMediaForHolyrics(params: {
  filename: string;
  fileSizeBytes: number;
  widthPx?: number;
  heightPx?: number;
  screens: StageScreen[];
}): {
  category: MediaCategory | null;
  status: MediaValidationStatus;
  aspectRatio?: string;
  messages: string[];
} {
  const ext = getExtension(params.filename);
  const category = detectMediaCategory(params.filename);
  const messages: string[] = [];

  if (ext === '.ppt' || ext === '.pptx') {
    return {
      category: 'DOCUMENT',
      status: 'REJECTED',
      messages: [
        'Bloqueado: PPT/PPTX quebra fontes e exige PowerPoint na mesa. Exporte os slides em PDF ou imagens PNG/JPG 16:9.',
      ],
    };
  }

  if (!category) {
    return {
      category: null,
      status: 'REJECTED',
      messages: [
        `Bloqueado: formato "${ext || 'sem extensão'}" não é aceito nos telões. Use MP4/MOV/MKV/WEBM, PNG/JPG, MP3/WAV ou PDF.`,
      ],
    };
  }

  let status: MediaValidationStatus = 'VALID';
  let aspectRatio: string | undefined;

  if (params.widthPx && params.heightPx) {
    const ratio = params.widthPx / params.heightPx;
    const target169 = 16 / 9;
    const is169 = Math.abs(ratio - target169) <= 0.05;
    aspectRatio = is169 ? '16:9' : `${params.widthPx}:${params.heightPx}`;

    if (!is169) {
      const orient = params.widthPx < params.heightPx ? 'vertical' : 'fora do padrão 16:9';
      return {
        category,
        status: 'REJECTED',
        aspectRatio,
        messages: [
          `Bloqueado: o arquivo tem ${params.widthPx}×${params.heightPx} (${orient}). Reexporte em 16:9 (1920×1080, 3200×1800 ou 3840×2160).`,
        ],
      };
    }

    messages.push(`Proporção 16:9 validada (${params.widthPx}×${params.heightPx}).`);

    if (params.widthPx < 1280) {
      status = 'WARNING';
      messages.push(
        `Resolução baixa (${params.widthPx}×${params.heightPx}). O mínimo recomendado para os telões é 1280×720.`,
      );
    }
  } else if (category === 'AUDIO') {
    messages.push(`Áudio ${ext} compatível com o player do Holyrics.`);
  } else if (category === 'DOCUMENT' && ext === '.pdf') {
    messages.push('PDF aceito para importação direta no Holyrics.');
  }

  const sizeMb = params.fileSizeBytes / (1024 * 1024);
  if (category === 'VIDEO' && sizeMb > 450) {
    status = 'WARNING';
    messages.push(`Vídeo pesado (${sizeMb.toFixed(0)} MB). Teste a fluidez na mesa.`);
  }

  return { category, status, aspectRatio, messages };
}

export async function readMediaMetadata(file: File): Promise<{
  widthPx?: number;
  heightPx?: number;
  durationSeconds?: number;
}> {
  const category = detectMediaCategory(file.name);
  if (!category) return {};

  const url = URL.createObjectURL(file);
  try {
    if (category === 'IMAGE') {
      return await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ widthPx: img.naturalWidth, heightPx: img.naturalHeight });
        img.onerror = () => resolve({});
        img.src = url;
      });
    }

    if (category === 'VIDEO') {
      return await new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () =>
          resolve({
            widthPx: video.videoWidth || undefined,
            heightPx: video.videoHeight || undefined,
            durationSeconds: Number.isFinite(video.duration) ? video.duration : undefined,
          });
        video.onerror = () => resolve({});
        video.src = url;
      });
    }

    if (category === 'AUDIO') {
      return await new Promise((resolve) => {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.onloadedmetadata = () =>
          resolve({
            durationSeconds: Number.isFinite(audio.duration) ? audio.duration : undefined,
          });
        audio.onerror = () => resolve({});
        audio.src = url;
      });
    }

    return {};
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function describeMediaTrigger(asset: MediaAsset, state: ServiceState): string {
  if (asset.displayTrigger === 'ON_REQUEST') {
    return asset.requestedBy
      ? `Quando solicitado por: ${asset.requestedBy}`
      : 'Quando solicitado';
  }
  if (asset.displayTrigger === 'RUN_ITEM') {
    const item = state.runItems.find((r) => r.id === asset.runItemId);
    return item ? `${item.plannedTime} · ${item.title}` : 'No momento do roteiro';
  }
  return TRIGGER_LABELS[asset.displayTrigger];
}

export function buildHolyricsPackageJson(state: ServiceState) {
  return {
    portal: 'Projeção Nova Jovens 2',
    holyricsTarget: true,
    service: {
      id: state.id,
      title: state.title,
      date: state.serviceDate,
      startsAt: state.startsAtTime,
      programmingTeam: state.programmingTeam,
    },
    screens: state.screens,
    runOrder: state.runItems
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((item) => ({
        order: item.orderIndex,
        time: item.plannedTime,
        durationMinutes: item.durationMinutes,
        title: item.title,
        songCode: item.songCode,
        mediaFiles: state.mediaAssets
          .filter((m) => m.displayTrigger === 'RUN_ITEM' && m.runItemId === item.id)
          .map((m) => ({
            filename: m.normalizedFilename,
            note: m.note,
            targetScreen: m.targetScreen,
          })),
      })),
    onDemandMedia: state.mediaAssets
      .filter((m) => m.displayTrigger !== 'RUN_ITEM')
      .map((m) => ({
        filename: m.normalizedFilename,
        whenToDisplay: describeMediaTrigger(m, state),
        note: m.note,
        targetScreen: m.targetScreen,
      })),
    songs: state.songs
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((s) => ({
        code: s.songCode,
        order: s.orderIndex,
        title: s.title,
        artist: s.artist,
        key: s.key,
        txtFilename: `${s.songCode ? `${s.songCode}_` : `${String(s.orderIndex).padStart(2, '0')}_`}${sanitizeSlug(s.title)}.txt`,
      })),
  };
}

export async function generateAndDownloadHolyricsZip(
  state: ServiceState,
  uploadedFilesMap: Map<string, File>,
): Promise<{ filename: string; fileCount: number }> {
  const zip = new JSZip();
  const teamInfo = TEAM_LABELS[state.programmingTeam];

  const importFolder = zip.folder('00_Roteiro_e_Importacao');
  const lyricsFolder = zip.folder('01_Letras_Musicas_TXT');
  const mediaRootFolder = zip.folder('02_Midias_do_Culto');

  const sortedRun = state.runItems.slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const sortedSongs = state.songs.slice().sort((a, b) => a.orderIndex - b.orderIndex);

  const roteiroTxt = [
    `PROJEÇÃO NOVA JOVENS 2 · ROTEIRO PARA HOLYRICS`,
    `Culto: ${state.title} | Data: ${state.serviceDate} (${state.startsAtTime})`,
    `Programação: ${teamInfo.name}`,
    `Telões: Central 3840x2160 (16:9) | Laterais 3200x1800 (16:9)`,
    `========================================================`,
    '',
    ...sortedRun.map(
      (item) =>
        `${item.plannedTime} – ${item.title} (${item.durationMinutes}min)\n` +
        `  Responsável: ${item.responsibleName}`,
    ),
    '',
    `========================================================`,
    `NOTAS E GATILHOS DAS MÍDIAS:`,
    ...state.mediaAssets.map(
      (m) =>
        `- ${m.normalizedFilename}\n` +
        `  Quando exibir: ${describeMediaTrigger(m, state)}\n` +
        `  Telas: ${m.targetScreen}\n` +
        `  Nota: ${m.note || 'Sem nota adicional.'}`,
    ),
  ].join('\n');

  const pkgJson = buildHolyricsPackageJson(state);

  importFolder?.file('roteiro_culto.txt', roteiroTxt);
  importFolder?.file('culto_holyrics.json', JSON.stringify(pkgJson, null, 2));

  const oneLineFolder = lyricsFolder?.folder('01 - 1 linha');
  const twoLinesFolder = lyricsFolder?.folder('02 - 2 linhas');

  for (const song of sortedSongs) {
    const prefix = song.songCode ? `${song.songCode}_` : `${String(song.orderIndex).padStart(2, '0')}_`;
    const fileName = `${prefix}${sanitizeSlug(song.title)}.txt`;
    const fallback = formatHolyricsVersions(
      song.rawLyrics || 'Letra não informada',
      song.title,
    );
    const oneLine = song.holyricsOneLineTxt || fallback.oneLineTxt;
    const twoLines = song.holyricsTwoLinesTxt || song.holyricsTxt || fallback.twoLinesTxt;

    oneLineFolder?.file(fileName, oneLine);
    twoLinesFolder?.file(fileName, twoLines);
  }

  let mediaCount = 0;

  // Run-item bound media
  for (const item of sortedRun) {
    const blockAssets = state.mediaAssets.filter(
      (m) => m.displayTrigger === 'RUN_ITEM' && m.runItemId === item.id,
    );
    if (blockAssets.length === 0) continue;

    const folderName = `${String(item.orderIndex).padStart(2, '0')}_${sanitizeSlug(item.title).slice(0, 28)}`;
    const blockFolder = mediaRootFolder?.folder(folderName);

    for (const asset of blockAssets) {
      const realFile = uploadedFilesMap.get(asset.id);
      if (realFile) {
        blockFolder?.file(asset.normalizedFilename, realFile);
      } else {
        blockFolder?.file(
          `${asset.normalizedFilename}.nota.txt`,
          `Arquivo: ${asset.originalFilename}\nQuando exibir: ${describeMediaTrigger(asset, state)}\nNota: ${asset.note}`,
        );
      }
      mediaCount += 1;
    }
  }

  // On-demand media (Quando solicitado, Arranque, Esquete, Brincadeira)
  const onDemandAssets = state.mediaAssets.filter((m) => m.displayTrigger !== 'RUN_ITEM');
  if (onDemandAssets.length > 0) {
    const onDemandFolder = mediaRootFolder?.folder('00_Momentos_Especiais_e_Sob_Demanda');
    const notesSummary: string[] = [];

    for (const asset of onDemandAssets) {
      const realFile = uploadedFilesMap.get(asset.id);
      if (realFile) {
        onDemandFolder?.file(asset.normalizedFilename, realFile);
      }
      notesSummary.push(
        `Arquivo: ${asset.normalizedFilename}\nQuando exibir: ${describeMediaTrigger(asset, state)}\nTelas: ${asset.targetScreen}\nNota: ${asset.note || 'sem nota'}\n`,
      );
      mediaCount += 1;
    }
    onDemandFolder?.file('LEIA_ME_GATILHOS.txt', notesSummary.join('\n---\n'));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const zipFilename = `Culto_${state.serviceDate}_${state.programmingTeam}_Holyrics.zip`;

  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = zipFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);

  return {
    filename: zipFilename,
    fileCount: sortedSongs.length + mediaCount + 2,
  };
}

export function getMediaAssetResolutionSummary(asset: MediaAsset): string {
  if (asset.widthPx && asset.heightPx) {
    return `${asset.widthPx}×${asset.heightPx}${asset.aspectRatio ? ` (${asset.aspectRatio})` : ''}`;
  }
  if (asset.durationSeconds) {
    return `Duração ${formatDuration(asset.durationSeconds)}`;
  }
  return asset.extension.toUpperCase();
}
