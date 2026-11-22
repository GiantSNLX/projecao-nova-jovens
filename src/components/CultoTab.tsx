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
import { generateAndDownloadHolyricsZip, sanitizeSlug } from '../utils/holyrics';

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
  const sortedSongs = state.songs.slice().sort((a, b) => a.orderIndex - b.orderIndex);

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
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Controle do Culto
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Acompanhe o roteiro em tempo real na mesa e baixe o pacote completo para o Holyrics.
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

      {/* Equipe na mesa agora */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">Quem está na mesa</h2>
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

      {/* Roteiro ao vivo + Recado da mesa */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-8">
          <h2 className="mb-3 text-base font-semibold text-white">Momentos do culto</h2>
          <div className="divide-y divide-white/8 rounded-xl border border-white/10 bg-[#12141A]">
            {sortedItems.map((item) => {
              const isCurrent = item.liveStatus === 'CURRENT';
              const isDone = item.liveStatus === 'DONE';

              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
                    isCurrent ? 'bg-[#0095FF]/10' : isDone ? 'opacity-65' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono-tech text-zinc-400">
                        {String(item.orderIndex).padStart(2, '0')} · {item.plannedTime} ({item.durationMinutes}m)
                      </span>
                      <span className="text-zinc-400">· {item.responsibleName}</span>
                      {isCurrent && (
                        <span className="font-semibold text-[#0095FF]">No ar agora</span>
                      )}
                    </div>
                    <h3 className="mt-1 text-base font-medium text-white">{item.title}</h3>
                    <p className="text-sm text-zinc-400">{item.description}</p>
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

        <section className="space-y-6 lg:col-span-4">
          {/* Recado rápido */}
          <div className="rounded-xl border border-white/10 bg-[#12141A] p-4">
            <h2 className="text-base font-semibold text-white">Aviso da mesa</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Recado visível para todos os operadores.
            </p>
            <textarea
              rows={4}
              value={notesDraft}
              disabled={!canOperateDesk}
              onChange={(e) => setNotesDraft(e.target.value)}
              className="mt-3 w-full rounded-lg border border-white/12 bg-[#0B0C0F] p-3 text-base text-white focus:border-[#0095FF] focus:outline-none disabled:opacity-60"
            />
            {canOperateDesk && (
              <button
                type="button"
                onClick={() => onUpdateLiveNotes(notesDraft)}
                className="mt-3 min-h-[44px] w-full rounded-lg border border-white/12 text-sm font-semibold text-white hover:bg-white/5"
              >
                Salvar aviso
              </button>
            )}
          </div>

          {/* Baixar pacote Holyrics (.zip) */}
          <div className="rounded-xl border border-white/10 bg-[#12141A] p-4">
            <h2 className="text-base font-semibold text-white">Exportar para o Holyrics</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Gera uma pasta compactada (.zip) com roteiro, letras em .txt ({sortedSongs.length}) e mídias separadas na ordem do culto.
            </p>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => void handleDownloadHolyricsZip()}
              className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#0095FF] px-4 text-sm font-semibold text-white hover:bg-[#0082E0] disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isExporting ? 'Gerando .ZIP...' : 'Baixar Culto (.ZIP) Holyrics'}</span>
            </button>

            {exportedFilename && (
              <p className="mt-3 text-xs text-emerald-400">
                Pacote baixado: {exportedFilename}
              </p>
            )}

            <pre className="font-mono-tech mt-4 overflow-x-auto rounded-lg border border-white/8 bg-[#0B0C0F] p-3 text-xs text-zinc-400">
{`00_Roteiro_e_Importacao/
01_Letras_Musicas_TXT/ (${sortedSongs.length} .txt)
02_Midias_do_Culto/
${sortedItems
  .filter((r) => r.requiresMedia || state.mediaAssets.some((m) => m.runItemId === r.id))
  .map((r) => `  ${String(r.orderIndex).padStart(2, '0')}_${sanitizeSlug(r.title).slice(0, 22)}/`)
  .join('\n')}`}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
