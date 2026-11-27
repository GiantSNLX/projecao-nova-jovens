import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileImage,
  FileText,
  FileUp,
  Loader2,
  Pause,
  Play,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import type {
  MediaAsset,
  MediaDisplayTrigger,
  MediaRoleLabel,
  ProgrammingTeam,
  RunItem,
  ScreenTarget,
  ServiceSong,
  ServiceState,
} from '../types/portal';
import {
  SAMPLE_SCHEDULE_TEXT,
  TEAM_LABELS,
} from '../data/initialState';
import {
  describeMediaTrigger,
  formatBytes,
  getExtension,
  getMediaAssetResolutionSummary,
  readMediaMetadata,
  sanitizeSlug,
  validateMediaForHolyrics,
} from '../utils/holyrics';
import { findMatchingSong, parseScheduleText, readScheduleFromImage } from '../utils/scheduleOcr';
import { StageSimulator } from './StageSimulator';

interface ProgrammingTabProps {
  state: ServiceState;
  canEditProgramming: boolean;
  isLeader: boolean;
  activeUserName: string;
  onChangeTeam: (team: ProgrammingTeam) => void;
  onReplaceScheduleFromImport: (params: {
    runItems: RunItem[];
    detectedSongs: ServiceSong[];
    detectedDate?: string;
    sourceLabel: string;
  }) => void;
  onAddMediaAsset: (asset: MediaAsset, rawFile?: File) => void;
  onToggleApproveMedia: (assetId: string) => void;
  onRemoveMediaAsset: (assetId: string) => void;
}

const MEDIA_ROLE_OPTIONS: {
  value: MediaRoleLabel;
  label: string;
  accept: string;
}[] = [
  { value: 'VIDEO', label: 'Vídeo', accept: '.mp4,.mov,.mkv,.avi,.wmv,.webm' },
  { value: 'IMAGEM', label: 'Imagem', accept: '.png,.jpg,.jpeg' },
  { value: 'BG', label: 'Som de fundo (BG)', accept: '.mp3,.wav,.aac,.ogg' },
  { value: 'APRESENTACAO', label: 'Apresentação (PDF)', accept: '.pdf' },
];

const ROLE_BADGE_LABELS: Record<MediaRoleLabel, string> = {
  VIDEO: 'Vídeo',
  IMAGEM: 'Imagem',
  BG: 'Som de fundo',
  APRESENTACAO: 'Apresentação',
};

/** ".mp4,.mov" -> "MP4, MOV" para exibir os formatos aceitos. */
const formatAcceptLabel = (accept?: string) =>
  (accept ?? '')
    .split(',')
    .map((ext) => ext.replace('.', '').trim().toUpperCase())
    .filter(Boolean)
    .join(', ');

/** Botão de linha: 44px no celular, compacto a partir do tablet. */
const ROW_BUTTON =
  'inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors sm:h-8';
const ROW_ICON_BUTTON =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors sm:h-8 sm:w-8';
const FIELD =
  'min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none sm:min-h-10 sm:text-sm';

export function ProgrammingTab({
  state,
  canEditProgramming,
  isLeader,
  activeUserName,
  onChangeTeam,
  onReplaceScheduleFromImport,
  onAddMediaAsset,
  onToggleApproveMedia,
  onRemoveMediaAsset,
}: ProgrammingTabProps) {
  // Schedule OCR state
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [scheduleImagePreview, setScheduleImagePreview] = useState<string | null>(null);
  const [draftScheduleText, setDraftScheduleText] = useState('');
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Modal state for attaching media to a schedule row (or 'EXTRA' for standalone media)
  const [attachingTargetId, setAttachingTargetId] = useState<string | null>(null);
  const [mediaRole, setMediaRole] = useState<MediaRoleLabel>('VIDEO');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [displayTrigger, setDisplayTrigger] = useState<MediaDisplayTrigger>('RUN_ITEM');
  const [requestedBy, setRequestedBy] = useState('');
  const [mediaNote, setMediaNote] = useState('');
  const [targetScreen, setTargetScreen] = useState<ScreenTarget>('ALL');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Simulator & inline playback state
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [simulatorUrl, setSimulatorUrl] = useState<string | undefined>(undefined);
  const [simulatorFilename, setSimulatorFilename] = useState<string | undefined>(undefined);
  const [simulatorPlaying, setSimulatorPlaying] = useState<boolean>(false);

  // Inline audio player for BG tracks
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Filtro do roteiro: todos os momentos ou só os pendentes
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  // No celular/tablet o simulador fica abaixo do roteiro: rola até ele ao exibir uma mídia
  const simulatorRef = useRef<HTMLElement | null>(null);
  const revealSimulator = () => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    simulatorRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  // Fecha o modal de envio com Esc
  useEffect(() => {
    if (!attachingTargetId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAttachingTargetId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [attachingTargetId]);

  const sortedRunItems = useMemo(
    () => state.runItems.slice().sort((a, b) => a.orderIndex - b.orderIndex),
    [state.runItems],
  );

  const attachingItem = useMemo(
    () =>
      attachingTargetId && attachingTargetId !== 'EXTRA'
        ? sortedRunItems.find((i) => i.id === attachingTargetId)
        : undefined,
    [attachingTargetId, sortedRunItems],
  );

  const openAttachForRunItem = (item: RunItem, defaultRole: MediaRoleLabel = 'VIDEO') => {
    setAttachingTargetId(item.id);
    setMediaRole(defaultRole);
    setPendingFile(null);
    setPendingPreviewUrl(null);
    setUploadError(null);
    setMediaNote('');
    setRequestedBy('');
    if (item.title.toLowerCase().includes('arranque')) {
      setDisplayTrigger('ARRANQUE');
    } else if (item.title.toLowerCase().includes('esquete')) {
      setDisplayTrigger('ESQUETE');
    } else if (item.title.toLowerCase().includes('brincadeira')) {
      setDisplayTrigger('BRINCADEIRA');
    } else {
      setDisplayTrigger('RUN_ITEM');
    }
  };

  const openAttachExtra = () => {
    setAttachingTargetId('EXTRA');
    setMediaRole('IMAGEM');
    setPendingFile(null);
    setPendingPreviewUrl(null);
    setUploadError(null);
    setMediaNote('');
    setRequestedBy('');
    setDisplayTrigger('ON_REQUEST');
  };

  const validateAndSetFile = async (file: File) => {
    setUploadError(null);
    const meta = await readMediaMetadata(file);
    const check = validateMediaForHolyrics({
      filename: file.name,
      fileSizeBytes: file.size,
      widthPx: meta.widthPx,
      heightPx: meta.heightPx,
      screens: state.screens,
    });

    if (check.status === 'REJECTED' || !check.category) {
      setPendingFile(null);
      setPendingPreviewUrl(null);
      setUploadError(check.messages[0] ?? 'Formato ou proporção não aceitos.');
      return;
    }

    if (check.category === 'AUDIO') setMediaRole('BG');
    else if (check.category === 'DOCUMENT') setMediaRole('APRESENTACAO');
    else if (check.category === 'IMAGE') setMediaRole('IMAGEM');
    else if (check.category === 'VIDEO') setMediaRole('VIDEO');

    const url = URL.createObjectURL(file);
    setPendingFile(file);
    setPendingPreviewUrl(url);
    if (check.category === 'VIDEO' || check.category === 'IMAGE') {
      setSimulatorUrl(url);
      setSimulatorFilename(file.name);
      setSimulatorPlaying(check.category === 'VIDEO');
    }
  };

  const handleConfirmAttach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingFile) {
      setUploadError('Escolha um arquivo válido antes de enviar.');
      return;
    }
    if (displayTrigger === 'ON_REQUEST' && !requestedBy.trim()) {
      setUploadError('Informe quem vai solicitar esta mídia.');
      return;
    }

    const meta = await readMediaMetadata(pendingFile);
    const check = validateMediaForHolyrics({
      filename: pendingFile.name,
      fileSizeBytes: pendingFile.size,
      widthPx: meta.widthPx,
      heightPx: meta.heightPx,
      screens: state.screens,
    });

    if (!check.category || check.status === 'REJECTED') {
      setUploadError(check.messages[0] ?? 'Arquivo não aceito.');
      return;
    }

    const item = attachingItem;
    const ext = getExtension(pendingFile.name);
    const baseName = sanitizeSlug(pendingFile.name.slice(0, pendingFile.name.length - ext.length));
    const roleTag = mediaRole === 'BG' ? 'BG_' : '';

    const prefix = item
      ? `${String(item.orderIndex).padStart(2, '0')}_${roleTag}`
      : displayTrigger === 'ON_REQUEST'
        ? `SOLICITADO_${roleTag}`
        : `${displayTrigger}_${roleTag}`;

    const newAsset: MediaAsset = {
      id: `med-${Date.now()}`,
      runItemId: item?.id,
      mediaRole,
      displayTrigger: item && displayTrigger === 'RUN_ITEM' ? 'RUN_ITEM' : displayTrigger,
      requestedBy: displayTrigger === 'ON_REQUEST' ? requestedBy.trim() : undefined,
      note: mediaNote.trim(),
      targetScreen,
      category: check.category,
      originalFilename: pendingFile.name,
      normalizedFilename: `${prefix}${baseName}${ext}`,
      extension: ext,
      mimeType: pendingFile.type || 'application/octet-stream',
      fileSizeBytes: pendingFile.size,
      widthPx: meta.widthPx,
      heightPx: meta.heightPx,
      aspectRatio: check.aspectRatio,
      durationSeconds: meta.durationSeconds,
      validationStatus: check.status,
      validationMessages: check.messages,
      uploadedBy: activeUserName,
      createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      approved: false,
      objectUrl: pendingPreviewUrl ?? URL.createObjectURL(pendingFile),
    };

    onAddMediaAsset(newAsset, pendingFile);
    setActiveMediaId(newAsset.id);
    setPendingFile(null);
    setAttachingTargetId(null);
    setMediaNote('');
    setRequestedBy('');
  };

  const handleInlinePlayPause = (asset: MediaAsset) => {
    if (asset.category === 'AUDIO') {
      if (!asset.objectUrl) return;
      if (playingAudioId === asset.id) {
        bgAudioRef.current?.pause();
        setPlayingAudioId(null);
        return;
      }
      if (bgAudioRef.current) {
        bgAudioRef.current.pause();
      }
      const audio = new Audio(asset.objectUrl);
      audio.onended = () => setPlayingAudioId(null);
      bgAudioRef.current = audio;
      setPlayingAudioId(asset.id);
      void audio.play().catch(() => setPlayingAudioId(null));
      return;
    }

    // For Video or Image: send to the 3-screen Telão on the right (or generate demo frame if placeholder)
    if (asset.objectUrl) {
      if (activeMediaId === asset.id && asset.category === 'VIDEO') {
        setSimulatorPlaying((p) => !p);
      } else {
        setActiveMediaId(asset.id);
        setSimulatorUrl(asset.objectUrl);
        setSimulatorFilename(asset.originalFilename);
        setSimulatorPlaying(asset.category === 'VIDEO');
        revealSimulator();
      }
      return;
    }

    // Demo placeholder preview synthesis on canvas (simula o telão, por isso fundo escuro)
    const offscreen = document.createElement('canvas');
    offscreen.width = 1920;
    offscreen.height = 1080;
    const ctx = offscreen.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0b0c0e';
      ctx.fillRect(0, 0, 1920, 1080);
      ctx.strokeStyle = '#3a3d44';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 40, 1840, 1000);
      ctx.fillStyle = '#edeef0';
      ctx.textAlign = 'center';
      ctx.font = '700 68px "Host Grotesk", sans-serif';
      ctx.fillText(asset.normalizedFilename, 960, 510);
      ctx.fillStyle = '#9b9fa7';
      ctx.font = '500 36px "JetBrains Mono", monospace';
      ctx.fillText(
        `${getMediaAssetResolutionSummary(asset)} · ${asset.targetScreen}`,
        960,
        580,
      );
      setActiveMediaId(asset.id);
      setSimulatorUrl(offscreen.toDataURL('image/png'));
      setSimulatorFilename(`${asset.normalizedFilename}.png`);
      setSimulatorPlaying(false);
      revealSimulator();
    }
  };

  const handleScheduleImageUpload = async (file: File) => {
    setOcrError(null);
    setImportSuccessMsg(null);
    setShowScheduleEditor(true);
    setScheduleImagePreview(URL.createObjectURL(file));
    setOcrLoading(true);
    setOcrProgress(0);

    try {
      const parsed = await readScheduleFromImage(
        file,
        `Equipe ${TEAM_LABELS[state.programmingTeam].name}`,
        activeUserName,
        (pct) => setOcrProgress(pct),
      );
      setDraftScheduleText(parsed.rawText.trim());
    } catch {
      setOcrError('Não foi possível ler a imagem. Digite ou cole o roteiro no campo abaixo.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleApplyParsedSchedule = () => {
    setOcrError(null);
    setImportSuccessMsg(null);
    const textToParse = draftScheduleText.trim();
    if (!textToParse) {
      setOcrError('Importe a imagem do roteiro ou cole o texto no campo abaixo.');
      return;
    }

    const parsed = parseScheduleText(
      textToParse,
      `Equipe ${TEAM_LABELS[state.programmingTeam].name}`,
      activeUserName,
    );

    if (parsed.runItems.length === 0) {
      setOcrError(
        'Nenhum momento encontrado. Use uma linha por momento, por exemplo: 19h00 - Vídeo de abertura (1min).',
      );
      return;
    }

    onReplaceScheduleFromImport({
      runItems: parsed.runItems,
      detectedSongs: parsed.detectedSongs,
      detectedDate: parsed.detectedDate,
      sourceLabel: scheduleImagePreview ? 'imagem do roteiro' : 'texto do roteiro',
    });

    setShowScheduleEditor(false);
    setImportSuccessMsg(
      `Roteiro importado: ${parsed.runItems.length} ${parsed.runItems.length === 1 ? 'momento' : 'momentos'}.`,
    );
  };

  const rowsWithStatus = useMemo(() => {
    return sortedRunItems.map((item) => {
      const attachedMedia = state.mediaAssets.filter(
        (m) =>
          m.runItemId === item.id ||
          (!m.runItemId &&
            item.title.toLowerCase().includes('arranque') &&
            m.displayTrigger === 'ARRANQUE'),
      );

      if (item.itemType === 'WORSHIP' || item.songCode) {
        const matchedSong =
          state.songs.find((s) => s.songCode && s.songCode === item.songCode) ||
          findMatchingSong(item.title, state.songs);
        const songReady = Boolean(matchedSong && matchedSong.rawLyrics.trim().length > 0);
        return {
          item,
          isSong: true,
          matchedSong,
          attachedMedia,
          isReady: songReady,
        };
      }

      const isClosing = item.itemType === 'CLOSING';
      const isReady = isClosing ? true : item.requiresMedia ? attachedMedia.length > 0 : true;
      return {
        item,
        isSong: false,
        matchedSong: undefined,
        attachedMedia,
        isReady,
      };
    });
  }, [sortedRunItems, state.mediaAssets, state.songs]);

  const extraMedia = useMemo(
    () =>
      state.mediaAssets.filter(
        (m) =>
          !m.runItemId &&
          !(
            m.displayTrigger === 'ARRANQUE' &&
            sortedRunItems.some((r) => r.title.toLowerCase().includes('arranque'))
          ),
      ),
    [state.mediaAssets, sortedRunItems],
  );

  const readyCount = rowsWithStatus.filter((r) => r.isReady).length;
  const pendingCount = rowsWithStatus.length - readyCount;
  const visibleRows = showOnlyPending
    ? rowsWithStatus.filter((r) => !r.isReady)
    : rowsWithStatus;
  const canEditNow = canEditProgramming && !state.isFrozen;
  const acceptLabel = formatAcceptLabel(
    MEDIA_ROLE_OPTIONS.find((o) => o.value === mediaRole)?.accept,
  );

  const renderMomentStatus = (row: (typeof rowsWithStatus)[number]) => {
    const { item, isSong, attachedMedia, isReady } = row;

    if (isSong) {
      return isReady ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-ok">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Letra pronta
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-attn">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Letra pendente
        </span>
      );
    }

    if (item.itemType === 'CLOSING') return null;

    if (attachedMedia.length > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-ok">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="font-mono-tech">{attachedMedia.length}</span>
          {attachedMedia.length === 1 ? 'mídia' : 'mídias'}
        </span>
      );
    }

    if (item.requiresMedia) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-attn">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Mídia pendente
        </span>
      );
    }

    return <span className="text-xs text-ink-4">Mídia opcional</span>;
  };

  const renderMediaRowItem = (asset: MediaAsset, context?: string) => {
    const roleLabel = asset.mediaRole
      ? ROLE_BADGE_LABELS[asset.mediaRole]
      : asset.category === 'AUDIO'
        ? 'Som de fundo'
        : asset.category === 'DOCUMENT'
          ? 'Apresentação'
          : asset.category === 'IMAGE'
            ? 'Imagem'
            : 'Vídeo';

    const isCurrentlyPlaying =
      asset.category === 'AUDIO'
        ? playingAudioId === asset.id
        : activeMediaId === asset.id &&
          (asset.category === 'IMAGE' || simulatorPlaying);

    const isSelected = activeMediaId === asset.id || playingAudioId === asset.id;
    const showPause =
      isCurrentlyPlaying && (asset.category === 'VIDEO' || asset.category === 'AUDIO');
    const PlayIcon = showPause ? Pause : asset.category === 'IMAGE' ? Eye : Play;

    const playLabel =
      asset.category === 'AUDIO'
        ? `${isCurrentlyPlaying ? 'Pausar' : 'Ouvir'} ${asset.normalizedFilename}`
        : asset.category === 'IMAGE'
          ? `Mostrar ${asset.normalizedFilename} nos telões`
          : `${isCurrentlyPlaying ? 'Pausar' : 'Reproduzir'} ${asset.normalizedFilename} nos telões`;

    const meta = [roleLabel, context, formatBytes(asset.fileSizeBytes)]
      .filter(Boolean)
      .join(' · ');
    const warning =
      asset.validationStatus === 'WARNING' ? asset.validationMessages[0] : undefined;

    return (
      <div
        key={asset.id}
        className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg px-2 py-1.5 transition-colors ${
          isSelected ? 'bg-accent/10 ring-1 ring-inset ring-accent/40' : 'bg-sunken'
        }`}
      >
        <div className="flex min-w-0 flex-1 basis-48 items-center gap-2.5">
          {asset.category === 'DOCUMENT' ? (
            <span className={`${ROW_ICON_BUTTON} text-ink-3`} aria-hidden="true">
              <FileText className="h-4 w-4" />
            </span>
          ) : (
            <button
              type="button"
              onClick={() => handleInlinePlayPause(asset)}
              aria-label={playLabel}
              aria-pressed={isCurrentlyPlaying}
              className={`${ROW_ICON_BUTTON} ${
                isCurrentlyPlaying
                  ? 'bg-accent-solid text-white hover:bg-accent-strong'
                  : 'border border-line bg-surface text-ink-2 hover:bg-ink/5 hover:text-ink'
              }`}
            >
              <PlayIcon className="h-4 w-4" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <p
              className="font-mono-tech truncate text-xs font-medium text-ink"
              title={asset.normalizedFilename}
            >
              {asset.normalizedFilename}
            </p>
            <p className="text-xs text-ink-3">{meta}</p>
            {asset.note && <p className="text-xs text-ink-2">{asset.note}</p>}
            {warning && (
              <p className="mt-0.5 flex items-start gap-1 text-xs text-attn">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{warning}</span>
              </p>
            )}
            {asset.adjustmentRequest && (
              <p className="mt-0.5 text-xs text-attn">
                Ajuste solicitado: {asset.adjustmentRequest.reason}
              </p>
            )}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {isLeader ? (
            <button
              type="button"
              onClick={() => onToggleApproveMedia(asset.id)}
              aria-pressed={asset.approved}
              aria-label={
                asset.approved
                  ? `Aprovada: ${asset.normalizedFilename}. Desfazer aprovação`
                  : `Aprovar mídia ${asset.normalizedFilename}`
              }
              className={`${ROW_BUTTON} px-2.5 ${
                asset.approved
                  ? 'border border-ok/40 bg-ok/10 text-ok hover:bg-ok/15'
                  : 'btn-rb-surface border border-line text-ink-2'
              }`}
            >
              {asset.approved && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              <span>{asset.approved ? 'Aprovada' : 'Aprovar'}</span>
            </button>
          ) : (
            <span
              className={`text-xs font-medium ${asset.approved ? 'text-ok' : 'text-attn'}`}
            >
              {asset.approved ? 'Aprovada' : 'Aguardando aprovação'}
            </span>
          )}

          {canEditNow && (
            <button
              type="button"
              aria-label={`Remover mídia ${asset.normalizedFilename}`}
              onClick={() => onRemoveMediaAsset(asset.id)}
              className={`${ROW_ICON_BUTTON} text-ink-3 hover:bg-danger/10 hover:text-danger`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="page-title">Programação e mídias</h1>

        {canEditNow ? (
          <div className="w-full sm:w-auto">
            <span
              id="programacao-equipe-rotulo"
              className="mb-1 block text-xs font-medium text-ink-3"
            >
              Equipe da programação
            </span>
            <div
              role="group"
              aria-labelledby="programacao-equipe-rotulo"
              className="grid w-full grid-cols-3 rounded-lg border border-line bg-surface p-1 sm:inline-flex sm:w-auto"
            >
              {(['ALPHA', 'BRAVO', 'CHARLIE'] as ProgrammingTeam[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={state.programmingTeam === t}
                  onClick={() => onChangeTeam(t)}
                  className={`min-h-11 rounded-md px-2 text-xs font-medium transition-colors sm:min-h-9 sm:px-3.5 sm:text-sm ${
                    state.programmingTeam === t
                      ? 'bg-accent-solid text-white'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  {TEAM_LABELS[t].name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink">
            <span className="text-xs font-medium text-ink-3">Equipe da programação: </span>
            {TEAM_LABELS[state.programmingTeam].name}
          </p>
        )}
      </div>

      {/* Desktop: roteiro e entregas à esquerda, simulador dos telões à direita. Celular: uma coluna, roteiro primeiro. */}
      <div className="grid gap-4 lg:grid-cols-12 lg:items-start lg:gap-6">
        <div className="min-w-0 space-y-4 lg:col-span-7">
          <section
            aria-labelledby="roteiro-titulo"
            className="rounded-xl border border-line bg-surface"
          >
            <div className="flex flex-col gap-3 px-4 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <h2 id="roteiro-titulo" className="section-title">
                Roteiro e entregas
              </h2>

              {canEditNow && (
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <label className="btn-rb-primary inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent sm:min-h-9 sm:text-sm">
                    <FileImage className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">Importar roteiro</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleScheduleImageUpload(f);
                        e.target.value = '';
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    aria-expanded={showScheduleEditor}
                    aria-controls="roteiro-editor"
                    onClick={() => {
                      if (!draftScheduleText) setDraftScheduleText(SAMPLE_SCHEDULE_TEXT);
                      setShowScheduleEditor((v) => !v);
                    }}
                    className="btn-rb-surface inline-flex min-h-[44px] items-center justify-center rounded-lg border border-line px-3 text-xs font-medium text-ink-2 sm:min-h-9 sm:text-sm"
                  >
                    {showScheduleEditor ? 'Fechar editor' : 'Editar roteiro'}
                  </button>
                </div>
              )}
            </div>

            {rowsWithStatus.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3 sm:px-5">
                <p className="text-xs text-ink-3">
                  <span className="font-mono-tech font-semibold text-ink">
                    {readyCount}/{rowsWithStatus.length}
                  </span>{' '}
                  momentos prontos
                  {pendingCount > 0 && (
                    <>
                      {' · '}
                      <span className="font-medium text-attn">
                        <span className="font-mono-tech">{pendingCount}</span>{' '}
                        {pendingCount === 1 ? 'pendente' : 'pendentes'}
                      </span>
                    </>
                  )}
                </p>

                <div
                  role="group"
                  aria-label="Filtrar momentos do roteiro"
                  className="inline-flex rounded-lg border border-line bg-sunken p-0.5"
                >
                  {[
                    { onlyPending: false, label: 'Todos' },
                    { onlyPending: true, label: 'Pendentes' },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      aria-pressed={showOnlyPending === opt.onlyPending}
                      onClick={() => setShowOnlyPending(opt.onlyPending)}
                      className={`min-h-11 rounded-md px-3 text-xs font-medium transition-colors sm:min-h-7 ${
                        showOnlyPending === opt.onlyPending
                          ? 'bg-surface text-ink shadow-sm'
                          : 'text-ink-3 hover:text-ink'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {ocrLoading && (
              <div
                role="status"
                className="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-line bg-sunken px-3 py-2 text-xs text-ink-2 sm:mx-5"
              >
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden="true" />
                <span>Lendo a imagem do roteiro</span>
                <span className="font-mono-tech ml-auto text-ink-3">{ocrProgress}%</span>
              </div>
            )}

            {showScheduleEditor && (
              <div
                id="roteiro-editor"
                className="mx-4 mb-4 space-y-3 rounded-lg border border-line bg-sunken p-3 sm:mx-5"
              >
                {scheduleImagePreview && (
                  <img
                    src={scheduleImagePreview}
                    alt="Imagem do roteiro importada"
                    className="max-h-48 w-full rounded-md border border-line-soft bg-canvas object-contain"
                  />
                )}
                <div>
                  <label
                    htmlFor="roteiro-texto"
                    className="mb-1 block text-xs font-medium text-ink-3"
                  >
                    Roteiro em texto
                  </label>
                  <textarea
                    id="roteiro-texto"
                    rows={6}
                    value={draftScheduleText}
                    onChange={(e) => setDraftScheduleText(e.target.value)}
                    placeholder="19h00 - Vídeo Nova Jovens 2 (1min)"
                    className="font-mono-tech w-full rounded-lg border border-line bg-surface p-2.5 text-base text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-ink-4">
                    Um momento por linha: horário, título e duração entre parênteses.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setDraftScheduleText(SAMPLE_SCHEDULE_TEXT)}
                    className="btn-rb-surface min-h-[44px] rounded-lg border border-line px-3 text-xs font-medium text-ink-2 sm:min-h-9 sm:text-sm"
                  >
                    Carregar exemplo
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyParsedSchedule}
                    className="btn-rb-primary min-h-[44px] rounded-lg px-4 text-xs font-semibold sm:min-h-9 sm:text-sm"
                  >
                    Salvar roteiro
                  </button>
                </div>
              </div>
            )}

            {(ocrError || importSuccessMsg) && (
              <div className="space-y-1 px-4 pb-3 sm:px-5">
                {ocrError && (
                  <p role="alert" className="flex items-start gap-1.5 text-xs text-danger">
                    <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{ocrError}</span>
                  </p>
                )}
                {importSuccessMsg && (
                  <p role="status" className="flex items-start gap-1.5 text-xs text-ok">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{importSuccessMsg}</span>
                  </p>
                )}
              </div>
            )}

            {rowsWithStatus.length === 0 ? (
              <div className="border-t border-line px-4 py-6 text-center sm:px-5">
                <p className="text-sm font-medium text-ink">Roteiro ainda não importado</p>
                <p className="mt-1 text-xs text-ink-3">
                  {canEditNow
                    ? 'Importe a imagem do roteiro do culto ou edite os momentos em texto.'
                    : 'A equipe da programação importa o roteiro do culto nesta aba.'}
                </p>
              </div>
            ) : visibleRows.length === 0 ? (
              <p className="border-t border-line px-4 py-6 text-center text-sm text-ink-3 sm:px-5">
                Nenhum momento pendente. Todas as entregas estão prontas.
              </p>
            ) : (
              <ul className="divide-y divide-line-soft border-t border-line">
                {visibleRows.map((row) => {
                  const { item, isSong, matchedSong, attachedMedia } = row;
                  return (
                    <li key={item.id} className="flex gap-3 px-4 py-3 sm:px-5">
                      <span className="font-mono-tech w-11 shrink-0 text-xs leading-5 text-ink-3 sm:py-1.5">
                        {item.plannedTime}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
                          <p className="min-w-0 flex-1 basis-40 text-sm font-medium leading-5 text-ink sm:py-1.5">
                            {item.title}
                          </p>

                          <div className="flex shrink-0 items-center gap-3 sm:min-h-8">
                            {renderMomentStatus(row)}

                            {canEditNow && item.itemType !== 'CLOSING' && (
                              <button
                                type="button"
                                onClick={() =>
                                  openAttachForRunItem(item, isSong ? 'BG' : 'VIDEO')
                                }
                                aria-label={`Enviar mídia para ${item.title}`}
                                className={`${ROW_BUTTON} btn-rb-surface border border-line px-2.5 text-ink-2`}
                              >
                                <Upload className="h-4 w-4" aria-hidden="true" />
                                <span>Enviar mídia</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {isSong && matchedSong?.notes && (
                          <p className="mt-1 text-xs text-ink-3">
                            Observação da música: {matchedSong.notes}
                          </p>
                        )}

                        {attachedMedia.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {attachedMedia.map((m) => renderMediaRowItem(m))}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="avulsas-titulo"
            className="rounded-xl border border-line bg-surface px-4 py-4 sm:px-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 id="avulsas-titulo" className="section-title">
                  Mídias avulsas{' '}
                  <span className="font-mono-tech text-sm font-normal text-ink-3">
                    {extraMedia.length}
                  </span>
                </h2>
                <p className="mt-0.5 text-xs text-ink-3">
                  Fora do roteiro: exibidas quando solicitadas ou durante Arranque, Esquete e
                  Brincadeira.
                </p>
              </div>

              {canEditNow && (
                <button
                  type="button"
                  onClick={openAttachExtra}
                  className="btn-rb-surface inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line px-3 text-xs font-medium text-ink-2 sm:min-h-9 sm:text-sm"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  <span>Enviar mídia avulsa</span>
                </button>
              )}
            </div>

            {extraMedia.length > 0 ? (
              <div className="mt-3 space-y-1.5">
                {extraMedia.map((m) => renderMediaRowItem(m, describeMediaTrigger(m, state)))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-4">Nenhuma mídia avulsa enviada.</p>
            )}
          </section>
        </div>

        {/* Conferência: simulador dos 3 telões (fixo ao rolar no desktop) */}
        <section
          ref={simulatorRef}
          aria-label="Simulador dos telões"
          className="min-w-0 scroll-mt-20 rounded-xl border border-line bg-surface p-4 lg:sticky lg:top-24 lg:col-span-5"
        >
          <StageSimulator
            screens={state.screens}
            initialUrl={simulatorUrl}
            initialFilename={simulatorFilename}
            externalPlaying={simulatorPlaying}
            onPlayingChange={setSimulatorPlaying}
          />
        </section>
      </div>

      {/* Modal de envio: folha inferior no celular, janela central no desktop; corpo com rolagem própria */}
      {attachingTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
          onClick={() => setAttachingTargetId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="enviar-midia-titulo"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl border border-line-strong bg-surface shadow-xl sm:max-h-[88dvh] sm:rounded-xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <h2 id="enviar-midia-titulo" className="section-title">
                  {attachingItem ? 'Enviar mídia' : 'Enviar mídia avulsa'}
                </h2>
                <p className="mt-0.5 text-xs text-ink-3">
                  {attachingItem ? (
                    <>
                      <span className="font-mono-tech text-ink-2">
                        {attachingItem.plannedTime}
                      </span>{' '}
                      · {attachingItem.title}. Um momento pode ter mais de uma mídia.
                    </>
                  ) : (
                    'Mídia fora do roteiro, exibida quando solicitada ou durante um momento fixo.'
                  )}
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setAttachingTargetId(null)}
                className={`${ROW_ICON_BUTTON} -mr-1.5 text-ink-3 hover:bg-ink/5 hover:text-ink`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleConfirmAttach(e)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
                <fieldset>
                  <legend className="mb-1.5 text-xs font-medium text-ink-3">Tipo de mídia</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {MEDIA_ROLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={mediaRole === opt.value}
                        onClick={() => setMediaRole(opt.value)}
                        className={`min-h-11 rounded-lg border px-3 text-xs font-medium transition-colors sm:min-h-10 sm:text-sm ${
                          mediaRole === opt.value
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-line text-ink-2 hover:bg-ink/5 hover:text-ink'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <span className="mb-1.5 block text-xs font-medium text-ink-3">Arquivo</span>
                  <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line-strong bg-sunken px-3 py-2.5 transition-colors hover:border-accent focus-within:border-accent focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
                    <FileUp className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm font-medium text-ink ${
                          pendingFile ? 'font-mono-tech' : ''
                        }`}
                      >
                        {pendingFile ? pendingFile.name : 'Escolher arquivo'}
                      </span>
                      <span className="block text-xs text-ink-4">
                        {pendingFile ? formatBytes(pendingFile.size) : acceptLabel}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-accent">
                      {pendingFile ? 'Trocar' : 'Procurar'}
                    </span>
                    <input
                      type="file"
                      accept={MEDIA_ROLE_OPTIONS.find((o) => o.value === mediaRole)?.accept}
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void validateAndSetFile(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="midia-quando"
                      className="mb-1 block text-xs font-medium text-ink-3"
                    >
                      Quando exibir
                    </label>
                    <select
                      id="midia-quando"
                      value={displayTrigger}
                      onChange={(e) =>
                        setDisplayTrigger(e.target.value as MediaDisplayTrigger)
                      }
                      className={FIELD}
                    >
                      {attachingItem && (
                        <option value="RUN_ITEM">
                          No momento ({attachingItem.plannedTime})
                        </option>
                      )}
                      <option value="ARRANQUE">Durante o Arranque</option>
                      <option value="ESQUETE">Durante a Esquete</option>
                      <option value="BRINCADEIRA">Durante a Brincadeira</option>
                      <option value="ON_REQUEST">Quando solicitada</option>
                    </select>
                  </div>

                  {mediaRole !== 'BG' && (
                    <div>
                      <label
                        htmlFor="midia-teloes"
                        className="mb-1 block text-xs font-medium text-ink-3"
                      >
                        Telões
                      </label>
                      <select
                        id="midia-teloes"
                        value={targetScreen}
                        onChange={(e) =>
                          setTargetScreen(e.target.value as ScreenTarget)
                        }
                        className={FIELD}
                      >
                        <option value="ALL">Todos os telões</option>
                        <option value="CENTER">Somente o central</option>
                        <option value="SIDES">Somente os laterais</option>
                      </select>
                    </div>
                  )}
                </div>

                {displayTrigger === 'ON_REQUEST' && (
                  <div>
                    <label
                      htmlFor="midia-solicitante"
                      className="mb-1 block text-xs font-medium text-ink-3"
                    >
                      Solicitante
                    </label>
                    <input
                      id="midia-solicitante"
                      type="text"
                      required
                      value={requestedBy}
                      onChange={(e) => setRequestedBy(e.target.value)}
                      placeholder="Ex.: Pr. Lucas, apresentador"
                      className={FIELD}
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="midia-observacao"
                    className="mb-1 block text-xs font-medium text-ink-3"
                  >
                    Observação para a mesa <span className="text-ink-4">(opcional)</span>
                  </label>
                  <input
                    id="midia-observacao"
                    type="text"
                    value={mediaNote}
                    onChange={(e) => setMediaNote(e.target.value)}
                    placeholder="Ex.: Manter o BG em volume baixo durante a fala"
                    className={FIELD}
                  />
                </div>

                {uploadError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-xs text-danger"
                  >
                    <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex sm:justify-end">
                <button
                  type="button"
                  onClick={() => setAttachingTargetId(null)}
                  className="btn-rb-surface min-h-[44px] rounded-lg border border-line px-4 text-sm font-medium text-ink-2 sm:min-h-10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!pendingFile}
                  className="btn-rb-primary min-h-[44px] rounded-lg px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10"
                >
                  Enviar mídia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
