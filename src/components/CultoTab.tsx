import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Play,
  Radio,
  SkipForward,
  UserCheck,
} from 'lucide-react';
import type { LiveItemStatus, MemberUser, ServiceState } from '../types/portal';
import { DESK_POSITION_INFO } from '../data/initialState';
import {
  describeMediaTrigger,
  generateAndDownloadHolyricsZip,
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
      {/* Header + Live Toggle */}
      <section className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Culto</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Tudo que veio da Programação e da Música reunido para a mesa operar e baixar no Holyrics.
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

      {/* Equipe na mesa */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">Quem está na mesa agora</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
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
                  <div className="min-w-0 space-y-1">
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

                    {linkedSong && (
                      <p className="text-xs text-emerald-400">
                        {linkedSong.rawLyrics.trim()
                          ? `Letra pronta (${linkedSong.title})`
                          : `Aguardando letra em Músicas (${linkedSong.songCode})`}
                      </p>
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

        {/* Lateral direita: Mídias de Gatilho Rápido + Baixar Holyrics + Aviso */}
        <section className="space-y-6 lg:col-span-4">
          {/* Mídias sob demanda (Arranque, Esquete, Brincadeira, Quando solicitado) */}
          <div className="rounded-xl border border-white/10 bg-[#12141A] p-4">
            <h2 className="text-base font-semibold text-white">
              Mídias de gatilho rápido ({onDemandMedia.length})
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Arquivos marcados para Arranque, Esquete, Brincadeira ou Quando solicitado.
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

          {/* Baixar pacote Holyrics (.zip) */}
          <div className="rounded-xl border border-white/10 bg-[#12141A] p-4">
            <h2 className="text-base font-semibold text-white">Baixar tudo para o Holyrics</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Pasta compactada (.zip) com roteiro, notas, letras em .txt e mídias separadas por momento.
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

          {/* Aviso da mesa */}
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
