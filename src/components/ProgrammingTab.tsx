import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileImage,
  FileUp,
  Info,
  Loader2,
  Play,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  MediaAsset,
  MediaDisplayTrigger,
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
  const [showSpecs, setShowSpecs] = useState(true);

  // Telão + media upload state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [displayTrigger, setDisplayTrigger] = useState<MediaDisplayTrigger>('RUN_ITEM');
  const [uploadRunItemId, setUploadRunItemId] = useState<string>(state.runItems[0]?.id ?? '');
  const [requestedBy, setRequestedBy] = useState('');
  const [mediaNote, setMediaNote] = useState('');
  const [targetScreen, setTargetScreen] = useState<ScreenTarget>('ALL');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Schedule OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [scheduleImagePreview, setScheduleImagePreview] = useState<string | null>(null);
  const [draftScheduleText, setDraftScheduleText] = useState('');
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const sortedRunItems = useMemo(
    () => state.runItems.slice().sort((a, b) => a.orderIndex - b.orderIndex),
    [state.runItems],
  );

  // Live checklist of what already arrived (songs + media per schedule time)
  const checklist = useMemo(() => {
    return sortedRunItems.map((item) => {
      if (item.itemType === 'WORSHIP' || item.songCode) {
        const matchedSong =
          state.songs.find((s) => s.songCode && s.songCode === item.songCode) ||
          findMatchingSong(item.title, state.songs);
        const ready = Boolean(matchedSong && matchedSong.rawLyrics.trim().length > 0);
        return {
          item,
          kind: 'SONG' as const,
          ready,
          detail: ready
            ? `Chegou: ${matchedSong!.title} (letra pronta)`
            : 'Aguardando Música enviar letra',
        };
      }

      if (item.requiresMedia) {
        const directMedia = state.mediaAssets.find((m) => m.runItemId === item.id);
        const triggerFallback = !directMedia
          ? state.mediaAssets.find(
              (m) =>
                (item.title.toLowerCase().includes('arranque') && m.displayTrigger === 'ARRANQUE') ||
                (item.title.toLowerCase().includes('esquete') && m.displayTrigger === 'ESQUETE') ||
                (item.title.toLowerCase().includes('brincadeira') && m.displayTrigger === 'BRINCADEIRA'),
            )
          : undefined;
        const found = directMedia ?? triggerFallback;
        return {
          item,
          kind: 'MEDIA' as const,
          ready: Boolean(found),
          detail: found
            ? `Chegou: ${found.normalizedFilename}`
            : 'Aguardando enviar mídia para este horário',
        };
      }

      return {
        item,
        kind: 'INFO' as const,
        ready: true,
        detail: item.itemType === 'CLOSING' ? 'Encerramento registrado' : 'Horário registrado',
      };
    });
  }, [sortedRunItems, state.songs, state.mediaAssets]);

  const requiredChecklistCount = checklist.filter((c) => c.kind !== 'INFO').length;
  const completedChecklistCount = checklist.filter((c) => c.kind !== 'INFO' && c.ready).length;

  const validateAndAcceptPendingFile = async (file: File) => {
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
      setUploadError(check.messages[0] ?? 'Arquivo bloqueado por não atender o padrão Holyrics.');
      return;
    }

    const url = URL.createObjectURL(file);
    setPendingFile(file);
    setPendingPreviewUrl(url);
  };

  const handleConfirmMediaUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingFile) {
      setUploadError('Importe um arquivo válido primeiro no telão ou abaixo.');
      return;
    }
    if (displayTrigger === 'ON_REQUEST' && !requestedBy.trim()) {
      setUploadError('Informe quem vai solicitar essa mídia durante o culto.');
      return;
    }

    setUploadError(null);
    const meta = await readMediaMetadata(pendingFile);
    const check = validateMediaForHolyrics({
      filename: pendingFile.name,
      fileSizeBytes: pendingFile.size,
      widthPx: meta.widthPx,
      heightPx: meta.heightPx,
      screens: state.screens,
    });

    if (!check.category || check.status === 'REJECTED') {
      setUploadError(check.messages[0] ?? 'Arquivo bloqueado pelo padrão Holyrics.');
      return;
    }

    const block = sortedRunItems.find((i) => i.id === uploadRunItemId);
    const ext = getExtension(pendingFile.name);
    const baseName = sanitizeSlug(pendingFile.name.slice(0, pendingFile.name.length - ext.length));

    const prefix =
      displayTrigger === 'RUN_ITEM' && block
        ? String(block.orderIndex).padStart(2, '0')
        : displayTrigger === 'ON_REQUEST'
          ? 'SOLICITADO'
          : displayTrigger;

    const newAsset: MediaAsset = {
      id: `med-${Date.now()}`,
      runItemId: displayTrigger === 'RUN_ITEM' ? block?.id : undefined,
      displayTrigger,
      requestedBy: displayTrigger === 'ON_REQUEST' ? requestedBy.trim() : undefined,
      note: mediaNote.trim(),
      targetScreen,
      category: check.category,
      originalFilename: pendingFile.name,
      normalizedFilename: `${prefix}_${baseName}${ext}`,
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
    setRequestedBy('');
    setMediaNote('');
  };

  const handleScheduleImageUpload = async (file: File) => {
    setOcrError(null);
    setImportSuccessMsg(null);
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
      setOcrError('Não foi possível ler o texto automaticamente. Cole ou edite o texto abaixo.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleApplyParsedSchedule = () => {
    setOcrError(null);
    setImportSuccessMsg(null);
    const textToParse = draftScheduleText.trim();
    if (!textToParse) {
      setOcrError('Suba a imagem do roteiro ou cole as linhas antes de enviar.');
      return;
    }

    const parsed = parseScheduleText(
      textToParse,
      `Equipe ${TEAM_LABELS[state.programmingTeam].name}`,
      activeUserName,
    );

    if (parsed.runItems.length === 0) {
      setOcrError('Nenhuma linha de horário encontrada (ex.: 19h00 – Vídeo Nova Jovens 2 (1min)).');
      return;
    }

    const usedIds = new Set<string>();
    let matchedCount = 0;
    for (const det of parsed.detectedSongs) {
      const match = findMatchingSong(det.title, state.songs, usedIds);
      if (match && match.rawLyrics.trim().length > 0) {
        usedIds.add(match.id);
        matchedCount += 1;
      }
    }

    onReplaceScheduleFromImport({
      runItems: parsed.runItems,
      detectedSongs: parsed.detectedSongs,
      detectedDate: parsed.detectedDate,
      sourceLabel: scheduleImagePreview ? 'imagem do roteiro' : 'texto do roteiro',
    });

    setUploadRunItemId(parsed.runItems[0]?.id ?? '');
    setImportSuccessMsg(
      `Horários gravados (${parsed.runItems.length} momentos). Músicas já prontas no checklist: ${matchedCount}/${parsed.detectedSongs.length}.`,
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Programação e Mídias</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Confira os formatos aceitos, importe e teste as mídias nos telões e acompanhe o checklist dos horários.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['ALPHA', 'BRAVO', 'CHARLIE'] as ProgrammingTeam[]).map((t) => (
            <button
              key={t}
              type="button"
              disabled={!canEditProgramming || state.isFrozen}
              onClick={() => onChangeTeam(t)}
              className={`min-h-[44px] rounded-lg border px-3.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
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

      {/* 1. FORMATOS ACEITOS NO TOPO (SEM LETRAS .TXT) */}
      <section className="rounded-xl border border-white/10 bg-[#12141A]">
        <button
          type="button"
          onClick={() => setShowSpecs((v) => !v)}
          className="flex min-h-[52px] w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-white"
        >
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 text-[#F5C41E]" />
            <span>Formatos aceitos e padrão dos telões (arquivos errados são bloqueados)</span>
          </span>
          <span className="text-xs text-[#0095FF]">{showSpecs ? 'Ocultar' : 'Mostrar'}</span>
        </button>

        {showSpecs && (
          <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOLYRICS_SPECS.map((spec) => (
              <div
                key={spec.category}
                className="rounded-lg border border-white/10 bg-[#0B0C0F] p-3.5 space-y-1.5"
              >
                <div className="text-sm font-semibold text-white">{spec.title}</div>
                <div className="font-mono-tech text-xs text-[#38BDF8]">
                  {spec.acceptedExtensions.join(' ')}
                </div>
                <p className="text-xs font-medium text-zinc-200">{spec.resolutionRule}</p>
                <p className="text-xs text-zinc-400">{spec.notes}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. TELÃO NO TOPO + ENVIO COM BLOQUEIO IMEDIATO */}
      <section className="space-y-5">
        <StageSimulator
          screens={state.screens}
          initialUrl={pendingPreviewUrl ?? undefined}
          initialFilename={pendingFile?.name}
          onFilePicked={(f) => {
            void validateAndAcceptPendingFile(f);
          }}
        />

        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={(e) => void handleConfirmMediaUpload(e)}
            className="space-y-4 rounded-xl border border-white/10 bg-[#12141A] p-5 lg:col-span-6"
          >
            <h2 className="text-base font-semibold text-white">
              Enviar mídia testada para a Projeção
            </h2>

            <label
              className={`flex min-h-[84px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-3.5 text-center transition-colors ${
                !canEditProgramming || state.isFrozen
                  ? 'cursor-not-allowed border-white/10 opacity-45'
                  : 'border-[#0095FF]/50 bg-[#0B0C0F] hover:bg-white/[0.03]'
              }`}
            >
              <FileUp className="h-5 w-5 text-[#0095FF]" />
              <span className="mt-1 text-sm font-medium text-white">
                {pendingFile
                  ? `Pronto no telão: ${pendingFile.name}`
                  : 'Escolher arquivo (vídeo 16:9, imagem 16:9, áudio ou PDF)'}
              </span>
              <input
                type="file"
                disabled={!canEditProgramming || state.isFrozen}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void validateAndAcceptPendingFile(f);
                  e.target.value = '';
                }}
              />
            </label>

            <div>
              <label htmlFor="when-display" className="block text-sm font-medium text-zinc-300">
                Quando essa mídia deve ser exibida?
              </label>
              <select
                id="when-display"
                value={displayTrigger}
                onChange={(e) => setDisplayTrigger(e.target.value as MediaDisplayTrigger)}
                className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white focus:border-[#0095FF] focus:outline-none"
              >
                <option value="RUN_ITEM">Em um momento do roteiro</option>
                <option value="ON_REQUEST">Quando solicitado</option>
                <option value="ARRANQUE">Durante o Arranque</option>
                <option value="ESQUETE">Durante a Esquete</option>
                <option value="BRINCADEIRA">Durante a Brincadeira</option>
              </select>
            </div>

            {displayTrigger === 'RUN_ITEM' && (
              <div>
                <label htmlFor="media-block" className="block text-sm font-medium text-zinc-300">
                  Momento do roteiro
                </label>
                <select
                  id="media-block"
                  value={uploadRunItemId}
                  onChange={(e) => setUploadRunItemId(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white"
                >
                  {sortedRunItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.plannedTime} – {item.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {displayTrigger === 'ON_REQUEST' && (
              <div>
                <label htmlFor="requested-by" className="block text-sm font-medium text-zinc-300">
                  Quem vai solicitar?
                </label>
                <input
                  id="requested-by"
                  type="text"
                  required
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  placeholder="Ex.: Apresentador, Pr. Lucas, Líder da Esquete"
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white placeholder:text-zinc-600 focus:border-[#0095FF] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label htmlFor="media-target" className="block text-sm font-medium text-zinc-300">
                Telas
              </label>
              <select
                id="media-target"
                value={targetScreen}
                onChange={(e) => setTargetScreen(e.target.value as ScreenTarget)}
                className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white"
              >
                <option value="ALL">Nos 3 telões</option>
                <option value="CENTER">Só Telão Central (3840×2160)</option>
                <option value="SIDES">Só Laterais (3200×1800)</option>
              </select>
            </div>

            <div>
              <label htmlFor="media-note" className="block text-sm font-medium text-zinc-300">
                Nota no arquivo para a Projeção
              </label>
              <textarea
                id="media-note"
                rows={2}
                value={mediaNote}
                onChange={(e) => setMediaNote(e.target.value)}
                placeholder="Ex.: Deixar em loop até a equipe sair do palco..."
                className="mt-1 w-full rounded-lg border border-white/12 bg-[#0B0C0F] p-3 text-base text-white placeholder:text-zinc-600 focus:border-[#0095FF] focus:outline-none"
              />
            </div>

            {uploadError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/45 bg-red-500/12 p-3 text-sm text-red-200">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>{uploadError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!canEditProgramming || state.isFrozen || !pendingFile}
              className="min-h-[48px] w-full rounded-lg bg-[#0095FF] text-sm font-semibold text-white hover:bg-[#0082E0] disabled:opacity-40"
            >
              Enviar arquivo para a Projeção
            </button>
          </form>

          {/* Lista de mídias já enviadas */}
          <section className="rounded-xl border border-white/10 bg-[#12141A] p-5 lg:col-span-6">
            <h2 className="text-base font-semibold text-white">
              Mídias enviadas ({state.mediaAssets.length})
            </h2>

            <div className="mt-4 divide-y divide-white/8 rounded-lg border border-white/10 bg-[#0B0C0F]">
              {state.mediaAssets.map((asset) => (
                <div key={asset.id} className="space-y-2 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {asset.validationStatus === 'VALID' ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-[#F5C41E]" />
                        )}
                        <span className="truncate text-sm font-medium text-white">
                          {asset.normalizedFilename}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-[#38BDF8]">
                        Quando exibir: {describeMediaTrigger(asset, state)}
                      </p>
                      {asset.note && (
                        <p className="mt-1 text-xs text-zinc-300">Nota: {asset.note}</p>
                      )}
                      {asset.adjustmentRequest && (
                        <p className="mt-1 rounded border border-[#F5C41E]/40 bg-[#F5C41E]/10 px-2 py-1 text-xs font-medium text-[#F5C41E]">
                          Ajuste pedido pela Projeção: {asset.adjustmentRequest.reason}
                        </p>
                      )}
                      <p className="font-mono-tech mt-1 text-[11px] text-zinc-500">
                        {getMediaAssetResolutionSummary(asset)} · {formatBytes(asset.fileSizeBytes)} · {asset.targetScreen}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      {asset.objectUrl && (asset.category === 'VIDEO' || asset.category === 'IMAGE') && (
                        <button
                          type="button"
                          onClick={() => {
                            setPendingPreviewUrl(asset.objectUrl!);
                            setPendingFile(null);
                          }}
                          className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-white/12 px-2.5 text-xs text-white"
                        >
                          <Play className="h-3.5 w-3.5 text-[#0095FF]" />
                          <span>Ver</span>
                        </button>
                      )}

                      {isLeader && (
                        <button
                          type="button"
                          onClick={() => onToggleApproveMedia(asset.id)}
                          className={`min-h-[40px] rounded-lg px-2.5 text-xs font-semibold ${
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
                          className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-white/12 text-zinc-400 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      {/* 3. IMPORTAR ROTEIRO E CHECKLIST AO VIVO DO QUE JÁ CHEGOU */}
      <section className="rounded-xl border border-white/10 bg-[#12141A] p-5 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Roteiro e Checklist do que já chegou
            </h2>
            <p className="mt-0.5 text-sm text-zinc-400">
              Suba a imagem do roteiro semanal. O sistema grava os horários e marca em verde o que já chegou (músicas e mídias).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <label
              className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg bg-[#0095FF] px-4 text-sm font-semibold text-white hover:bg-[#0082E0] ${
                !canEditProgramming || state.isFrozen ? 'pointer-events-none opacity-45' : ''
              }`}
            >
              <FileImage className="h-4 w-4" />
              <span>Ler imagem do roteiro</span>
              <input
                type="file"
                accept="image/*"
                disabled={!canEditProgramming || state.isFrozen}
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
              disabled={!canEditProgramming || state.isFrozen}
              onClick={() => setDraftScheduleText(SAMPLE_SCHEDULE_TEXT)}
              className="min-h-[44px] rounded-lg border border-white/12 px-3 text-xs font-medium text-zinc-300 hover:bg-white/5 disabled:opacity-45"
            >
              Carregar exemplo 21/11
            </button>
          </div>
        </div>

        {ocrLoading && (
          <div className="flex items-center gap-2.5 rounded-lg border border-[#0095FF]/35 bg-[#0095FF]/10 p-3 text-sm text-white">
            <Loader2 className="h-4 w-4 animate-spin text-[#0095FF]" />
            <span>Lendo imagem do roteiro... {ocrProgress}%</span>
          </div>
        )}

        {(draftScheduleText || scheduleImagePreview) && (
          <div className="grid gap-4 lg:grid-cols-12">
            {scheduleImagePreview && (
              <div className="lg:col-span-4">
                <img
                  src={scheduleImagePreview}
                  alt="Imagem do roteiro importada"
                  className="max-h-72 w-full rounded-lg border border-white/10 bg-black object-contain"
                />
              </div>
            )}

            <div className={scheduleImagePreview ? 'lg:col-span-8' : 'lg:col-span-12'}>
              <label htmlFor="ocr-text" className="block text-sm font-medium text-zinc-300">
                Horários detectados (confira ou ajuste antes de gravar)
              </label>
              <textarea
                id="ocr-text"
                rows={6}
                value={draftScheduleText}
                onChange={(e) => setDraftScheduleText(e.target.value)}
                className="font-mono-tech mt-1.5 w-full rounded-lg border border-white/12 bg-[#0B0C0F] p-3 text-sm text-white focus:border-[#0095FF] focus:outline-none"
              />
              <button
                type="button"
                disabled={!canEditProgramming || state.isFrozen}
                onClick={handleApplyParsedSchedule}
                className="btn-rb-primary mt-3 min-h-[44px] rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-45"
              >
                Gravar horários e validar checklist
              </button>
            </div>
          </div>
        )}

        {ocrError && <p className="text-sm text-red-400">{ocrError}</p>}
        {importSuccessMsg && <p className="text-sm text-emerald-400">{importSuccessMsg}</p>}

        {/* Checklist verde em tempo real */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">
              Checklist dos horários (<AnimatedCounter value={completedChecklistCount} />/
              <span className="font-mono-tech">{requiredChecklistCount}</span> itens prontos)
            </h3>
            <span className="text-xs text-zinc-400">
              {completedChecklistCount === requiredChecklistCount
                ? 'Tudo verde para o culto'
                : 'Vai ficando verde conforme músicas e mídias chegam'}
            </span>
          </div>

          <div className="divide-y divide-white/8 rounded-lg border border-white/10 bg-[#0B0C0F]">
            {checklist.map(({ item, kind, ready, detail }) => (
              <div
                key={item.id}
                className={`flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between ${
                  kind !== 'INFO' && ready ? 'bg-emerald-500/[0.06]' : ''
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="font-mono-tech shrink-0 rounded border border-white/10 bg-[#12141A] px-2 py-0.5 text-xs font-semibold text-zinc-200">
                    {item.plannedTime}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">{item.title}</div>
                    <div className="truncate text-xs text-zinc-400">{detail}</div>
                  </div>
                </div>

                <div className="shrink-0">
                  {kind === 'INFO' ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1 text-xs text-zinc-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Horário salvo</span>
                    </span>
                  ) : ready ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{kind === 'SONG' ? 'Música OK' : 'Mídia OK'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#F5C41E]/35 bg-[#F5C41E]/10 px-2.5 py-1 text-xs font-medium text-[#F5C41E]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{kind === 'SONG' ? 'Falta letra' : 'Falta mídia'}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
