import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileImage,
  FileText,
  FileUp,
  Film,
  Image as ImageIcon,
  Info,
  Loader2,
  Music,
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
  HOLYRICS_SPECS,
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
  BG: 'BG (Áudio)',
  APRESENTACAO: 'Apresentação',
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
  const [showSpecs, setShowSpecs] = useState(false);

  // Schedule OCR state (compact at top)
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [scheduleImagePreview, setScheduleImagePreview] = useState<string | null>(null);
  const [draftScheduleText, setDraftScheduleText] = useState('');
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Inline per-item media attachment drawer state ('EXTRA' for standalone media)
  const [attachingTargetId, setAttachingTargetId] = useState<string | null>(null);
  const [mediaRole, setMediaRole] = useState<MediaRoleLabel>('VIDEO');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [displayTrigger, setDisplayTrigger] = useState<MediaDisplayTrigger>('RUN_ITEM');
  const [requestedBy, setRequestedBy] = useState('');
  const [mediaNote, setMediaNote] = useState('');
  const [targetScreen, setTargetScreen] = useState<ScreenTarget>('ALL');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Simulator preview state
  const [simulatorUrl, setSimulatorUrl] = useState<string | undefined>(undefined);
  const [simulatorFilename, setSimulatorFilename] = useState<string | undefined>(undefined);

  const sortedRunItems = useMemo(
    () => state.runItems.slice().sort((a, b) => a.orderIndex - b.orderIndex),
    [state.runItems],
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

    // Auto-adjust mediaRole badge to match actual file category
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
    }
  };

  const handleConfirmAttach = async (e: React.FormEvent, item?: RunItem) => {
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
    setPendingFile(null);
    setAttachingTargetId(null);
    setMediaNote('');
    setRequestedBy('');
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

  // Compute per-row status & attached media list
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

  const renderInlineAttachForm = (item?: RunItem) => (
    <form
      onSubmit={(e) => void handleConfirmAttach(e, item)}
      className="mt-3 rounded-lg border border-[#0095FF]/40 bg-[#0B0C0F] p-3.5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white">
          {item ? `Anexar mídia em ${item.plannedTime} – ${item.title}` : 'Anexar mídia avulsa'}
        </span>
        <button
          type="button"
          onClick={() => setAttachingTargetId(null)}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tipo de mídia: Vídeo, Imagem, BG (Som de fundo) ou Apresentação */}
      <div className="flex flex-wrap gap-1.5">
        {MEDIA_ROLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setMediaRole(opt.value)}
            className={`min-h-[36px] rounded-md border px-3 text-xs font-semibold transition ${
              mediaRole === opt.value
                ? 'btn-rb-primary border-[#0095FF] text-white'
                : 'border-white/12 bg-[#12141A] text-zinc-300 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <label className="flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#0095FF]/50 bg-[#12141A] px-3 text-xs font-semibold text-white hover:bg-white/[0.04]">
          <FileUp className="h-4 w-4 shrink-0 text-[#0095FF]" />
          <span className="truncate">
            {pendingFile ? pendingFile.name : 'Escolher arquivo'}
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

        <select
          aria-label="Quando exibir"
          value={displayTrigger}
          onChange={(e) => setDisplayTrigger(e.target.value as MediaDisplayTrigger)}
          className="min-h-[42px] rounded-lg border border-white/12 bg-[#12141A] px-2.5 text-xs text-white"
        >
          {item && <option value="RUN_ITEM">No horário ({item.plannedTime})</option>}
          <option value="ARRANQUE">Durante o Arranque</option>
          <option value="ESQUETE">Durante a Esquete</option>
          <option value="BRINCADEIRA">Durante a Brincadeira</option>
          <option value="ON_REQUEST">Quando solicitado</option>
        </select>

        {mediaRole !== 'BG' ? (
          <select
            aria-label="Telas"
            value={targetScreen}
            onChange={(e) => setTargetScreen(e.target.value as ScreenTarget)}
            className="min-h-[42px] rounded-lg border border-white/12 bg-[#12141A] px-2.5 text-xs text-white"
          >
            <option value="ALL">Nos 3 telões</option>
            <option value="CENTER">Só Telão Central</option>
            <option value="SIDES">Só Laterais</option>
          </select>
        ) : (
          <div className="flex min-h-[42px] items-center rounded-lg border border-white/8 bg-[#12141A] px-3 text-xs text-zinc-400">
            Áudio / Player do Holyrics
          </div>
        )}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-12">
        {displayTrigger === 'ON_REQUEST' && (
          <input
            type="text"
            required
            value={requestedBy}
            onChange={(e) => setRequestedBy(e.target.value)}
            placeholder="Quem solicitará? (Ex.: Pr. Lucas)"
            className="min-h-[40px] rounded-lg border border-white/12 bg-[#12141A] px-3 text-xs text-white placeholder:text-zinc-500 sm:col-span-5"
          />
        )}

        <input
          type="text"
          value={mediaNote}
          onChange={(e) => setMediaNote(e.target.value)}
          placeholder="Nota para a projeção (opcional)"
          className={`min-h-[40px] rounded-lg border border-white/12 bg-[#12141A] px-3 text-xs text-white placeholder:text-zinc-500 ${
            displayTrigger === 'ON_REQUEST' ? 'sm:col-span-5' : 'sm:col-span-9'
          }`}
        />

        <button
          type="submit"
          disabled={!pendingFile}
          className={`btn-rb-primary min-h-[40px] rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-40 ${
            displayTrigger === 'ON_REQUEST' ? 'sm:col-span-2' : 'sm:col-span-3'
          }`}
        >
          Salvar mídia
        </button>
      </div>

      {uploadError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/45 bg-red-500/12 p-2.5 text-xs text-red-200">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <span>{uploadError}</span>
        </div>
      )}
    </form>
  );

  const renderMediaChip = (asset: MediaAsset) => {
    const roleLabel = asset.mediaRole
      ? ROLE_BADGE_LABELS[asset.mediaRole]
      : asset.category === 'AUDIO'
        ? 'BG (Áudio)'
        : asset.category === 'DOCUMENT'
          ? 'Apresentação'
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

    return (
      <div
        key={asset.id}
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#12141A] px-3 py-2 text-xs"
      >
        <div className="flex min-w-0 items-center gap-2">
          <RoleIcon className="h-3.5 w-3.5 shrink-0 text-[#38BDF8]" />
          <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-200">
            {roleLabel}
          </span>
          <span className="truncate font-medium text-white">{asset.normalizedFilename}</span>
          <span className="font-mono-tech hidden text-[11px] text-zinc-500 sm:inline">
            {getMediaAssetResolutionSummary(asset)} · {formatBytes(asset.fileSizeBytes)}
          </span>
          {asset.note && (
            <span className="truncate text-zinc-400">· “{asset.note}”</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {asset.objectUrl && (asset.category === 'VIDEO' || asset.category === 'IMAGE') && (
            <button
              type="button"
              onClick={() => {
                setSimulatorUrl(asset.objectUrl);
                setSimulatorFilename(asset.originalFilename);
              }}
              className="inline-flex min-h-[32px] items-center gap-1 rounded border border-white/12 px-2 text-[11px] text-zinc-200 hover:bg-white/5"
            >
              <Play className="h-3 w-3 text-[#0095FF]" />
              <span>Telão</span>
            </button>
          )}

          {isLeader && (
            <button
              type="button"
              onClick={() => onToggleApproveMedia(asset.id)}
              className={`min-h-[32px] rounded px-2 text-[11px] font-semibold ${
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
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-white/10 text-zinc-400 hover:text-red-400"
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

        <div className="flex flex-wrap gap-2">
          {(['ALPHA', 'BRAVO', 'CHARLIE'] as ProgrammingTeam[]).map((t) => (
            <button
              key={t}
              type="button"
              disabled={!canEditProgramming || state.isFrozen}
              onClick={() => onChangeTeam(t)}
              className={`min-h-[42px] rounded-lg border px-3.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
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

      {/* 1. FORMATOS ACEITOS NO TOPO (COMPACTO) */}
      <section className="rounded-xl border border-white/10 bg-[#12141A]">
        <button
          type="button"
          onClick={() => setShowSpecs((v) => !v)}
          className="flex min-h-[46px] w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium text-zinc-200"
        >
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 text-[#F5C41E]" />
            <span>
              Formatos aceitos: Vídeos 16:9 (.mp4/.mov) · Imagens 16:9 (.png/.jpg) · BG/Áudio (.mp3/.wav) · Apresentação (.pdf)
            </span>
          </span>
          <span className="shrink-0 text-xs text-[#0095FF]">
            {showSpecs ? 'Ocultar' : 'Detalhes'}
          </span>
        </button>

        {showSpecs && (
          <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOLYRICS_SPECS.map((spec) => (
              <div
                key={spec.category}
                className="rounded-lg border border-white/10 bg-[#0B0C0F] p-3 space-y-1"
              >
                <div className="text-xs font-semibold text-white">{spec.title}</div>
                <div className="font-mono-tech text-[11px] text-[#38BDF8]">
                  {spec.acceptedExtensions.join(' ')}
                </div>
                <p className="text-[11px] text-zinc-300">{spec.resolutionRule}</p>
                <p className="text-[11px] text-zinc-500">{spec.notes}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. ROTEIRO NO TOPO ORDENANDO A ENTREGA DAS MÍDIAS */}
      <section className="rounded-xl border border-white/10 bg-[#12141A] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="section-title">Roteiro e Entrega de Mídias</h2>
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
              <AnimatedCounter value={readyCount} />/{rowsWithStatus.length} prontos
            </span>
          </div>

          {canEditProgramming && !state.isFrozen && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="btn-rb-primary inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-white">
                <FileImage className="h-3.5 w-3.5" />
                <span>Importar imagem do roteiro</span>
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
                className="btn-rb-surface min-h-[40px] rounded-lg border border-white/12 px-3 text-xs font-medium text-zinc-300"
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
          <div className="grid gap-3 rounded-lg border border-white/10 bg-[#0B0C0F] p-3.5 lg:grid-cols-12">
            {scheduleImagePreview && (
              <div className="lg:col-span-4">
                <img
                  src={scheduleImagePreview}
                  alt="Roteiro"
                  className="max-h-56 w-full rounded border border-white/10 bg-black object-contain"
                />
              </div>
            )}
            <div className={scheduleImagePreview ? 'lg:col-span-8' : 'lg:col-span-12'}>
              <textarea
                rows={5}
                value={draftScheduleText}
                onChange={(e) => setDraftScheduleText(e.target.value)}
                placeholder="19h00 – Vídeo Nova Jovens 2 (1min)..."
                className="font-mono-tech w-full rounded-lg border border-white/12 bg-[#12141A] p-2.5 text-xs text-white focus:border-[#0095FF] focus:outline-none"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDraftScheduleText(SAMPLE_SCHEDULE_TEXT)}
                  className="rounded-lg border border-white/12 px-3 py-1.5 text-xs text-zinc-300"
                >
                  Exemplo 21/11
                </button>
                <button
                  type="button"
                  onClick={handleApplyParsedSchedule}
                  className="btn-rb-primary rounded-lg px-4 py-1.5 text-xs font-semibold text-white"
                >
                  Salvar roteiro
                </button>
              </div>
            </div>
          </div>
        )}

        {ocrError && <p className="text-xs text-red-400">{ocrError}</p>}
        {importSuccessMsg && <p className="text-xs text-emerald-400">{importSuccessMsg}</p>}

        {/* Lista compacta do roteiro com anexos de múltiplas mídias por horário */}
        <div className="divide-y divide-white/8 rounded-xl border border-white/10 bg-[#0B0C0F]">
          {rowsWithStatus.map(({ item, isSong, matchedSong, attachedMedia, isReady }) => {
            const isAttachingHere = attachingTargetId === item.id;

            return (
              <div
                key={item.id}
                className={`p-3 transition-colors ${
                  isReady ? 'bg-emerald-500/[0.04]' : ''
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
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

                    {item.durationMinutes > 0 && (
                      <span className="font-mono-tech text-xs text-zinc-500">
                        {item.durationMinutes}m
                      </span>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isSong && (
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                          isReady
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-[#F5C41E]/15 text-[#F5C41E]'
                        }`}
                      >
                        <Music className="h-3 w-3" />
                        <span>{isReady ? 'Letra OK' : 'Falta letra'}</span>
                      </span>
                    )}

                    {!isSong && item.itemType !== 'CLOSING' && (
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
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
                            <span>{attachedMedia.length} mídia(s)</span>
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
                    )}

                    {canEditProgramming && !state.isFrozen && item.itemType !== 'CLOSING' && (
                      <button
                        type="button"
                        onClick={() =>
                          isAttachingHere
                            ? setAttachingTargetId(null)
                            : openAttachForRunItem(item, isSong ? 'BG' : 'VIDEO')
                        }
                        className="btn-rb-surface inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-white/12 bg-[#12141A] px-2.5 text-xs font-medium text-[#38BDF8] hover:text-white"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Anexar mídia</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Músicas vinculadas */}
                {isSong && matchedSong && matchedSong.notes && (
                  <p className="mt-1.5 text-xs text-zinc-400">
                    Nota da Música: {matchedSong.notes}
                  </p>
                )}

                {/* Lista de mídias anexadas a este horário (suporta várias: vídeo, imagem, BG, apresentação) */}
                {attachedMedia.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {attachedMedia.map((m) => renderMediaChip(m))}
                  </div>
                )}

                {isAttachingHere && renderInlineAttachForm(item)}
              </div>
            );
          })}
        </div>

        {/* Mídias avulsas / Quando solicitado / Esquete / Brincadeira */}
        <div className="rounded-lg border border-white/10 bg-[#0B0C0F] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-300">
              Mídias avulsas — Quando solicitado, Esquete ou Brincadeira ({extraMedia.length})
            </span>
            {canEditProgramming && !state.isFrozen && (
              <button
                type="button"
                onClick={() =>
                  attachingTargetId === 'EXTRA'
                    ? setAttachingTargetId(null)
                    : openAttachExtra()
                }
                className="btn-rb-surface inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-white/12 bg-[#12141A] px-2.5 text-xs font-medium text-[#38BDF8]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Anexar mídia avulsa</span>
              </button>
            )}
          </div>

          {extraMedia.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {extraMedia.map((m) => (
                <div key={m.id} className="space-y-1">
                  {renderMediaChip(m)}
                  <p className="pl-2 text-[11px] text-[#38BDF8]">
                    {describeMediaTrigger(m, state)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {attachingTargetId === 'EXTRA' && renderInlineAttachForm(undefined)}
        </div>
      </section>

      {/* 3. SIMULADOR DOS 3 TELÕES (16:9) */}
      <section className="rounded-xl border border-white/10 bg-[#12141A] p-4 sm:p-5">
        <StageSimulator
          screens={state.screens}
          initialUrl={simulatorUrl}
          initialFilename={simulatorFilename}
        />
      </section>
    </div>
  );
}
