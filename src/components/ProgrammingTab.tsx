import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileImage,
  FileText,
  FileUp,
  Film,
  Image as ImageIcon,
  Loader2,
  Music,
  Pause,
  Play,
  Plus,
  Trash2,
  Volume2,
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
import { AnimatedCounter } from './reactbits/AnimatedCounter';
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
  { value: 'BG', label: 'BG (Som de fundo)', accept: '.mp3,.wav,.aac,.ogg' },
  { value: 'APRESENTACAO', label: 'Apresentação (PDF)', accept: '.pdf' },
];

const ROLE_BADGE_LABELS: Record<MediaRoleLabel, string> = {
  VIDEO: 'Vídeo',
  IMAGEM: 'Imagem',
  BG: 'BG',
  APRESENTACAO: 'Slides',
};

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
      setUploadError(check.messages[0] ?? 'Formato ou proporção bloqueados.');
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
      setUploadError('Escolha um arquivo válido antes de salvar.');
      return;
    }
    if (displayTrigger === 'ON_REQUEST' && !requestedBy.trim()) {
      setUploadError('Informe quem vai solicitar essa mídia.');
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
      setUploadError(check.messages[0] ?? 'Arquivo bloqueado.');
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
      }
      return;
    }

    // Demo placeholder preview synthesis on canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = 1920;
    offscreen.height = 1080;
    const ctx = offscreen.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#070B14';
      ctx.fillRect(0, 0, 1920, 1080);
      ctx.strokeStyle = '#0095FF';
      ctx.lineWidth = 8;
      ctx.strokeRect(40, 40, 1840, 1000);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = '700 68px "Host Grotesk", sans-serif';
      ctx.fillText(asset.normalizedFilename, 960, 510);
      ctx.fillStyle = '#38BDF8';
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
      setOcrError('Não foi possível ler a imagem automaticamente. Confira o texto abaixo.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleApplyParsedSchedule = () => {
    setOcrError(null);
    setImportSuccessMsg(null);
    const textToParse = draftScheduleText.trim();
    if (!textToParse) {
      setOcrError('Suba a imagem do roteiro ou cole os horários.');
      return;
    }

    const parsed = parseScheduleText(
      textToParse,
      `Equipe ${TEAM_LABELS[state.programmingTeam].name}`,
      activeUserName,
    );

    if (parsed.runItems.length === 0) {
      setOcrError('Nenhum horário encontrado (ex.: 19h00 – Vídeo Nova Jovens 2 (1min)).');
      return;
    }

    onReplaceScheduleFromImport({
      runItems: parsed.runItems,
      detectedSongs: parsed.detectedSongs,
      detectedDate: parsed.detectedDate,
      sourceLabel: scheduleImagePreview ? 'imagem do roteiro' : 'texto do roteiro',
    });

    setShowScheduleEditor(false);
    setImportSuccessMsg(`Roteiro atualizado (${parsed.runItems.length} horários).`);
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

  const renderMediaRowItem = (asset: MediaAsset) => {
    const roleLabel = asset.mediaRole
      ? ROLE_BADGE_LABELS[asset.mediaRole]
      : asset.category === 'AUDIO'
        ? 'BG'
        : asset.category === 'DOCUMENT'
          ? 'Slides'
          : asset.category === 'IMAGE'
            ? 'Imagem'
            : 'Vídeo';

    const RoleIcon =
      asset.category === 'AUDIO'
        ? Volume2
        : asset.category === 'DOCUMENT'
          ? FileText
          : asset.category === 'IMAGE'
            ? ImageIcon
            : Film;

    const isCurrentlyPlaying =
      asset.category === 'AUDIO'
        ? playingAudioId === asset.id
        : activeMediaId === asset.id &&
          (asset.category === 'IMAGE' || simulatorPlaying);

    return (
      <div
        key={asset.id}
        className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs transition ${
          activeMediaId === asset.id || playingAudioId === asset.id
            ? 'border-[#0095FF]/50 bg-[#0095FF]/10'
            : 'border-white/10 bg-[#12141A]'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {/* Comando de reprodução direto na linha */}
          {asset.category !== 'DOCUMENT' && (
            <button
              type="button"
              onClick={() => handleInlinePlayPause(asset)}
              aria-label={isCurrentlyPlaying ? 'Pausar' : 'Reproduzir'}
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
                isCurrentlyPlaying
                  ? 'bg-[#0095FF] text-white'
                  : 'border border-white/15 bg-[#0B0C0F] text-[#38BDF8] hover:bg-white/10'
              }`}
            >
              {isCurrentlyPlaying && (asset.category === 'VIDEO' || asset.category === 'AUDIO') ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          <RoleIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          <span className="shrink-0 rounded bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-200">
            {roleLabel}
          </span>
          <div className="min-w-0">
            <div className="truncate font-medium text-white">
              {asset.normalizedFilename}
            </div>
            {asset.note && (
              <div className="truncate text-[11px] text-zinc-400">{asset.note}</div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="font-mono-tech hidden text-[11px] text-zinc-500 xl:inline">
            {formatBytes(asset.fileSizeBytes)}
          </span>

          {isLeader && (
            <button
              type="button"
              onClick={() => onToggleApproveMedia(asset.id)}
              className={`h-7 rounded px-2 text-[11px] font-semibold ${
                asset.approved
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-[#F5C41E]/15 text-[#F5C41E]'
              }`}
            >
              {asset.approved ? 'OK' : 'Aprovar'}
            </button>
          )}

          {canEditProgramming && !state.isFrozen && (
            <button
              type="button"
              aria-label={`Remover ${asset.normalizedFilename}`}
              onClick={() => onRemoveMediaAsset(asset.id)}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-white/10 text-zinc-400 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="page-title">Programação e Mídias</h1>

        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
          {(['ALPHA', 'BRAVO', 'CHARLIE'] as ProgrammingTeam[]).map((t) => (
            <button
              key={t}
              type="button"
              disabled={!canEditProgramming || state.isFrozen}
              onClick={() => onChangeTeam(t)}
              className={`min-h-[42px] rounded-lg border px-3 text-xs font-semibold transition-colors disabled:opacity-60 sm:text-sm ${
                state.programmingTeam === t
                  ? 'btn-rb-primary border-[#0095FF] text-white'
                  : 'btn-rb-surface border-white/12 text-zinc-300'
              }`}
            >
              {TEAM_LABELS[t].name}
            </button>
          ))}
        </div>
      </div>

      {/* Layout Lado a Lado no PC: Roteiro e Anexos à Esquerda | Telão + Tipos discretos à Direita */}
      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* COLUNA ESQUERDA (PC): Roteiro ordenando a entrega das mídias */}
        <section className="min-w-0 space-y-4 rounded-xl border border-white/10 bg-[#12141A] p-3.5 sm:p-5 lg:col-span-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between gap-2 sm:justify-start">
              <h2 className="section-title">Roteiro e Entrega</h2>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                <AnimatedCounter value={readyCount} />/{rowsWithStatus.length}
              </span>
            </div>

            {canEditProgramming && !state.isFrozen && (
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <label className="btn-rb-primary inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white">
                  <FileImage className="h-3.5 w-3.5 shrink-0" />
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
                  onClick={() => {
                    if (!draftScheduleText) setDraftScheduleText(SAMPLE_SCHEDULE_TEXT);
                    setShowScheduleEditor((v) => !v);
                  }}
                  className="btn-rb-surface inline-flex min-h-[40px] items-center justify-center rounded-lg border border-white/12 px-3 text-xs font-medium text-zinc-300"
                >
                  {showScheduleEditor ? 'Fechar texto' : 'Editar horários'}
                </button>
              </div>
            )}
          </div>

          {ocrLoading && (
            <div className="flex items-center gap-2 rounded-lg border border-[#0095FF]/35 bg-[#0095FF]/10 p-2.5 text-xs text-white">
              <Loader2 className="h-4 w-4 animate-spin text-[#0095FF]" />
              <span>Lendo imagem do roteiro... {ocrProgress}%</span>
            </div>
          )}

          {showScheduleEditor && (
            <div className="space-y-3 rounded-lg border border-white/10 bg-[#0B0C0F] p-3">
              {scheduleImagePreview && (
                <img
                  src={scheduleImagePreview}
                  alt="Roteiro"
                  className="max-h-48 w-full rounded border border-white/10 bg-black object-contain"
                />
              )}
              <textarea
                rows={5}
                value={draftScheduleText}
                onChange={(e) => setDraftScheduleText(e.target.value)}
                placeholder="19h00 – Vídeo Nova Jovens 2 (1min)..."
                className="font-mono-tech w-full rounded-lg border border-white/12 bg-[#12141A] p-2.5 text-xs text-white focus:border-[#0095FF] focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDraftScheduleText(SAMPLE_SCHEDULE_TEXT)}
                  className="min-h-[38px] rounded-lg border border-white/12 px-3 text-xs text-zinc-300"
                >
                  Exemplo 21/11
                </button>
                <button
                  type="button"
                  onClick={handleApplyParsedSchedule}
                  className="btn-rb-primary min-h-[38px] rounded-lg px-4 text-xs font-semibold text-white"
                >
                  Salvar roteiro
                </button>
              </div>
            </div>
          )}

          {ocrError && <p className="text-xs text-red-400">{ocrError}</p>}
          {importSuccessMsg && <p className="text-xs text-emerald-400">{importSuccessMsg}</p>}

          {/* Linhas do roteiro compactas com Play/Pause nas próprias mídias */}
          <div className="divide-y divide-white/8 rounded-xl border border-white/10 bg-[#0B0C0F]">
            {rowsWithStatus.map(({ item, isSong, matchedSong, attachedMedia, isReady }) => (
              <div
                key={item.id}
                className={`p-3 transition-colors ${
                  isReady ? 'bg-emerald-500/[0.04]' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`font-mono-tech shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                        isReady
                          ? 'border border-emerald-500/35 bg-emerald-500/15 text-emerald-300'
                          : 'border border-white/10 bg-[#12141A] text-zinc-300'
                      }`}
                    >
                      {item.plannedTime}
                    </span>

                    <span className="truncate text-sm font-medium text-white">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {isSong ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
                          isReady
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-[#F5C41E]/15 text-[#F5C41E]'
                        }`}
                      >
                        <Music className="h-3 w-3" />
                        <span>{isReady ? 'Letra OK' : 'Falta'}</span>
                      </span>
                    ) : item.itemType !== 'CLOSING' ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
                          attachedMedia.length > 0
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : item.requiresMedia
                              ? 'bg-[#F5C41E]/15 text-[#F5C41E]'
                              : 'bg-white/5 text-zinc-400'
                        }`}
                      >
                        {attachedMedia.length > 0 ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{attachedMedia.length}</span>
                          </>
                        ) : item.requiresMedia ? (
                          <>
                            <AlertTriangle className="h-3 w-3" />
                            <span>Pendente</span>
                          </>
                        ) : (
                          <span>Livre</span>
                        )}
                      </span>
                    ) : null}

                    {canEditProgramming && !state.isFrozen && item.itemType !== 'CLOSING' && (
                      <button
                        type="button"
                        onClick={() =>
                          openAttachForRunItem(item, isSong ? 'BG' : 'VIDEO')
                        }
                        className="btn-rb-surface inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-white/12 bg-[#12141A] px-2.5 text-xs font-medium text-[#38BDF8] hover:text-white"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Anexar</span>
                      </button>
                    )}
                  </div>
                </div>

                {isSong && matchedSong?.notes && (
                  <p className="mt-1 text-xs text-zinc-400">
                    Obs. Música: {matchedSong.notes}
                  </p>
                )}

                {attachedMedia.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {attachedMedia.map((m) => renderMediaRowItem(m))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mídias avulsas */}
          <div className="rounded-xl border border-white/10 bg-[#0B0C0F] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-300">
                Mídias avulsas ({extraMedia.length})
              </span>
              {canEditProgramming && !state.isFrozen && (
                <button
                  type="button"
                  onClick={openAttachExtra}
                  className="btn-rb-surface inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-white/12 bg-[#12141A] px-2.5 text-xs font-medium text-[#38BDF8]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Anexar avulsa</span>
                </button>
              )}
            </div>

            {extraMedia.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {extraMedia.map((m) => (
                  <div key={m.id} className="space-y-1">
                    {renderMediaRowItem(m)}
                    <p className="pl-2 text-[11px] text-[#38BDF8]">
                      {describeMediaTrigger(m, state)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* COLUNA DIREITA (PC): Telão dos 3 painéis + tipos aceitos discretos embaixo */}
        <section className="min-w-0 rounded-xl border border-white/10 bg-[#12141A] p-3.5 sm:p-5 lg:sticky lg:top-24 lg:col-span-5">
          <StageSimulator
            screens={state.screens}
            initialUrl={simulatorUrl}
            initialFilename={simulatorFilename}
            externalPlaying={simulatorPlaying}
            onPlayingChange={setSimulatorPlaying}
          />
        </section>
      </div>

      {/* MODAL ESPAÇOSO PARA ANEXAR MÍDIA (Confortável no celular e no PC) */}
      {attachingTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
          onClick={() => setAttachingTargetId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-2xl border-t border-white/15 bg-[#12141A] p-5 shadow-2xl sm:rounded-2xl sm:border"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {attachingItem
                    ? `${attachingItem.plannedTime} · ${attachingItem.title}`
                    : 'Anexar mídia avulsa'}
                </h3>
                <p className="text-xs text-zinc-400">
                  Escolha o tipo e selecione o arquivo (pode anexar várias mídias no mesmo horário).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAttachingTargetId(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleConfirmAttach(e)} className="mt-4 space-y-4">
              {/* Tipo: Vídeo, Imagem, BG, Apresentação */}
              <div>
                <span className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Tipo de mídia
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {MEDIA_ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMediaRole(opt.value)}
                      className={`min-h-[42px] rounded-lg border px-3 text-xs font-semibold transition ${
                        mediaRole === opt.value
                          ? 'btn-rb-primary border-[#0095FF] text-white'
                          : 'border-white/12 bg-[#0B0C0F] text-zinc-300 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex min-h-[64px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#0095FF]/50 bg-[#0B0C0F] p-3 text-center hover:bg-white/[0.03]">
                <FileUp className="h-5 w-5 text-[#0095FF]" />
                <span className="mt-1 max-w-full truncate text-xs font-semibold text-white">
                  {pendingFile ? pendingFile.name : 'Toque para escolher o arquivo'}
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">
                    Quando exibir
                  </label>
                  <select
                    value={displayTrigger}
                    onChange={(e) =>
                      setDisplayTrigger(e.target.value as MediaDisplayTrigger)
                    }
                    className="min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-sm text-white"
                  >
                    {attachingItem && (
                      <option value="RUN_ITEM">
                        No horário ({attachingItem.plannedTime})
                      </option>
                    )}
                    <option value="ARRANQUE">Durante o Arranque</option>
                    <option value="ESQUETE">Durante a Esquete</option>
                    <option value="BRINCADEIRA">Durante a Brincadeira</option>
                    <option value="ON_REQUEST">Quando solicitado</option>
                  </select>
                </div>

                {mediaRole !== 'BG' && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-300">
                      Telas
                    </label>
                    <select
                      value={targetScreen}
                      onChange={(e) =>
                        setTargetScreen(e.target.value as ScreenTarget)
                      }
                      className="min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-sm text-white"
                    >
                      <option value="ALL">Nos 3 telões</option>
                      <option value="CENTER">Só Telão Central</option>
                      <option value="SIDES">Só Laterais</option>
                    </select>
                  </div>
                )}
              </div>

              {displayTrigger === 'ON_REQUEST' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">
                    Quem solicitará?
                  </label>
                  <input
                    type="text"
                    required
                    value={requestedBy}
                    onChange={(e) => setRequestedBy(e.target.value)}
                    placeholder="Ex.: Pr. Lucas, Apresentador"
                    className="min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white placeholder:text-zinc-500"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">
                  Nota para a projeção (opcional)
                </label>
                <input
                  type="text"
                  value={mediaNote}
                  onChange={(e) => setMediaNote(e.target.value)}
                  placeholder="Ex.: Deixar o BG em loop baixo durante a fala"
                  className="min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white placeholder:text-zinc-500"
                />
              </div>

              {uploadError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/45 bg-red-500/12 p-3 text-xs text-red-200">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setAttachingTargetId(null)}
                  className="btn-rb-surface min-h-[46px] rounded-lg border border-white/12 text-sm font-medium text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!pendingFile}
                  className="btn-rb-primary min-h-[46px] rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                >
                  Salvar mídia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
