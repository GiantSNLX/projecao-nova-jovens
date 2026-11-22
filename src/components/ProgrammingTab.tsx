import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  ListOrdered,
  Play,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  MediaAsset,
  ProgrammingTeam,
  Role,
  RunItem,
  RunItemType,
  ScreenTarget,
  ServiceState,
} from '../types/portal';
import { TEAM_LABELS } from '../data/initialState';
import {
  formatBytes,
  getExtension,
  getMediaAssetResolutionSummary,
  readMediaMetadata,
  sanitizeSlug,
  validateMediaForHolyrics,
} from '../utils/holyrics';
import { StageSimulator } from './StageSimulator';

interface ProgrammingTabProps {
  state: ServiceState;
  activeRole: Role;
  activeUserName: string;
  onChangeTeam: (team: ProgrammingTeam) => void;
  onAddRunItem: (item: Omit<RunItem, 'id' | 'orderIndex' | 'liveStatus'>) => void;
  onImportBatchRunItems: (items: Omit<RunItem, 'id' | 'orderIndex' | 'liveStatus'>[]) => void;
  onAddMediaAsset: (asset: MediaAsset, rawFile?: File) => void;
  onToggleApproveMedia: (assetId: string) => void;
  onRemoveMediaAsset: (assetId: string) => void;
}

export function ProgrammingTab({
  state,
  activeRole,
  activeUserName,
  onChangeTeam,
  onAddRunItem,
  onImportBatchRunItems,
  onAddMediaAsset,
  onToggleApproveMedia,
  onRemoveMediaAsset,
}: ProgrammingTabProps) {
  const canEditProgramming =
    activeRole === 'ADMIN' || activeRole === 'CAPTAIN' || activeRole === 'PROGRAMMING';
  const canApprove = activeRole === 'ADMIN' || activeRole === 'CAPTAIN';

  const [blockTitle, setBlockTitle] = useState('');
  const [blockTime, setBlockTime] = useState('20:00');
  const [blockDuration, setBlockDuration] = useState('10');
  const [blockType, setBlockType] = useState<RunItemType>('PROGRAMMING');
  const [blockDesc, setBlockDesc] = useState('');
  const [batchScript, setBatchScript] = useState('');

  const [uploadRunItemId, setUploadRunItemId] = useState<string>(state.runItems[0]?.id ?? '');
  const [targetScreen, setTargetScreen] = useState<ScreenTarget>('ALL');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [simulatorPreview, setSimulatorPreview] = useState<{
    url: string;
    filename: string;
  } | null>(null);

  const sortedRunItems = state.runItems.slice().sort((a, b) => a.orderIndex - b.orderIndex);

  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockTitle.trim()) return;
    onAddRunItem({
      plannedTime: blockTime,
      durationMinutes: Number(blockDuration) || 10,
      title: blockTitle.trim(),
      description: blockDesc.trim() || 'Bloco importado pela Programação.',
      itemType: blockType,
      responsibleName: TEAM_LABELS[state.programmingTeam].name,
      requiresMedia: true,
    });
    setBlockTitle('');
    setBlockDesc('');
  };

  const handleImportBatchScript = () => {
    const lines = batchScript
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const parsed: Omit<RunItem, 'id' | 'orderIndex' | 'liveStatus'>[] = [];
    for (const line of lines) {
      // Expected: "19:30 | 10 | Vídeo de Abertura | Equipe Alpha"
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 2) {
        parsed.push({
          plannedTime: parts[0] || '19:30',
          durationMinutes: Number(parts[1]) || 10,
          title: parts[2] || parts[1] || 'Bloco do Roteiro',
          description: parts[3] || 'Importado do roteiro em lote.',
          itemType: 'PROGRAMMING',
          responsibleName: parts[3] || TEAM_LABELS[state.programmingTeam].name,
          requiresMedia: true,
        });
      }
    }
    if (parsed.length > 0) {
      onImportBatchRunItems(parsed);
      setBatchScript('');
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    const meta = await readMediaMetadata(file);
    const check = validateMediaForHolyrics({
      filename: file.name,
      fileSizeBytes: file.size,
      widthPx: meta.widthPx,
      heightPx: meta.heightPx,
      screens: state.screens,
    });

    if (!check.category || check.status === 'REJECTED') {
      setUploadError(check.messages[0] ?? 'Arquivo recusado pelas especificações do Holyrics.');
      return;
    }

    const block = sortedRunItems.find((i) => i.id === uploadRunItemId) ?? sortedRunItems[0];
    const prefix = block ? String(block.orderIndex).padStart(2, '0') : '00';
    const ext = getExtension(file.name);
    const baseName = sanitizeSlug(file.name.slice(0, file.name.length - ext.length));
    const objectUrl = URL.createObjectURL(file);

    const newAsset: MediaAsset = {
      id: `med-${Date.now()}`,
      runItemId: block?.id ?? uploadRunItemId,
      targetScreen,
      category: check.category,
      originalFilename: file.name,
      normalizedFilename: `${prefix}_${baseName}${ext}`,
      extension: ext,
      mimeType: file.type || 'application/octet-stream',
      fileSizeBytes: file.size,
      widthPx: meta.widthPx,
      heightPx: meta.heightPx,
      aspectRatio: check.aspectRatio,
      durationSeconds: meta.durationSeconds,
      validationStatus: check.status,
      validationMessages: check.messages,
      uploadedBy: activeUserName,
      createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      approved: false,
      objectUrl,
    };

    onAddMediaAsset(newAsset, file);

    if (check.category === 'VIDEO' || check.category === 'IMAGE') {
      setSimulatorPreview({ url: objectUrl, filename: file.name });
    }
  };

  return (
    <div className="space-y-6">
      {/* Live 3-Screen Stage Simulator */}
      <StageSimulator
        screens={state.screens}
        initialUrl={simulatorPreview?.url}
        initialFilename={simulatorPreview?.filename}
      />

      {/* Team + Script Import + Media Upload */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Roteiro do Culto */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 lg:col-span-6 dark:border-white/10 dark:bg-[#12151C]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-[#0095FF]" />
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
                Roteiro — Programação {state.programmingTeam}
              </h2>
            </div>

            <div className="flex gap-1.5">
              {(['ALPHA', 'BRAVO', 'CHARLIE'] as ProgrammingTeam[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={!canEditProgramming || state.isFrozen}
                  onClick={() => onChangeTeam(t)}
                  className={`min-h-[40px] rounded-lg border px-2.5 text-xs font-semibold ${
                    state.programmingTeam === t
                      ? 'border-[#0095FF] bg-[#0095FF] text-white'
                      : 'border-zinc-300 text-zinc-700 dark:border-white/15 dark:text-zinc-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddBlock} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="run-time" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Horário
                </label>
                <input
                  id="run-time"
                  type="time"
                  disabled={!canEditProgramming || state.isFrozen}
                  value={blockTime}
                  onChange={(e) => setBlockTime(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="run-dur" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Duração (min)
                </label>
                <input
                  id="run-dur"
                  type="number"
                  min={1}
                  disabled={!canEditProgramming || state.isFrozen}
                  value={blockDuration}
                  onChange={(e) => setBlockDuration(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="run-type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Tipo
                </label>
                <select
                  id="run-type"
                  disabled={!canEditProgramming || state.isFrozen}
                  value={blockType}
                  onChange={(e) => setBlockType(e.target.value as RunItemType)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
                >
                  <option value="OPENING">Abertura</option>
                  <option value="WORSHIP">Louvor</option>
                  <option value="PROGRAMMING">Programação</option>
                  <option value="ANNOUNCEMENTS">Avisos</option>
                  <option value="WORD">Palavra</option>
                  <option value="CLOSING">Encerramento</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="run-title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Título do momento
              </label>
              <input
                id="run-title"
                type="text"
                required
                disabled={!canEditProgramming || state.isFrozen}
                value={blockTitle}
                onChange={(e) => setBlockTitle(e.target.value)}
                placeholder="Ex.: Quebra-gelo com vídeo de fundo"
                className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="run-desc" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Instrução para a projeção
              </label>
              <input
                id="run-desc"
                type="text"
                disabled={!canEditProgramming || state.isFrozen}
                value={blockDesc}
                onChange={(e) => setBlockDesc(e.target.value)}
                placeholder="Ex.: Soltar vídeo nas 3 telas e subir câmera após aplausos"
                className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={!canEditProgramming || state.isFrozen}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#0095FF] px-4 text-sm font-semibold text-white hover:bg-[#0080DC] disabled:opacity-45"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Bloco ao Roteiro</span>
            </button>
          </form>

          {/* Batch script importer */}
          <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-white/10">
            <label htmlFor="batch-script" className="block text-sm font-semibold text-zinc-900 dark:text-white">
              Importar roteiro em lote
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Formato por linha: <span className="font-mono-tech">19:30 | 10 | Título | Responsável</span>
            </p>
            <textarea
              id="batch-script"
              rows={3}
              disabled={!canEditProgramming || state.isFrozen}
              value={batchScript}
              onChange={(e) => setBatchScript(e.target.value)}
              placeholder={'20:10 | 8 | Teatro Especial | Equipe Alpha\n20:18 | 5 | Oferta e Dízimos | Mesa'}
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50 p-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
            />
            <button
              type="button"
              disabled={!canEditProgramming || state.isFrozen || !batchScript.trim()}
              onClick={handleImportBatchScript}
              className="mt-2 min-h-[44px] w-full rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-45 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
            >
              Importar Blocos no Roteiro
            </button>
          </div>
        </section>

        {/* Media Upload & Validated Queue */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 lg:col-span-6 dark:border-white/10 dark:bg-[#12151C]">
          <div className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-[#0095FF]" />
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
              Enviar Mídias do Culto (Validação Holyrics)
            </h2>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Aceita apenas formatos compatíveis com o Holyrics (.mp4, .mkv, .png, .jpg, .mp3, .wav, .pdf, .pptx).
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="media-block" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Bloco do roteiro
              </label>
              <select
                id="media-block"
                value={uploadRunItemId}
                onChange={(e) => setUploadRunItemId(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
              >
                {sortedRunItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {String(item.orderIndex).padStart(2, '0')} · {item.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="media-target" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Telas de destino
              </label>
              <select
                id="media-target"
                value={targetScreen}
                onChange={(e) => setTargetScreen(e.target.value as ScreenTarget)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
              >
                <option value="ALL">Todas (Central + Laterais)</option>
                <option value="CENTER">Somente Telão Central (3840×2160)</option>
                <option value="SIDES">Somente Laterais (3200×1800)</option>
              </select>
            </div>
          </div>

          <label
            className={`mt-4 flex min-h-[112px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
              !canEditProgramming || state.isFrozen
                ? 'cursor-not-allowed border-zinc-300 opacity-50 dark:border-white/10'
                : 'border-[#0095FF]/50 bg-[#0095FF]/5 hover:bg-[#0095FF]/10'
            }`}
          >
            <FileUp className="h-6 w-6 text-[#0095FF]" />
            <span className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">
              Selecionar mídia para validar e anexar ao bloco
            </span>
            <span className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Ao enviar vídeo/imagem, o Simulador acima já abre a prévia nas 3 telas
            </span>
            <input
              type="file"
              disabled={!canEditProgramming || state.isFrozen}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFileUpload(f);
                e.target.value = '';
              }}
            />
          </label>

          {uploadError && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Uploaded Media Assets List */}
          <div className="mt-5 space-y-2.5">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Arquivos anexados ao culto ({state.mediaAssets.length})
            </h3>

            {state.mediaAssets.map((asset) => {
              const block = sortedRunItems.find((r) => r.id === asset.runItemId);
              return (
                <div
                  key={asset.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 dark:border-white/10 dark:bg-[#171B24]"
                >
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {asset.validationStatus === 'VALID' ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-[#F5C41E]" />
                        )}
                        <span className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                          {asset.normalizedFilename}
                        </span>
                      </div>
                      <p className="font-mono-tech mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Bloco {block?.orderIndex ?? '?'} · {getMediaAssetResolutionSummary(asset)} ·{' '}
                        {formatBytes(asset.fileSizeBytes)} · Destino: {asset.targetScreen}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                        {asset.validationMessages[0]}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      {asset.objectUrl && (asset.category === 'VIDEO' || asset.category === 'IMAGE') && (
                        <button
                          type="button"
                          onClick={() =>
                            setSimulatorPreview({
                              url: asset.objectUrl!,
                              filename: asset.originalFilename,
                            })
                          }
                          className="inline-flex min-h-[40px] items-center gap-1 rounded-lg bg-[#0095FF]/15 px-2.5 text-xs font-semibold text-[#38BDF8]"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>Simular</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={!canApprove}
                        onClick={() => onToggleApproveMedia(asset.id)}
                        className={`min-h-[40px] rounded-lg px-2.5 text-xs font-semibold disabled:opacity-60 ${
                          asset.approved
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-[#F5C41E]/15 text-[#F5C41E]'
                        }`}
                      >
                        {asset.approved ? 'Aprovada' : 'Aprovar'}
                      </button>

                      {canEditProgramming && !state.isFrozen && (
                        <button
                          type="button"
                          aria-label={`Excluir ${asset.normalizedFilename}`}
                          onClick={() => onRemoveMediaAsset(asset.id)}
                          className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
