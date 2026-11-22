import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  Play,
  Radio,
  SkipForward,
  UserCheck,
} from 'lucide-react';
import type { LiveItemStatus, MemberUser, ServiceSong, ServiceState } from '../types/portal';
import { DESK_POSITION_INFO } from '../data/initialState';
import {
  describeMediaTrigger,
  formatHolyricsVersions,
  generateAndDownloadHolyricsZip,
  sanitizeSlug,
} from '../utils/holyrics';

interface CultoTabProps {
  state: ServiceState;
  members: MemberUser[];
  canOperateDesk: boolean;
  uploadedFilesMap: Map<string, File>;
  onUpdateLiveItem: (itemId: string, status: LiveItemStatus) => void;
  onToggleServiceLive: () => void;
  onUpdateLiveNotes: (notes: string) => void;
  onPackageGenerated: (zipName: string, count: number) => void;
}

export function CultoTab({
  state,
  members,
  canOperateDesk,
  uploadedFilesMap,
  onUpdateLiveItem,
  onToggleServiceLive,
  onUpdateLiveNotes,
  onPackageGenerated,
}: CultoTabProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notesDraft, setNotesDraft] = useState(state.liveNotes);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setNotesDraft(state.liveNotes);
  }, [state.liveNotes]);

  useEffect(() => {
    if (state.status !== 'LIVE') return;
    const id = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [state.status]);

  const sortedItems = state.runItems.slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const onDemandMedia = state.mediaAssets.filter((m) => m.displayTrigger !== 'RUN_ITEM');

  const hh = Math.floor(elapsedSeconds / 3600);
  const mm = Math.floor((elapsedSeconds % 3600) / 60);
  const ss = elapsedSeconds % 60;
  const clockStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

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

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Culto</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Roteiro, letras prontas para Principal (2 linhas) e Retorno/Studio (1 linha), mídias e notas na mesa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg border border-white/10 bg-[#12141A] px-4 py-2">
            <span className="block text-[11px] text-zinc-400">Tempo de culto</span>
            <span className="font-mono-tech text-lg font-semibold text-white">
              {clockStr}
            </span>
          </div>

          <button
            type="button"
            disabled={!canOperateDesk}
            onClick={onToggleServiceLive}
            className={`inline-flex min-h-[48px] items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white transition-colors disabled:opacity-40 ${
              state.status === 'LIVE'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#0095FF] hover:bg-[#0082E0]'
            }`}
          >
            <Radio className="h-4 w-4" />
            <span>{state.status === 'LIVE' ? 'Encerrar culto' : 'Iniciar culto'}</span>
          </button>
        </div>
      </section>

      {/* Equipe na mesa (6 posições incluindo Studio) */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">Quem está na mesa agora</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {state.assignments.map((asg) => {
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
        {/* Roteiro completo recebido da Programação + Música */}
        <section className="lg:col-span-8">
          <h2 className="mb-3 text-base font-semibold text-white">
            Roteiro do culto ({sortedItems.length} momentos)
          </h2>
          <div className="divide-y divide-white/8 rounded-xl border border-white/10 bg-[#12141A]">
            {sortedItems.map((item) => {
              const isCurrent = item.liveStatus === 'CURRENT';
              const isDone = item.liveStatus === 'DONE';
              const itemMedia = state.mediaAssets.filter(
                (m) => m.displayTrigger === 'RUN_ITEM' && m.runItemId === item.id,
              );
              const linkedSong = item.songCode
                ? state.songs.find((s) => s.songCode === item.songCode)
                : undefined;

              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between ${
                    isCurrent ? 'bg-[#0095FF]/10' : isDone ? 'opacity-60' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono-tech font-medium text-zinc-300">
                        {item.plannedTime}
                      </span>
                      {item.durationMinutes > 0 && (
                        <span className="font-mono-tech text-zinc-500">
                          ({item.durationMinutes}min)
                        </span>
                      )}
                      {isCurrent && (
                        <span className="font-semibold text-[#0095FF]">No ar agora</span>
                      )}
                    </div>

                    <h3 className="text-base font-medium text-white">{item.title}</h3>

                    {/* Ações diretas das duas versões Holyrics quando for música */}
                    {linkedSong && (
                      <div className="pt-1">
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
                              className="inline-flex min-h-[38px] items-center rounded-lg border border-white/12 bg-[#0B0C0F] px-2 text-xs text-zinc-300 hover:bg-white/5"
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
                              className="inline-flex min-h-[38px] items-center rounded-lg border border-white/12 bg-[#0B0C0F] px-2 text-xs text-zinc-300 hover:bg-white/5"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-[#F5C41E]">
                            Aguardando Ministério de Música enviar a letra ({linkedSong.songCode})
                          </p>
                        )}
                      </div>
                    )}

                    {itemMedia.map((m) => (
                      <div
                        key={m.id}
                        className="mt-1.5 rounded-lg border border-white/10 bg-[#0B0C0F] px-3 py-2 text-xs"
                      >
                        <span className="font-medium text-white">{m.normalizedFilename}</span>
                        <span className="ml-2 text-zinc-400">({m.targetScreen})</span>
                        {m.note && <p className="mt-0.5 text-zinc-300">Nota: {m.note}</p>}
                      </div>
                    ))}
                  </div>

                  {canOperateDesk && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => onUpdateLiveItem(item.id, 'CURRENT')}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#0095FF] px-3 text-xs font-semibold text-white hover:bg-[#0082E0]"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>No ar</span>
                        </button>
                      )}
                      {!isDone && (
                        <button
                          type="button"
                          onClick={() => onUpdateLiveItem(item.id, 'DONE')}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/12 px-3 text-xs font-medium text-zinc-200 hover:bg-white/5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Concluir</span>
                        </button>
                      )}
                      {item.liveStatus === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => onUpdateLiveItem(item.id, 'SKIPPED')}
                          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-white/12 px-3 text-xs text-zinc-400 hover:bg-white/5"
                        >
                          <SkipForward className="h-3.5 w-3.5" />
                          <span>Pular</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Lateral direita */}
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
              <div className="mt-3 space-y-2.5">
                {onDemandMedia.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-lg border border-white/10 bg-[#0B0C0F] p-3 text-xs"
                  >
                    <div className="font-semibold text-[#F5C41E]">
                      {describeMediaTrigger(m, state)}
                    </div>
                    <div className="mt-1 font-medium text-white">{m.normalizedFilename}</div>
                    {m.note && <p className="mt-1 text-zinc-300">Nota: {m.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#12141A] p-4">
            <h2 className="text-base font-semibold text-white">Baixar pacote do Holyrics</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Pasta compactada (.zip) já com <span className="font-mono-tech">01 - 1 linha</span> (Retorno/Studio), <span className="font-mono-tech">02 - 2 linhas</span> (Principal), roteiro e mídias.
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
    </div>
  );
}
