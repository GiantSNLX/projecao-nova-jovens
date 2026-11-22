import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Copy,
  Download,
  Play,
  UserCheck,
  X,
} from 'lucide-react';
import type { MediaAsset, MemberUser, ServiceSong, ServiceState } from '../types/portal';
import { DESK_POSITION_INFO } from '../data/initialState';
import {
  describeMediaTrigger,
  formatBytes,
  formatHolyricsVersions,
  generateAndDownloadHolyricsZip,
  getMediaAssetResolutionSummary,
  sanitizeSlug,
} from '../utils/holyrics';
import { StageSimulator } from './StageSimulator';

interface CultoTabProps {
  state: ServiceState;
  members: MemberUser[];
  canOperateDesk: boolean;
  uploadedFilesMap: Map<string, File>;
  onSelectServiceDate: (date: string) => void;
  onUpdateLiveNotes: (notes: string) => void;
  onRequestMediaAdjustment: (assetId: string, reason: string) => void;
  onRequestSongAdjustment: (songId: string, reason: string) => void;
  onPackageGenerated: (zipName: string, count: number) => void;
}

function formatDateBr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

export function CultoTab({
  state,
  members,
  canOperateDesk,
  uploadedFilesMap,
  onSelectServiceDate,
  onUpdateLiveNotes,
  onRequestMediaAdjustment,
  onRequestSongAdjustment,
  onPackageGenerated,
}: CultoTabProps) {
  const [notesDraft, setNotesDraft] = useState(state.liveNotes);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal state for Testing media & requesting adjustment
  const [testingAsset, setTestingAsset] = useState<MediaAsset | null>(null);
  const [adjustingMediaId, setAdjustingMediaId] = useState<string | null>(null);
  const [adjustingSongId, setAdjustingSongId] = useState<string | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  useEffect(() => {
    setNotesDraft(state.liveNotes);
  }, [state.liveNotes]);

  const upcomingSchedules = state.schedules
    .filter((s) => !s.isPast)
    .sort((a, b) => a.date.localeCompare(b.date));

  const currentSchedule =
    upcomingSchedules.find((s) => s.date === state.serviceDate) ?? upcomingSchedules[0];

  const sortedItems = state.runItems.slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const onDemandMedia = state.mediaAssets.filter((m) => m.displayTrigger !== 'RUN_ITEM');

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

    // Demo placeholder info file when no local binary was uploaded in this browser session
    const infoText = [
      `Arquivo de referência: ${asset.normalizedFilename}`,
      `Original: ${asset.originalFilename}`,
      `Quando exibir: ${describeMediaTrigger(asset, state)}`,
      `Telas: ${asset.targetScreen}`,
      `Nota: ${asset.note || '—'}`,
      ``,
      `(Este item é um exemplo inicial; arquivos enviados na aba "Programação e Mídias" são baixados em formato original.)`,
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

  const renderMediaActionCard = (m: MediaAsset) => (
    <div
      key={m.id}
      className="mt-2 rounded-lg border border-white/10 bg-[#0B0C0F] p-3 text-xs"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-white">{m.normalizedFilename}</span>
            <span className="font-mono-tech text-[11px] text-zinc-400">
              {getMediaAssetResolutionSummary(m)} · {formatBytes(m.fileSizeBytes)} · {m.targetScreen}
            </span>
          </div>
          <p className="mt-0.5 text-[#38BDF8]">{describeMediaTrigger(m, state)}</p>
          {m.note && <p className="mt-1 text-zinc-300">Nota: {m.note}</p>}
          {m.adjustmentRequest && (
            <div className="mt-1.5 flex items-start gap-1.5 rounded border border-[#F5C41E]/40 bg-[#F5C41E]/10 px-2.5 py-1.5 text-[#F5C41E]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Ajuste solicitado ({m.adjustmentRequest.requestedBy}):{' '}
                {m.adjustmentRequest.reason}
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setTestingAsset(m);
              setAdjustingMediaId(null);
              setAdjustmentReason('');
            }}
            className="inline-flex min-h-[38px] items-center gap-1 rounded-lg bg-[#0095FF] px-3 text-xs font-semibold text-white hover:bg-[#0082E0]"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Testar</span>
          </button>

          <button
            type="button"
            onClick={() => handleDownloadIndividualMedia(m)}
            className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-white/12 px-2.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Baixar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAdjustingMediaId(adjustingMediaId === m.id ? null : m.id);
              setAdjustmentReason(m.adjustmentRequest?.reason ?? '');
            }}
            className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-[#F5C41E]/35 px-2.5 text-xs font-medium text-[#F5C41E] hover:bg-[#F5C41E]/10"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Ajuste</span>
          </button>
        </div>
      </div>

      {adjustingMediaId === m.id && (
        <div className="mt-2.5 flex flex-col gap-2 border-t border-white/10 pt-2.5 sm:flex-row">
          <input
            type="text"
            value={adjustmentReason}
            onChange={(e) => setAdjustmentReason(e.target.value)}
            placeholder="Descreva o ajuste necessário (ex.: veio 9:16, sem áudio...)"
            className="min-h-[40px] flex-1 rounded-lg border border-white/12 bg-[#12141A] px-3 text-sm text-white placeholder:text-zinc-500 focus:border-[#0095FF] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => submitMediaAdjustment(m.id)}
            className="min-h-[40px] rounded-lg bg-[#F5C41E] px-3.5 text-xs font-semibold text-zinc-950 hover:bg-[#E0B317]"
          >
            Enviar pedido
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header with Culto / Sábado selector */}
      <section className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Culto</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Confira as mídias e letras recebidas, teste nos três telões, solicite ajustes ou baixe tudo para o Holyrics.
          </p>
        </div>

        <div className="w-full sm:w-auto sm:min-w-[280px]">
          <label htmlFor="culto-select" className="block text-xs font-medium text-zinc-400">
            Culto selecionado
          </label>
          <select
            id="culto-select"
            value={currentSchedule?.date ?? state.serviceDate}
            onChange={(e) => onSelectServiceDate(e.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#12141A] px-3 text-sm font-medium text-white focus:border-[#0095FF] focus:outline-none"
          >
            {upcomingSchedules.map((sched) => (
              <option key={sched.date} value={sched.date}>
                {formatDateBr(sched.date)} — {sched.title}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Equipe na mesa (6 posições) */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">
          Equipe escalada ({currentSchedule?.title ?? state.title})
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {(currentSchedule?.assignments ?? state.assignments).map((asg) => {
            const member = members.find((m) => m.id === asg.userId);
            const pos = DESK_POSITION_INFO[asg.position];
            return (
              <div
                key={asg.id}
                className={`rounded-xl border px-3.5 py-3 ${
                  asg.servingOnDesk
                    ? 'border-emerald-500/35 bg-emerald-500/8'
                    : 'border-white/10 bg-[#12141A]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{pos.short}</span>
                  {asg.servingOnDesk && <UserCheck className="h-3.5 w-3.5 text-emerald-400" />}
                </div>
                <p className="mt-1 truncate text-sm text-zinc-300">{member?.name ?? '—'}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Conferência do Roteiro, Mídias e Letras */}
        <section className="lg:col-span-8">
          <h2 className="mb-3 text-base font-semibold text-white">
            Conferência de mídias e músicas ({sortedItems.length} momentos)
          </h2>

          <div className="divide-y divide-white/8 rounded-xl border border-white/10 bg-[#12141A]">
            {sortedItems.map((item) => {
              const itemMedia = state.mediaAssets.filter(
                (m) => m.displayTrigger === 'RUN_ITEM' && m.runItemId === item.id,
              );
              const linkedSong = item.songCode
                ? state.songs.find((s) => s.songCode === item.songCode)
                : undefined;

              return (
                <div key={item.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono-tech font-medium text-zinc-300">
                      {item.plannedTime}
                    </span>
                    {item.durationMinutes > 0 && (
                      <span className="font-mono-tech text-zinc-500">
                        ({item.durationMinutes}min)
                      </span>
                    )}
                    <span className="text-zinc-500">· {item.responsibleName}</span>
                  </div>

                  <h3 className="mt-1 text-base font-medium text-white">{item.title}</h3>

                  {linkedSong && (
                    <div className="mt-2 space-y-2">
                      {linkedSong.rawLyrics.trim() ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleCopySong(linkedSong, 'two')}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/12 bg-[#0B0C0F] px-2.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
                          >
                            <Copy className="h-3.5 w-3.5 text-[#0095FF]" />
                            <span>
                              {copiedKey === `${linkedSong.id}-two`
                                ? 'Copiado!'
                                : 'Principal (2 linhas)'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSong(linkedSong, 'two')}
                            aria-label={`Baixar ${linkedSong.title} 2 linhas`}
                            className="inline-flex min-h-[38px] items-center rounded-lg border border-white/12 bg-[#0B0C0F] px-2.5 text-xs text-zinc-300 hover:bg-white/5"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleCopySong(linkedSong, 'one')}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/12 bg-[#0B0C0F] px-2.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
                          >
                            <Copy className="h-3.5 w-3.5 text-[#F5C41E]" />
                            <span>
                              {copiedKey === `${linkedSong.id}-one`
                                ? 'Copiado!'
                                : 'Retorno / Studio (1 linha)'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSong(linkedSong, 'one')}
                            aria-label={`Baixar ${linkedSong.title} 1 linha`}
                            className="inline-flex min-h-[38px] items-center rounded-lg border border-white/12 bg-[#0B0C0F] px-2.5 text-xs text-zinc-300 hover:bg-white/5"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAdjustingSongId(
                                adjustingSongId === linkedSong.id ? null : linkedSong.id,
                              );
                              setAdjustmentReason(linkedSong.adjustmentRequest?.reason ?? '');
                            }}
                            className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-[#F5C41E]/35 px-2.5 text-xs font-medium text-[#F5C41E] hover:bg-[#F5C41E]/10"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Ajuste</span>
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-[#F5C41E]">
                          Aguardando Ministério de Música enviar a letra ({linkedSong.songCode})
                        </p>
                      )}

                      {linkedSong.adjustmentRequest && (
                        <div className="flex items-start gap-1.5 rounded border border-[#F5C41E]/40 bg-[#F5C41E]/10 px-2.5 py-1.5 text-xs text-[#F5C41E]">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            Ajuste pedido ({linkedSong.adjustmentRequest.requestedBy}):{' '}
                            {linkedSong.adjustmentRequest.reason}
                          </span>
                        </div>
                      )}

                      {adjustingSongId === linkedSong.id && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            value={adjustmentReason}
                            onChange={(e) => setAdjustmentReason(e.target.value)}
                            placeholder="O que precisa ajustar na letra?"
                            className="min-h-[40px] flex-1 rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-sm text-white placeholder:text-zinc-500"
                          />
                          <button
                            type="button"
                            onClick={() => submitSongAdjustment(linkedSong.id)}
                            className="min-h-[40px] rounded-lg bg-[#F5C41E] px-3.5 text-xs font-semibold text-zinc-950"
                          >
                            Enviar pedido
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {itemMedia.map((m) => renderMediaActionCard(m))}
                </div>
              );
            })}
          </div>
        </section>

        {/* Lateral direita: Mídias de gatilho rápido + Baixar pacote + Aviso */}
        <section className="space-y-6 lg:col-span-4">
          <div className="rounded-xl border border-white/10 bg-[#12141A] p-4">
            <h2 className="text-base font-semibold text-white">
              Mídias de gatilho rápido ({onDemandMedia.length})
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Arranque, Esquete, Brincadeira ou Quando solicitado.
            </p>

            {onDemandMedia.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Nenhuma mídia avulsa enviada.</p>
            ) : (
              <div className="mt-2">{onDemandMedia.map((m) => renderMediaActionCard(m))}</div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#12141A] p-4">
            <h2 className="text-base font-semibold text-white">Baixar pacote do Holyrics</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Pasta compactada (.zip) com <span className="font-mono-tech">01 - 1 linha</span> (Retorno/Studio), <span className="font-mono-tech">02 - 2 linhas</span> (Principal), roteiro e mídias.
            </p>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => void handleDownloadHolyricsZip()}
              className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#0095FF] px-4 text-sm font-semibold text-white hover:bg-[#0082E0] disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isExporting ? 'Gerando .ZIP...' : 'Baixar Pacote .ZIP Holyrics'}</span>
            </button>

            {exportedFilename && (
              <p className="mt-3 text-xs text-emerald-400">
                Pacote baixado: {exportedFilename}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#12141A] p-4">
            <h2 className="text-base font-semibold text-white">Aviso na mesa</h2>
            <textarea
              rows={3}
              value={notesDraft}
              disabled={!canOperateDesk}
              onChange={(e) => setNotesDraft(e.target.value)}
              className="mt-2.5 w-full rounded-lg border border-white/12 bg-[#0B0C0F] p-3 text-base text-white focus:border-[#0095FF] focus:outline-none disabled:opacity-60"
            />
            {canOperateDesk && (
              <button
                type="button"
                onClick={() => onUpdateLiveNotes(notesDraft)}
                className="mt-2.5 min-h-[44px] w-full rounded-lg border border-white/12 text-sm font-medium text-white hover:bg-white/5"
              >
                Salvar aviso
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Modal Player / Simulador ao clicar em Testar */}
      {testingAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6"
          onClick={() => setTestingAsset(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0B0C0F] p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Testar mídia: {testingAsset.normalizedFilename}
                </h2>
                <p className="mt-0.5 text-sm text-[#38BDF8]">
                  {describeMediaTrigger(testingAsset, state)}
                  {testingAsset.note ? ` · Nota: ${testingAsset.note}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTestingAsset(null)}
                aria-label="Fechar reprodutor"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/12 text-zinc-300 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {testingAsset.category === 'AUDIO' && testingAsset.objectUrl ? (
              <div className="rounded-xl border border-white/10 bg-[#12141A] p-6">
                <p className="mb-3 text-sm text-zinc-300">Reprodutor de áudio</p>
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
              <p className="mt-3 text-xs text-zinc-400">
                Obs.: Este arquivo é um item inicial de demonstração (sem arquivo binário anexado). Quando a Programação envia um vídeo ou imagem real, ele toca diretamente nos 3 telões acima.
              </p>
            )}

            {/* Ações rápidas dentro do modal: Baixar ou Solicitar ajuste */}
            <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => handleDownloadIndividualMedia(testingAsset)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/12 px-4 text-sm font-medium text-white hover:bg-white/5"
              >
                <Download className="h-4 w-4" />
                <span>Baixar arquivo</span>
              </button>

              <div className="flex flex-1 flex-col gap-2 sm:max-w-lg sm:flex-row">
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Precisa de ajuste? Descreva aqui..."
                  className="min-h-[44px] flex-1 rounded-lg border border-white/12 bg-[#12141A] px-3 text-sm text-white placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!adjustmentReason.trim()) return;
                    submitMediaAdjustment(testingAsset.id);
                    setTestingAsset(null);
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-[#F5C41E] px-4 text-sm font-semibold text-zinc-950 hover:bg-[#E0B317]"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Solicitar ajuste</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
