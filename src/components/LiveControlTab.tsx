import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FastForward,
  MessageSquare,
  Play,
  Radio,
  SkipForward,
  UserCheck,
} from 'lucide-react';
import type { LiveItemStatus, MemberUser, Role, ServiceState } from '../types/portal';
import { DESK_POSITION_INFO } from '../data/initialState';

interface LiveControlTabProps {
  state: ServiceState;
  members: MemberUser[];
  activeRole: Role;
  onUpdateLiveItem: (itemId: string, status: LiveItemStatus) => void;
  onToggleServiceLive: () => void;
  onUpdateLiveNotes: (notes: string) => void;
}

export function LiveControlTab({
  state,
  members,
  activeRole,
  onUpdateLiveItem,
  onToggleServiceLive,
  onUpdateLiveNotes,
}: LiveControlTabProps) {
  const canOperateLive =
    activeRole === 'ADMIN' || activeRole === 'CAPTAIN' || activeRole === 'MEMBER';

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notesDraft, setNotesDraft] = useState(state.liveNotes);

  useEffect(() => {
    setNotesDraft(state.liveNotes);
  }, [state.liveNotes]);

  useEffect(() => {
    if (state.status !== 'LIVE') return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state.status]);

  const sortedItems = state.runItems.slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const currentItem = sortedItems.find((i) => i.liveStatus === 'CURRENT');
  const completedCount = sortedItems.filter((i) => i.liveStatus === 'DONE').length;

  const hours = Math.floor(elapsedSeconds / 3600);
  const mins = Math.floor((elapsedSeconds % 3600) / 60);
  const secs = elapsedSeconds % 60;
  const formattedClock = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      {/* Live Status & Timer Header */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-[#12151C]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${
                  state.status === 'LIVE' ? 'bg-red-500' : 'bg-[#0095FF]'
                }`}
              />
              <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
                Controle do Culto Ao Vivo
              </h2>
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Painel sincronizado entre Capitão, Principal, Retorno, Corte e Apoio durante o culto.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-white/10 dark:bg-[#181C25]">
              <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Cronômetro do Culto
              </span>
              <span className="font-mono-tech text-xl font-bold text-zinc-950 dark:text-white">
                {formattedClock}
              </span>
            </div>

            <button
              type="button"
              disabled={!canOperateLive}
              onClick={onToggleServiceLive}
              className={`inline-flex min-h-[48px] items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-colors disabled:opacity-45 ${
                state.status === 'LIVE'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-[#0095FF] hover:bg-[#0080DC]'
              }`}
            >
              <Radio className="h-4 w-4" />
              <span>{state.status === 'LIVE' ? 'Encerrar Modo Ao Vivo' : 'Iniciar Culto Ao Vivo'}</span>
            </button>
          </div>
        </div>

        {/* Desk readiness pills */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {state.assignments.map((asg) => {
            const member = members.find((m) => m.id === asg.userId);
            const pos = DESK_POSITION_INFO[asg.position];
            return (
              <div
                key={asg.id}
                className={`rounded-xl border p-2.5 ${
                  asg.servingOnDesk
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-[#171B24]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                    {pos.short}
                  </span>
                  {asg.servingOnDesk ? (
                    <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-300">
                  {member?.name ?? '—'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Current Block Highlight + Captain Live Notes */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 lg:col-span-8 dark:border-white/10 dark:bg-[#12151C]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
              Sequência do Roteiro ({completedCount}/{sortedItems.length} concluídos)
            </h3>
            {currentItem && (
              <span className="rounded-full bg-[#0095FF]/15 px-3 py-1 text-xs font-semibold text-[#38BDF8]">
                No ar: #{currentItem.orderIndex} {currentItem.title}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {sortedItems.map((item) => {
              const isCurrent = item.liveStatus === 'CURRENT';
              const isDone = item.liveStatus === 'DONE';
              const isSkipped = item.liveStatus === 'SKIPPED';

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    isCurrent
                      ? 'border-[#0095FF] bg-[#0095FF]/10'
                      : isDone
                        ? 'border-emerald-500/30 bg-emerald-500/5 opacity-80'
                        : 'border-zinc-200 bg-zinc-50/70 dark:border-white/10 dark:bg-[#171B24]'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono-tech rounded bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-white dark:bg-white/10">
                          {String(item.orderIndex).padStart(2, '0')} · {item.plannedTime}
                        </span>
                        <span className="font-mono-tech text-xs text-zinc-500 dark:text-zinc-400">
                          {item.durationMinutes} min
                        </span>
                        <span className="text-xs font-medium text-[#0095FF]">
                          {item.responsibleName}
                        </span>
                        {isSkipped && (
                          <span className="rounded bg-zinc-500/20 px-2 py-0.5 text-xs text-zinc-400">
                            Pulado
                          </span>
                        )}
                      </div>
                      <h4 className="mt-1.5 text-base font-semibold text-zinc-950 dark:text-white">
                        {item.title}
                      </h4>
                      <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                        {item.description}
                      </p>
                      {item.captainNotes && (
                        <p className="mt-2 rounded-lg border border-[#F5C41E]/30 bg-[#F5C41E]/10 px-3 py-1.5 text-xs font-medium text-[#F5C41E]">
                          Aviso do Capitão: {item.captainNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!isCurrent && (
                        <button
                          type="button"
                          disabled={!canOperateLive}
                          onClick={() => onUpdateLiveItem(item.id, 'CURRENT')}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#0095FF] px-3 text-xs font-semibold text-white hover:bg-[#0080DC] disabled:opacity-45"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>Colocar no Ar</span>
                        </button>
                      )}
                      {!isDone && (
                        <button
                          type="button"
                          disabled={!canOperateLive}
                          onClick={() => onUpdateLiveItem(item.id, 'DONE')}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-45"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Concluir</span>
                        </button>
                      )}
                      {item.liveStatus === 'PENDING' && (
                        <button
                          type="button"
                          disabled={!canOperateLive}
                          onClick={() => onUpdateLiveItem(item.id, 'SKIPPED')}
                          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-zinc-300 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-45 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10"
                        >
                          <SkipForward className="h-3.5 w-3.5" />
                          <span>Pular</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Live Notes Panel */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 lg:col-span-4 dark:border-white/10 dark:bg-[#12151C]">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#F5C41E]" />
            <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
              Quadro de Comunicação da Mesa
            </h3>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Recado rápido exibido para Principal, Retorno, Corte e Apoio.
          </p>

          <label htmlFor="live-notes-textarea" className="sr-only">
            Recado da mesa ao vivo
          </label>
          <textarea
            id="live-notes-textarea"
            rows={5}
            value={notesDraft}
            disabled={!canOperateLive}
            onChange={(e) => setNotesDraft(e.target.value)}
            className="mt-3 w-full rounded-xl border border-zinc-300 bg-zinc-50 p-3 text-base text-zinc-900 focus:border-[#0095FF] focus:outline-none dark:border-white/15 dark:bg-[#181C25] dark:text-white"
            placeholder="Ex.: Preletor vai usar Salmos 23 antes da oferta..."
          />

          <button
            type="button"
            disabled={!canOperateLive}
            onClick={() => onUpdateLiveNotes(notesDraft)}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-45 dark:bg-[#0095FF] dark:hover:bg-[#0080DC]"
          >
            <FastForward className="h-4 w-4" />
            <span>Atualizar Recado na Mesa</span>
          </button>
        </section>
      </div>
    </div>
  );
}
