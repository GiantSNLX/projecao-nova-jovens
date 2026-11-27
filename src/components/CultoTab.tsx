import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Copy, Download, Play, X } from 'lucide-react';
import type {
  AttendanceStatus,
  DeskAssignment,
  MediaAsset,
  MediaCategory,
  MemberUser,
  RunItem,
  ScreenTarget,
  ServiceSong,
  ServiceState,
} from '../types/portal';
import { DESK_POSITION_INFO, TEAM_LABELS } from '../data/initialState';
import {
  describeMediaTrigger,
  formatBytes,
  formatDuration,
  formatHolyricsVersions,
  generateAndDownloadHolyricsZip,
  sanitizeSlug,
} from '../utils/holyrics';
import { StageSimulator } from './StageSimulator';

interface CultoTabProps {
  state: ServiceState;
  members: MemberUser[];
  canOperateDesk: boolean;
  uploadedFilesMap: Map<string, File>;
  onSelectSchedule: (scheduleId: string) => void;
  onUpdateLiveNotes: (notes: string) => void;
  onRequestMediaAdjustment: (assetId: string, reason: string) => void;
  onRequestSongAdjustment: (songId: string, reason: string) => void;
  onPackageGenerated: (zipName: string, count: number) => void;
}

type Tone = 'ok' | 'attn' | 'danger' | 'muted';

const TONE_CLASS: Record<Tone, string> = {
  ok: 'text-ok',
  attn: 'text-attn',
  danger: 'text-danger',
  muted: 'text-ink-3',
};

const PRESENCE_LABELS: Record<AttendanceStatus, { label: string; tone: Tone }> = {
  CONFIRMED: { label: 'Confirmada', tone: 'ok' },
  PENDING: { label: 'Pendente', tone: 'attn' },
  DECLINED: { label: 'Ausência informada', tone: 'danger' },
};

const SCREEN_TARGET_LABELS: Record<ScreenTarget, string> = {
  ALL: 'Três telas',
  CENTER: 'Tela central',
  SIDES: 'Telas laterais',
  LEFT: 'Tela esquerda',
  RIGHT: 'Tela direita',
};

const CATEGORY_LABELS: Record<MediaCategory, string> = {
  VIDEO: 'Vídeo',
  IMAGE: 'Imagem',
  AUDIO: 'Áudio',
  DOCUMENT: 'Documento',
};

/* Controles: 44px no toque, 36px a partir de sm */
const BTN_SECONDARY =
  'btn-rb-surface inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-line px-3 text-sm font-medium text-ink-2 sm:min-h-9 disabled:opacity-50';
const BTN_PRIMARY =
  'btn-rb-primary inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-3.5 text-sm font-medium text-white sm:min-h-9 disabled:opacity-50';
const INPUT =
  'min-h-11 w-full min-w-0 rounded-md border border-line bg-sunken px-3 text-sm text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none sm:min-h-9';

function formatDateBr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

function StatusText({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${TONE_CLASS[tone]}`}>
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {children}
    </span>
  );
}

function presenceOf(asg: DeskAssignment): { label: string; tone: Tone } {
  if (asg.servingOnDesk) return { label: 'Na mesa', tone: 'ok' };
  return PRESENCE_LABELS[asg.attendanceStatus] ?? PRESENCE_LABELS.PENDING;
}

function mediaSpecs(m: MediaAsset): string {
  const parts: string[] = [CATEGORY_LABELS[m.category] ?? m.extension.toUpperCase()];
  if (m.widthPx && m.heightPx) {
    parts.push(`${m.widthPx}×${m.heightPx}${m.aspectRatio ? ` (${m.aspectRatio})` : ''}`);
  }
  if (m.durationSeconds) parts.push(formatDuration(m.durationSeconds));
  if (m.fileSizeBytes > 0) parts.push(formatBytes(m.fileSizeBytes));
  parts.push(SCREEN_TARGET_LABELS[m.targetScreen] ?? m.targetScreen);
  return parts.join(' · ');
}

export function CultoTab({
  state,
  members,
  canOperateDesk,
  uploadedFilesMap,
  onSelectSchedule,
  onUpdateLiveNotes,
  onRequestMediaAdjustment,
  onRequestSongAdjustment,
  onPackageGenerated,
}: CultoTabProps) {
  const [notesDraft, setNotesDraft] = useState(state.liveNotes);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal de teste de mídia e formulários de solicitação de ajuste
  const [testingAsset, setTestingAsset] = useState<MediaAsset | null>(null);
  const [adjustingMediaId, setAdjustingMediaId] = useState<string | null>(null);
  const [adjustingSongId, setAdjustingSongId] = useState<string | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  useEffect(() => {
    setNotesDraft(state.liveNotes);
  }, [state.liveNotes]);

  useEffect(() => {
    if (!testingAsset) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTestingAsset(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [testingAsset]);

  const upcomingSchedules = state.schedules
    .filter((s) => !s.isPast)
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));

  const currentSchedule =
    upcomingSchedules.find((s) => s.id === state.activeScheduleId) ??
    upcomingSchedules.find((s) => s.date === state.serviceDate) ??
    upcomingSchedules[0];

  const locationLabel = (sched?: { locationType: string; roomName?: string }) =>
    sched?.locationType === 'SALA' ? sched.roomName?.trim() || 'Sala' : 'Auditório Principal';

  const assignments = currentSchedule?.assignments ?? state.assignments;
  const confirmedCount = assignments.filter(
    (a) => a.servingOnDesk || a.attendanceStatus === 'CONFIRMED',
  ).length;

  const sortedItems = state.runItems.slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const onDemandMedia = state.mediaAssets.filter((m) => m.displayTrigger !== 'RUN_ITEM');

  const mediaForItem = (item: RunItem) =>
    state.mediaAssets.filter((m) => m.displayTrigger === 'RUN_ITEM' && m.runItemId === item.id);

  const songForItem = (item: RunItem) =>
    item.songCode ? state.songs.find((s) => s.songCode === item.songCode) : undefined;

  // Mesmo critério da aba Programação: encerramento não exige mídia e o Arranque
  // aceita a mídia de gatilho "Arranque".
  const isMediaMissing = (item: RunItem, itemMedia: MediaAsset[]) => {
    if (!item.requiresMedia || item.itemType === 'CLOSING' || itemMedia.length > 0) return false;
    const isArranque = item.title.toLowerCase().includes('arranque');
    return !(isArranque && state.mediaAssets.some((m) => m.displayTrigger === 'ARRANQUE'));
  };

  // Resumo do que está em aberto no culto selecionado
  let lyricsMissing = 0;
  let mediaMissing = 0;
  for (const item of sortedItems) {
    if (item.songCode) {
      const song = songForItem(item);
      if (!song || !song.rawLyrics.trim()) lyricsMissing += 1;
    }
    if (isMediaMissing(item, mediaForItem(item))) mediaMissing += 1;
  }
  const awaitingApproval =
    state.songs.filter((s) => s.rawLyrics.trim() && !s.approved).length +
    state.mediaAssets.filter((m) => !m.approved).length;
  const adjustmentsOpen =
    state.songs.filter((s) => s.adjustmentRequest).length +
    state.mediaAssets.filter((m) => m.adjustmentRequest).length;
  const openTotal = lyricsMissing + mediaMissing + awaitingApproval + adjustmentsOpen;

  const triggerLabel = (m: MediaAsset): string => {
    if (m.displayTrigger === 'RUN_ITEM') {
      const item = state.runItems.find((r) => r.id === m.runItemId);
      return item ? `${item.plannedTime} · ${item.title}` : 'Momento do roteiro';
    }
    return describeMediaTrigger(m, state);
  };

  const getSongVersions = (song: ServiceSong) => {
    const fallback = formatHolyricsVersions(song.rawLyrics || '', song.title);
    return {
      oneLine: song.holyricsOneLineTxt || fallback.oneLineTxt,
      twoLines: song.holyricsTwoLinesTxt || song.holyricsTxt || fallback.twoLinesTxt,
    };
  };

  const handleCopySong = async (song: ServiceSong, mode: 'one' | 'two') => {
    const versions = getSongVersions(song);
    const text = mode === 'one' ? versions.oneLine : versions.twoLines;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(`${song.id}-${mode}`);
      setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      // ignore
    }
  };

  const handleDownloadSong = (song: ServiceSong, mode: 'one' | 'two') => {
    const versions = getSongVersions(song);
    const text = mode === 'one' ? versions.oneLine : versions.twoLines;
    const label = mode === 'one' ? '1_linha_Retorno_Studio' : '2_linhas_Principal';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.songCode ? `${song.songCode}_` : ''}${sanitizeSlug(song.title)}_${label}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleDownloadIndividualMedia = (asset: MediaAsset) => {
    const rawFile = uploadedFilesMap.get(asset.id);
    if (rawFile) {
      const url = URL.createObjectURL(rawFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = asset.normalizedFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return;
    }

    // Arquivo de referência quando o binário não foi enviado nesta sessão do navegador
    const infoText = [
      `Arquivo de referência: ${asset.normalizedFilename}`,
      `Original: ${asset.originalFilename}`,
      `Quando exibir: ${triggerLabel(asset)}`,
      `Telas: ${SCREEN_TARGET_LABELS[asset.targetScreen] ?? asset.targetScreen}`,
      `Nota: ${asset.note || 'sem nota'}`,
      ``,
      `(Item de demonstração. Arquivos enviados na aba "Programação e mídias" são baixados no formato original.)`,
    ].join('\n');
    const blob = new Blob([infoText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${asset.normalizedFilename}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleDownloadHolyricsZip = async () => {
    setIsExporting(true);
    try {
      const res = await generateAndDownloadHolyricsZip(state, uploadedFilesMap);
      setExportedFilename(res.filename);
      onPackageGenerated(res.filename, res.fileCount);
    } finally {
      setIsExporting(false);
    }
  };

  const submitMediaAdjustment = (assetId: string) => {
    if (!adjustmentReason.trim()) return;
    onRequestMediaAdjustment(assetId, adjustmentReason.trim());
    setAdjustingMediaId(null);
    setAdjustmentReason('');
  };

  const submitSongAdjustment = (songId: string) => {
    if (!adjustmentReason.trim()) return;
    onRequestSongAdjustment(songId, adjustmentReason.trim());
    setAdjustingSongId(null);
    setAdjustmentReason('');
  };

  const renderAdjustmentNotice = (req: { requestedBy: string; reason: string }) => (
    <p className="mt-2 border-l-2 border-attn bg-attn/10 px-2.5 py-1.5 text-xs text-ink-2">
      <span className="font-medium text-attn">Ajuste solicitado por {req.requestedBy}:</span>{' '}
      {req.reason}
    </p>
  );

  const renderAdjustmentForm = (
    inputId: string,
    label: string,
    placeholder: string,
    onSubmit: () => void,
    onCancel: () => void,
  ) => (
    <form
      className="mt-2 flex flex-col gap-2 sm:flex-row"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        autoFocus
        value={adjustmentReason}
        onChange={(e) => setAdjustmentReason(e.target.value)}
        placeholder={placeholder}
        className={`${INPUT} sm:flex-1`}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!adjustmentReason.trim()}
          className={`${BTN_PRIMARY} flex-1 sm:flex-initial`}
        >
          Enviar solicitação
        </button>
        <button type="button" onClick={onCancel} className={BTN_SECONDARY}>
          Cancelar
        </button>
      </div>
    </form>
  );

  const renderMediaRow = (m: MediaAsset, showTrigger: boolean, stacked: boolean) => (
    <>
      <div
        className={`flex flex-col gap-2 ${
          stacked ? '' : 'sm:flex-row sm:items-start sm:justify-between sm:gap-4'
        }`}
      >
        <div className="min-w-0">
          <p className="truncate font-mono-tech text-xs text-ink" title={m.normalizedFilename}>
            {m.normalizedFilename}
          </p>
          <p className="mt-0.5 text-xs text-ink-3">{mediaSpecs(m)}</p>
          {showTrigger && <p className="mt-0.5 text-xs text-ink-2">{triggerLabel(m)}</p>}
          {m.note && (
            <p className="mt-0.5 text-xs text-ink-2">
              <span className="text-ink-3">Nota:</span> {m.note}
            </p>
          )}
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
            {m.adjustmentRequest ? (
              <StatusText tone="attn">Ajuste solicitado</StatusText>
            ) : m.approved ? (
              <StatusText tone="ok">Aprovada</StatusText>
            ) : (
              <StatusText tone="attn">Aguardando aprovação</StatusText>
            )}
            {m.validationStatus === 'WARNING' && (
              <StatusText tone="attn">Verificar formato</StatusText>
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setTestingAsset(m);
              setAdjustingMediaId(null);
              setAdjustmentReason('');
            }}
            aria-label={`Testar ${m.normalizedFilename}`}
            className={BTN_SECONDARY}
          >
            <Play className="h-4 w-4 shrink-0" />
            <span>Testar</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownloadIndividualMedia(m)}
            aria-label={`Baixar ${m.normalizedFilename}`}
            className={BTN_SECONDARY}
          >
            <Download className="h-4 w-4 shrink-0" />
            <span>Baixar</span>
          </button>
          <button
            type="button"
            aria-expanded={adjustingMediaId === m.id}
            onClick={() => {
              setAdjustingMediaId(adjustingMediaId === m.id ? null : m.id);
              setAdjustingSongId(null);
              setAdjustmentReason(m.adjustmentRequest?.reason ?? '');
            }}
            className={BTN_SECONDARY}
          >
            Solicitar ajuste
          </button>
        </div>
      </div>

      {m.adjustmentRequest && renderAdjustmentNotice(m.adjustmentRequest)}

      {adjustingMediaId === m.id &&
        renderAdjustmentForm(
          `ajuste-midia-${m.id}`,
          `Ajuste necessário em ${m.normalizedFilename}`,
          'Descreva o ajuste (ex.: veio em 9:16, sem áudio)',
          () => submitMediaAdjustment(m.id),
          () => {
            setAdjustingMediaId(null);
            setAdjustmentReason('');
          },
        )}
    </>
  );

  const renderSongBlock = (song: ServiceSong) => {
    const hasLyrics = Boolean(song.rawLyrics.trim());
    const slideNotes = song.slideNotes ? Object.entries(song.slideNotes) : [];

    return (
      <div className="mt-2">
        {hasLyrics ? (
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { mode: 'two', label: 'Copiar 2 linhas', screen: 'Principal', fileLabel: '2 linhas' },
                {
                  mode: 'one',
                  label: 'Copiar 1 linha',
                  screen: 'Retorno e Studio',
                  fileLabel: '1 linha',
                },
              ] as const
            ).map((v) => (
              <div
                key={v.mode}
                className="inline-flex max-w-full overflow-hidden rounded-md border border-line"
              >
                <button
                  type="button"
                  onClick={() => void handleCopySong(song, v.mode)}
                  aria-label={`${v.label} da letra ${song.title} (${v.screen})`}
                  className="inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-medium text-ink-2 hover:bg-ink/5 sm:min-h-9"
                >
                  <Copy className="h-4 w-4 shrink-0" />
                  {copiedKey === `${song.id}-${v.mode}` ? (
                    <span className="text-ok">Copiado</span>
                  ) : (
                    <span>
                      {v.label} <span className="font-normal text-ink-3">{v.screen}</span>
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSong(song, v.mode)}
                  aria-label={`Baixar letra ${song.title} em ${v.fileLabel} (.txt)`}
                  title={`Baixar .txt (${v.fileLabel})`}
                  className="inline-flex min-h-11 w-11 items-center justify-center border-l border-line text-ink-2 hover:bg-ink/5 sm:min-h-9 sm:w-9"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ))}

            <button
              type="button"
              aria-expanded={adjustingSongId === song.id}
              onClick={() => {
                setAdjustingSongId(adjustingSongId === song.id ? null : song.id);
                setAdjustingMediaId(null);
                setAdjustmentReason(song.adjustmentRequest?.reason ?? '');
              }}
              className={BTN_SECONDARY}
            >
              Solicitar ajuste
            </button>
          </div>
        ) : null}

        {song.notes && (
          <p className="mt-2 text-xs text-ink-2">
            <span className="text-ink-3">Observação da música:</span> {song.notes}
          </p>
        )}

        {slideNotes.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 text-xs text-ink-2">
            {slideNotes.map(([key, msg]) => {
              const [mode, idxStr] = key.split('-');
              const slideNum = Number(idxStr) + 1;
              const label = mode === 'one' ? '1 linha' : '2 linhas';
              return (
                <li key={key}>
                  <span className="text-ink-3">
                    Slide <span className="font-mono-tech">{slideNum}</span> ({label}):
                  </span>{' '}
                  {msg}
                </li>
              );
            })}
          </ul>
        )}

        {song.adjustmentRequest && renderAdjustmentNotice(song.adjustmentRequest)}

        {adjustingSongId === song.id &&
          renderAdjustmentForm(
            `ajuste-letra-${song.id}`,
            `Ajuste necessário na letra ${song.title}`,
            'O que precisa ser ajustado na letra?',
            () => submitSongAdjustment(song.id),
            () => {
              setAdjustingSongId(null);
              setAdjustmentReason('');
            },
          )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Culto selecionado */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-title">Culto</h1>
          {currentSchedule && (
            <p className="mt-1 flex flex-wrap gap-x-2 text-sm text-ink-3">
              {state.startsAtTime && (
                <span>
                  Início <span className="font-mono-tech text-ink-2">{state.startsAtTime}</span>
                </span>
              )}
              <span>{locationLabel(currentSchedule)}</span>
              {TEAM_LABELS[state.programmingTeam] && (
                <span>{TEAM_LABELS[state.programmingTeam].subtitle}</span>
              )}
            </p>
          )}
        </div>

        <div className="w-full sm:w-80">
          <label htmlFor="culto-select" className="block text-xs font-medium text-ink-3">
            Culto selecionado
          </label>
          <select
            id="culto-select"
            value={currentSchedule?.id ?? ''}
            disabled={upcomingSchedules.length === 0}
            onChange={(e) => onSelectSchedule(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm font-medium text-ink focus:border-accent focus:outline-none disabled:opacity-60"
          >
            {upcomingSchedules.length === 0 && <option value="">Nenhum culto programado</option>}
            {upcomingSchedules.map((sched) => (
              <option key={sched.id} value={sched.id}>
                {formatDateBr(sched.date)} · {sched.title} ({locationLabel(sched)})
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Escala da mesa */}
      <section aria-labelledby="culto-mesa-titulo">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="culto-mesa-titulo" className="section-title">
            Escala da mesa
          </h2>
          {assignments.length > 0 && (
            <span className="text-xs text-ink-3">
              Presença confirmada:{' '}
              <span className="font-mono-tech text-ink-2">
                {confirmedCount}/{assignments.length}
              </span>
            </span>
          )}
        </div>

        {assignments.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink-3">
            Nenhuma função escalada para este culto.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {assignments.map((asg) => {
              const member = members.find((m) => m.id === asg.userId);
              const pos = DESK_POSITION_INFO[asg.position];
              const presence = presenceOf(asg);
              return (
                <li key={asg.id} className="rounded-lg border border-line bg-surface px-3 py-2">
                  <p className="text-xs text-ink-3">{pos?.short ?? asg.position}</p>
                  <p className="truncate text-sm font-medium text-ink">
                    {member?.name ?? 'Sem membro definido'}
                  </p>
                  <p className="mt-0.5 text-xs">
                    <StatusText tone={presence.tone}>{presence.label}</StatusText>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Roteiro, pendências e conferência */}
        <section aria-labelledby="culto-roteiro-titulo" className="lg:col-span-8">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 id="culto-roteiro-titulo" className="section-title">
              Roteiro e conferência
            </h2>
            <span className="text-xs text-ink-3">
              {plural(sortedItems.length, 'momento', 'momentos')}
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-sunken px-3 py-2 text-xs sm:px-4">
              {openTotal === 0 ? (
                <StatusText tone="ok">Sem pendências. Letras e mídias conferidas.</StatusText>
              ) : (
                <>
                  <span className="font-medium text-ink-2">Em aberto</span>
                  {lyricsMissing > 0 && (
                    <StatusText tone="attn">
                      {plural(lyricsMissing, 'música', 'músicas')} aguardando letra
                    </StatusText>
                  )}
                  {mediaMissing > 0 && (
                    <StatusText tone="attn">
                      {plural(mediaMissing, 'mídia pendente', 'mídias pendentes')}
                    </StatusText>
                  )}
                  {awaitingApproval > 0 && (
                    <StatusText tone="attn">
                      {plural(awaitingApproval, 'item', 'itens')} aguardando aprovação
                    </StatusText>
                  )}
                  {adjustmentsOpen > 0 && (
                    <StatusText tone="attn">
                      {plural(adjustmentsOpen, 'ajuste solicitado', 'ajustes solicitados')}
                    </StatusText>
                  )}
                </>
              )}
            </div>

            {sortedItems.length === 0 ? (
              <p className="px-3 py-4 text-sm text-ink-3 sm:px-4">
                Roteiro ainda não cadastrado. A Programação envia o roteiro na aba Programação e
                mídias.
              </p>
            ) : (
              <ol className="divide-y divide-line-soft">
                {sortedItems.map((item) => {
                  const itemMedia = mediaForItem(item);
                  const linkedSong = songForItem(item);
                  const lyricsPending =
                    Boolean(item.songCode) && (!linkedSong || !linkedSong.rawLyrics.trim());
                  const mediaPending = isMediaMissing(item, itemMedia);

                  return (
                    <li
                      key={item.id}
                      className="flex flex-col gap-1 px-3 py-3 sm:grid sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-x-4 sm:px-4"
                    >
                      <div className="flex items-baseline gap-2 sm:block">
                        <p className="font-mono-tech text-sm font-medium text-ink">
                          {item.plannedTime}
                        </p>
                        {item.durationMinutes > 0 && (
                          <p className="font-mono-tech text-xs text-ink-4">
                            {item.durationMinutes} min
                          </p>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <h3 className="text-sm font-semibold text-ink sm:text-base">
                            {item.title}
                          </h3>
                          {item.songCode && (
                            <span className="font-mono-tech text-xs text-ink-3">
                              {item.songCode}
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-3">
                          {item.responsibleName && <span>{item.responsibleName}</span>}
                          {item.songCode && (
                            <span className="inline-flex items-center gap-1.5">
                              <span>Letra:</span>
                              {lyricsPending ? (
                                <StatusText tone="attn">Aguardando letra</StatusText>
                              ) : linkedSong?.adjustmentRequest ? (
                                <StatusText tone="attn">Ajuste solicitado</StatusText>
                              ) : linkedSong?.approved ? (
                                <StatusText tone="ok">Aprovada</StatusText>
                              ) : (
                                <StatusText tone="attn">Aguardando aprovação</StatusText>
                              )}
                            </span>
                          )}
                          {mediaPending && <StatusText tone="attn">Mídia pendente</StatusText>}
                        </p>

                        {linkedSong && renderSongBlock(linkedSong)}

                        {itemMedia.length > 0 && (
                          <ul className="mt-2 space-y-2">
                            {itemMedia.map((m) => (
                              <li
                                key={m.id}
                                className="rounded-md border border-line-soft bg-canvas px-3 py-2"
                              >
                                {renderMediaRow(m, false, false)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

        {/* Lateral: mídias sob demanda, aviso da mesa e pacote Holyrics */}
        <div className="space-y-4 lg:col-span-4">
          <section
            aria-labelledby="culto-demanda-titulo"
            className="overflow-hidden rounded-lg border border-line bg-surface"
          >
            <div className="border-b border-line px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <h2 id="culto-demanda-titulo" className="section-title">
                  Mídias sob demanda
                </h2>
                <span className="font-mono-tech text-xs text-ink-3">{onDemandMedia.length}</span>
              </div>
              <p className="mt-0.5 text-xs text-ink-3">
                Arranque, esquete, brincadeira ou quando solicitado.
              </p>
            </div>

            {onDemandMedia.length === 0 ? (
              <p className="px-4 py-3 text-sm text-ink-3">Nenhuma mídia sob demanda neste culto.</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {onDemandMedia.map((m) => (
                  <li key={m.id} className="px-4 py-3">
                    {renderMediaRow(m, true, true)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="culto-aviso-titulo"
            className="rounded-lg border border-line bg-surface p-4"
          >
            <h2 id="culto-aviso-titulo" className="section-title">
              Aviso da mesa
            </h2>
            {canOperateDesk ? (
              <>
                <label htmlFor="culto-aviso" className="mt-0.5 block text-xs text-ink-3">
                  Recado visível para toda a equipe durante o culto.
                </label>
                <textarea
                  id="culto-aviso"
                  rows={3}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  className="mt-2 w-full rounded-md border border-line bg-sunken px-3 py-2 text-base text-ink focus:border-accent focus:outline-none"
                />
                <button
                  type="button"
                  disabled={notesDraft === state.liveNotes}
                  onClick={() => onUpdateLiveNotes(notesDraft)}
                  className={`${BTN_SECONDARY} mt-2 w-full`}
                >
                  Salvar aviso
                </button>
              </>
            ) : (
              <p
                className={`mt-1.5 whitespace-pre-line text-sm ${
                  state.liveNotes.trim() ? 'text-ink-2' : 'text-ink-3'
                }`}
              >
                {state.liveNotes.trim() || 'Nenhum aviso para este culto.'}
              </p>
            )}
          </section>

          <section
            aria-labelledby="culto-pacote-titulo"
            className="rounded-lg border border-line bg-surface p-4"
          >
            <h2 id="culto-pacote-titulo" className="section-title">
              Pacote Holyrics
            </h2>
            <p className="mt-0.5 text-xs text-ink-3">
              Arquivo .zip com as letras em 1 linha (Retorno e Studio) e em 2 linhas (Principal),
              o roteiro e as mídias do culto.
            </p>

            {openTotal > 0 && (
              <p className="mt-2 text-xs text-attn">
                {plural(openTotal, 'pendência em aberto', 'pendências em aberto')}. Confira o
                roteiro antes de baixar.
              </p>
            )}

            <button
              type="button"
              disabled={isExporting}
              onClick={() => void handleDownloadHolyricsZip()}
              className="btn-rb-primary mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isExporting ? 'Gerando pacote…' : 'Baixar pacote Holyrics'}</span>
            </button>

            {exportedFilename && (
              <p className="mt-2 text-xs text-ok" role="status">
                Pacote gerado:{' '}
                <span className="break-all font-mono-tech text-ink-2">{exportedFilename}</span>
              </p>
            )}
          </section>
        </div>
      </div>

      {/* Modal de teste da mídia */}
      {testingAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6"
          onClick={() => setTestingAsset(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="culto-teste-titulo"
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-line-strong bg-surface sm:max-h-[calc(100dvh-3rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <h2 id="culto-teste-titulo" className="section-title">
                  Testar mídia
                </h2>
                <p
                  className="truncate font-mono-tech text-xs text-ink-2"
                  title={testingAsset.normalizedFilename}
                >
                  {testingAsset.normalizedFilename}
                </p>
                <p className="mt-0.5 text-xs text-ink-3">
                  {triggerLabel(testingAsset)}
                  {testingAsset.note ? ` · Nota: ${testingAsset.note}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTestingAsset(null)}
                aria-label="Fechar teste de mídia"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-2 hover:bg-ink/5 sm:h-9 sm:w-9"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {testingAsset.category === 'AUDIO' && testingAsset.objectUrl ? (
                <div>
                  <p className="mb-2 text-xs text-ink-3">Reprodutor de áudio</p>
                  <audio controls src={testingAsset.objectUrl} className="w-full" />
                </div>
              ) : (
                <StageSimulator
                  screens={state.screens}
                  initialUrl={testingAsset.objectUrl}
                  initialFilename={testingAsset.originalFilename}
                />
              )}

              {!testingAsset.objectUrl && (
                <p className="mt-3 text-xs text-ink-3">
                  Item de demonstração, sem arquivo anexado. Vídeos e imagens enviados pela
                  Programação são exibidos nas três telas.
                </p>
              )}
            </div>

            <form
              className="flex flex-col gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-center"
              onSubmit={(e) => {
                e.preventDefault();
                if (!adjustmentReason.trim()) return;
                submitMediaAdjustment(testingAsset.id);
                setTestingAsset(null);
              }}
            >
              <button
                type="button"
                onClick={() => handleDownloadIndividualMedia(testingAsset)}
                className={BTN_SECONDARY}
              >
                <Download className="h-4 w-4" />
                <span>Baixar arquivo</span>
              </button>

              <label htmlFor="culto-teste-ajuste" className="sr-only">
                Ajuste necessário nesta mídia
              </label>
              <input
                id="culto-teste-ajuste"
                type="text"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Descreva o ajuste, se necessário"
                className={`${INPUT} sm:ml-auto sm:max-w-sm sm:flex-1`}
              />
              <button
                type="submit"
                disabled={!adjustmentReason.trim()}
                className={BTN_PRIMARY}
              >
                Solicitar ajuste
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
