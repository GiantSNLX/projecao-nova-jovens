import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Info,
  Play,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  MediaAsset,
  ProgrammingTeam,
  RunItem,
  RunItemType,
  ScreenTarget,
  ServiceState,
} from '../types/portal';
import { HOLYRICS_SPECS, TEAM_LABELS } from '../data/initialState';
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
  canEditProgramming: boolean;
  canApprove: boolean;
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
  canEditProgramming,
  canApprove,
  activeUserName,
  onChangeTeam,
  onAddRunItem,
  onImportBatchRunItems,
  onAddMediaAsset,
  onToggleApproveMedia,
  onRemoveMediaAsset,
}: ProgrammingTabProps) {
  const [blockTitle, setBlockTitle] = useState('');
  const [blockTime, setBlockTime] = useState('20:00');
  const [blockDuration, setBlockDuration] = useState('10');
  const [blockType, setBlockType] = useState<RunItemType>('PROGRAMMING');
  const [blockDesc, setBlockDesc] = useState('');
  const [batchScript, setBatchScript] = useState('');

  const [uploadRunItemId, setUploadRunItemId] = useState<string>(state.runItems[0]?.id ?? '');
  const [targetScreen, setTargetScreen] = useState<ScreenTarget>('ALL');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSpecs, setShowSpecs] = useState(false);
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
      description: blockDesc.trim() || 'Momento da programação.',
      itemType: blockType,
      responsibleName: `Equipe ${TEAM_LABELS[state.programmingTeam].name}`,
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
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 2) {
        parsed.push({
          plannedTime: parts[0] || '19:30',
          durationMinutes: Number(parts[1]) || 10,
          title: parts[2] || parts[1] || 'Bloco do roteiro',
          description: parts[3] || 'Importado no roteiro.',
          itemType: 'PROGRAMMING',
          responsibleName: parts[3] || `Equipe ${TEAM_LABELS[state.programmingTeam].name}`,
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
      setUploadError(check.messages[0] ?? 'Formato não aceito pelo Holyrics.');
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
    <div className="space-y-8">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Programação e Mídias
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Importe o roteiro, envie as mídias dentro do padrão do Holyrics e teste nos três telões antes do culto.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['ALPHA', 'BRAVO', 'CHARLIE'] as ProgrammingTeam[]).map((t) => (
            <button
              key={t}
              type="button"
              disabled={!canEditProgramming || state.isFrozen}
              onClick={() => onChangeTeam(t)}
              className={`min-h-[44px] rounded-lg border px-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
                state.programmingTeam === t
                  ? 'border-[#0095FF] bg-[#0095FF] text-white'
                  : 'border-white/12 text-zinc-300 hover:bg-white/5'
              }`}
            >
              {TEAM_LABELS[t].name}
            </button>
          ))}
        </div>
      </div>

      {/* Simulador dos 3 Telões */}
      <StageSimulator
        screens={state.screens}
        initialUrl={simulatorPreview?.url}
        initialFilename={simulatorPreview?.filename}
      />

      {/* Formatos aceitos pelo Holyrics */}
      <div className="rounded-xl border border-white/10 bg-[#12141A]">
        <button
          type="button"
          onClick={() => setShowSpecs((v) => !v)}
          className="flex min-h-[52px] w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-white"
        >
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 text-[#F5C41E]" />
            <span>Mídias aceitas pelo Holyrics e resoluções recomendadas</span>
          </span>
          <span className="text-xs text-[#0095FF]">
            {showSpecs ? 'Ocultar' : 'Ver especificações'}
          </span>
        </button>

        {showSpecs && (
          <div className="divide-y divide-white/8 border-t border-white/10">
            {HOLYRICS_SPECS.map((spec) => (
              <div key={spec.category} className="grid gap-2 p-4 sm:grid-cols-12 sm:items-start">
                <div className="sm:col-span-3">
                  <div className="text-sm font-semibold text-white">{spec.title}</div>
                  <div className="font-mono-tech mt-1 text-xs text-[#38BDF8]">
                    {spec.acceptedExtensions.join(' ')}
                  </div>
                </div>
                <div className="text-sm text-zinc-300 sm:col-span-4">
                  <div>{spec.recommended}</div>
                  <div className="mt-0.5 text-xs text-zinc-400">{spec.resolutionRule}</div>
                </div>
                <div className="text-xs text-zinc-400 sm:col-span-5">{spec.notes}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Roteiro */}
        <section className="rounded-xl border border-white/10 bg-[#12141A] p-5 lg:col-span-6">
          <h2 className="text-base font-semibold text-white">Roteiro do culto</h2>

          <form onSubmit={handleAddBlock} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="run-time" className="block text-sm font-medium text-zinc-300">
                  Horário
                </label>
                <input
                  id="run-time"
                  type="time"
                  disabled={!canEditProgramming || state.isFrozen}
                  value={blockTime}
                  onChange={(e) => setBlockTime(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white"
                />
              </div>
              <div>
                <label htmlFor="run-dur" className="block text-sm font-medium text-zinc-300">
                  Duração (min)
                </label>
                <input
                  id="run-dur"
                  type="number"
                  min={1}
                  disabled={!canEditProgramming || state.isFrozen}
                  value={blockDuration}
                  onChange={(e) => setBlockDuration(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white"
                />
              </div>
              <div>
                <label htmlFor="run-type" className="block text-sm font-medium text-zinc-300">
                  Tipo
                </label>
                <select
                  id="run-type"
                  disabled={!canEditProgramming || state.isFrozen}
                  value={blockType}
                  onChange={(e) => setBlockType(e.target.value as RunItemType)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white"
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
              <label htmlFor="run-title" className="block text-sm font-medium text-zinc-300">
                Nome do momento
              </label>
              <input
                id="run-title"
                type="text"
                required
                disabled={!canEditProgramming || state.isFrozen}
                value={blockTitle}
                onChange={(e) => setBlockTitle(e.target.value)}
                placeholder="Ex.: Vídeo de chamada para o acampamento"
                className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label htmlFor="run-desc" className="block text-sm font-medium text-zinc-300">
                Orientação para a mesa
              </label>
              <input
                id="run-desc"
                type="text"
                disabled={!canEditProgramming || state.isFrozen}
                value={blockDesc}
                onChange={(e) => setBlockDesc(e.target.value)}
                placeholder="Opcional"
                className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white placeholder:text-zinc-600"
              />
            </div>

            <button
              type="submit"
              disabled={!canEditProgramming || state.isFrozen}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#0095FF] px-4 text-sm font-semibold text-white hover:bg-[#0082E0] disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar ao roteiro</span>
            </button>
          </form>

          <div className="mt-5 border-t border-white/10 pt-4">
            <label htmlFor="batch-script" className="block text-sm font-medium text-zinc-300">
              Importar roteiro por texto (Horário | Min | Título | Equipe)
            </label>
            <textarea
              id="batch-script"
              rows={3}
              disabled={!canEditProgramming || state.isFrozen}
              value={batchScript}
              onChange={(e) => setBatchScript(e.target.value)}
              placeholder={'20:10 | 8 | Teatro Especial | Equipe Alpha'}
              className="mt-1.5 w-full rounded-lg border border-white/12 bg-[#0B0C0F] p-3 text-base text-white placeholder:text-zinc-600"
            />
            <button
              type="button"
              disabled={!canEditProgramming || state.isFrozen || !batchScript.trim()}
              onClick={handleImportBatchScript}
              className="mt-2 min-h-[44px] w-full rounded-lg border border-white/12 text-sm font-medium text-zinc-200 hover:bg-white/5 disabled:opacity-40"
            >
              Importar linhas
            </button>
          </div>
        </section>

        {/* Envio de Mídias */}
        <section className="rounded-xl border border-white/10 bg-[#12141A] p-5 lg:col-span-6">
          <h2 className="text-base font-semibold text-white">Enviar mídias do culto</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                    {String(item.orderIndex).padStart(2, '0')} · {item.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="media-target" className="block text-sm font-medium text-zinc-300">
                Onde vai aparecer
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
          </div>

          <label
            className={`mt-4 flex min-h-[96px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center transition-colors ${
              !canEditProgramming || state.isFrozen
                ? 'cursor-not-allowed border-white/10 opacity-45'
                : 'border-[#0095FF]/50 bg-[#0B0C0F] hover:bg-white/[0.03]'
            }`}
          >
            <FileUp className="h-5 w-5 text-[#0095FF]" />
            <span className="mt-1.5 text-sm font-medium text-white">
              Selecionar vídeo, imagem, áudio ou PDF
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
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="mt-5 divide-y divide-white/8 rounded-lg border border-white/10 bg-[#0B0C0F]">
            {state.mediaAssets.map((asset) => {
              const block = sortedRunItems.find((r) => r.id === asset.runItemId);
              return (
                <div
                  key={asset.id}
                  className="flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
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
                    <p className="font-mono-tech mt-0.5 text-xs text-zinc-500">
                      Bloco {block?.orderIndex ?? '?'} · {getMediaAssetResolutionSummary(asset)} ·{' '}
                      {formatBytes(asset.fileSizeBytes)}
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
                        className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-white/12 px-2.5 text-xs font-medium text-white hover:bg-white/5"
                      >
                        <Play className="h-3.5 w-3.5 text-[#0095FF]" />
                        <span>Simular</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!canApprove}
                      onClick={() => onToggleApproveMedia(asset.id)}
                      className={`min-h-[40px] rounded-lg px-2.5 text-xs font-semibold disabled:opacity-60 ${
                        asset.approved
                          ? 'bg-emerald-500/15 text-emerald-300'
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
                        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-white/12 text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
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
