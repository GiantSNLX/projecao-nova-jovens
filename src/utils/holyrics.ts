import JSZip from 'jszip';
import type {
  MediaAsset,
  MediaCategory,
  MediaValidationStatus,
  ServiceState,
  StageScreen,
} from '../types/portal';
import { TEAM_LABELS } from '../data/initialState';

const VIDEO_EXTS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm'];
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.bmp', '.gif'];
const AUDIO_EXTS = ['.mp3', '.wav', '.aac', '.ogg', '.flac'];
const DOC_EXTS = ['.pdf', '.ppt', '.pptx'];

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
  if (!seconds || !Number.isFinite(seconds)) return '—';
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

export function formatLyricsForHolyrics(
  rawLyrics: string,
  title: string,
  artist: string,
  key?: string,
  bpm?: number,
): string {
  const headerParts = [`${title.trim()}${artist.trim() ? ` - ${artist.trim()}` : ''}`];
  const metaParts: string[] = [];
  if (key?.trim()) metaParts.push(`Tom: ${key.trim()}`);
  if (bpm) metaParts.push(`BPM: ${bpm}`);
  if (metaParts.length > 0) headerParts.push(metaParts.join(' | '));

  const blocks = rawLyrics
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const formattedBlocks: string[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    let label = '';
    let lyricLines = lines;
    if (/^\[.+\]$/.test(lines[0])) {
      label = lines[0];
      lyricLines = lines.slice(1);
    }

    // Break into Holyrics-friendly 2 to 4 line widescreen slides
    if (lyricLines.length <= 4) {
      formattedBlocks.push(label ? `${label}\n${lyricLines.join('\n')}` : lyricLines.join('\n'));
    } else {
      for (let i = 0; i < lyricLines.length; i += 2) {
        const chunk = lyricLines.slice(i, i + 2);
        const prefix = i === 0 && label ? `${label}\n` : '';
        formattedBlocks.push(`${prefix}${chunk.join('\n')}`);
      }
    }
  }

  return `${headerParts.join('\n')}\n\n${formattedBlocks.join('\n\n')}`.trim();
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

  if (!category) {
    return {
      category: null,
      status: 'REJECTED',
      messages: [
        `Formato "${ext || 'sem extensão'}" não é aceito pelo Holyrics. Consulte a guia de especificações aceitas.`,
      ],
    };
  }

  let status: MediaValidationStatus = 'VALID';
  let aspectRatio: string | undefined;

  if (ext === '.ppt' || ext === '.pptx') {
    status = 'WARNING';
    messages.push(
      'PowerPoint (.ppt/.pptx) no Holyrics só funciona no Windows com PowerPoint instalado na mesa. Recomendado converter para .pdf ou .png 16:9.',
    );
  }

  if (params.widthPx && params.heightPx) {
    const ratio = params.widthPx / params.heightPx;
    const target169 = 16 / 9;
    const is169 = Math.abs(ratio - target169) <= 0.03;
    aspectRatio = is169 ? '16:9' : `${params.widthPx}:${params.heightPx}`;

    if (!is169) {
      status = 'WARNING';
      messages.push(
        `Proporção detectada (${params.widthPx}×${params.heightPx}) foge do padrão 16:9 dos três telões. Pode gerar barras pretas ou cortes.`,
      );
    } else {
      messages.push(`Proporção 16:9 validada (${params.widthPx}×${params.heightPx}).`);
    }

    const centerScreen = params.screens.find((s) => s.code === 'CENTER');
    if (centerScreen && params.widthPx < 1280) {
      status = 'WARNING';
      messages.push(
        `Baixa resolução (${params.widthPx}×${params.heightPx}) para o Telão Central (${centerScreen.widthPx}×${centerScreen.heightPx}).`,
      );
    } else if (centerScreen && params.widthPx === centerScreen.widthPx && params.heightPx === centerScreen.heightPx) {
      messages.push(
        `Resolução nativa exata do Telão Central (${centerScreen.widthPx}×${centerScreen.heightPx}).`,
      );
    }
  } else if (category === 'AUDIO') {
    messages.push(`Áudio ${ext} compatível com o player integrado do Holyrics.`);
  } else if (category === 'DOCUMENT' && ext === '.pdf') {
    messages.push('Documento PDF compatível com importação direta no Holyrics.');
  }

  const sizeMb = params.fileSizeBytes / (1024 * 1024);
  if (category === 'VIDEO' && sizeMb > 450) {
    status = 'WARNING';
    messages.push(
      `Vídeo com ${sizeMb.toFixed(0)} MB pode exigir hardware mais forte na mesa do Holyrics.`,
    );
  }

  return {
    category,
    status,
    aspectRatio,
    messages,
  };
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
    // Keep URL lifetime handled separately when storing asset
    URL.revokeObjectURL(url);
  }
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
      status: state.status,
    },
    screens: state.screens,
    runOrder: state.runItems
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((item) => ({
        order: item.orderIndex,
        time: item.plannedTime,
        durationMinutes: item.durationMinutes,
        type: item.itemType,
        title: item.title,
        responsible: item.responsibleName,
        notes: item.description,
        mediaFiles: state.mediaAssets
          .filter((m) => m.runItemId === item.id)
          .map((m) => ({
            filename: m.normalizedFilename,
            targetScreen: m.targetScreen,
            category: m.category,
            validationStatus: m.validationStatus,
          })),
      })),
    songs: state.songs
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((s) => ({
        order: s.orderIndex,
        title: s.title,
        artist: s.artist,
        key: s.key,
        bpm: s.bpm,
        approved: s.approved,
        txtFilename: `${String(s.orderIndex).padStart(2, '0')}_${sanitizeSlug(s.title)}.txt`,
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
    `========================================================`,
    `PORTAL PROJEÇÃO NOVA JOVENS 2 — ROTEIRO PARA HOLYRICS`,
    `Culto: ${state.title} | Data: ${state.serviceDate} (${state.startsAtTime})`,
    `Programação: ${teamInfo.name} (${teamInfo.phonetic})`,
    `Telões: Central 3840x2160 (16:9) | Laterais 3200x1800 (16:9)`,
    `========================================================`,
    '',
    ...sortedRun.map(
      (item) =>
        `${String(item.orderIndex).padStart(2, '0')}. [${item.plannedTime} | ${item.durationMinutes}min] ${item.title}\n` +
        `    Responsável: ${item.responsibleName} | Tipo: ${item.itemType}\n` +
        `    Detalhes: ${item.description}` +
        (item.captainNotes ? `\n    Nota da Mesa: ${item.captainNotes}` : ''),
    ),
  ].join('\n\n');

  const pkgJson = buildHolyricsPackageJson(state);

  const holyricsScript = `// Script auxiliar para referência com Holyrics API Server (https://github.com/holyrics/API-Server)
// Culto: ${state.title} (${state.serviceDate}) - ${teamInfo.name}
const CULTO_DATA = ${JSON.stringify(pkgJson, null, 2)};

// Exemplo de integração: percorra CULTO_DATA.songs e CULTO_DATA.runOrder
// para montar a playlist via endpoints locais do API Server do Holyrics.
console.log("Roteiro carregado:", CULTO_DATA.service.title, CULTO_DATA.runOrder.length, "blocos");
`;

  importFolder?.file('roteiro_culto.txt', roteiroTxt);
  importFolder?.file('culto_holyrics.json', JSON.stringify(pkgJson, null, 2));
  importFolder?.file('script_holyrics_import.js', holyricsScript);

  const allLyricsCombined: string[] = [];
  for (const song of sortedSongs) {
    const fileName = `${String(song.orderIndex).padStart(2, '0')}_${sanitizeSlug(song.title)}.txt`;
    lyricsFolder?.file(fileName, song.holyricsTxt);
    allLyricsCombined.push(song.holyricsTxt);
  }
  lyricsFolder?.file('todas_musicas_semana.txt', allLyricsCombined.join('\n\n==============================\n\n'));

  let mediaCount = 0;
  for (const item of sortedRun) {
    const blockAssets = state.mediaAssets.filter((m) => m.runItemId === item.id);
    if (blockAssets.length === 0 && !item.requiresMedia) continue;

    const folderName = `${String(item.orderIndex).padStart(2, '0')}_${sanitizeSlug(item.title).slice(0, 32)}`;
    const blockFolder = mediaRootFolder?.folder(folderName);

    if (blockAssets.length === 0) {
      blockFolder?.file(
        'LEIA_ME.txt',
        `Bloco "${item.title}" marcado como exige mídia, mas nenhum arquivo foi anexado ainda.`,
      );
      continue;
    }

    for (const asset of blockAssets) {
      const realFile = uploadedFilesMap.get(asset.id);
      if (realFile) {
        blockFolder?.file(asset.normalizedFilename, realFile);
      } else {
        // Demo placeholder metadata file when file was pre-seeded without local binary
        blockFolder?.file(
          `${asset.normalizedFilename}.info.txt`,
          [
            `Arquivo de referência (pré-cadastrado na demonstração): ${asset.originalFilename}`,
            `Destino de tela: ${asset.targetScreen}`,
            `Dimensões: ${asset.widthPx ?? '?'}x${asset.heightPx ?? '?'} (${asset.aspectRatio ?? 'N/A'})`,
            `Status Holyrics: ${asset.validationStatus}`,
            `Observação: Suba o arquivo real na aba Programação para empacotar o binário aqui.`,
          ].join('\n'),
        );
      }
      mediaCount += 1;
    }
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
    fileCount: sortedSongs.length + mediaCount + 4,
  };
}

export function getMediaAssetResolutionSummary(asset: MediaAsset): string {
  if (asset.widthPx && asset.heightPx) {
    return `${asset.widthPx}×${asset.heightPx} (${asset.aspectRatio ?? '—'})`;
  }
  if (asset.durationSeconds) {
    return `Duração ${formatDuration(asset.durationSeconds)}`;
  }
  return asset.extension.toUpperCase();
}
