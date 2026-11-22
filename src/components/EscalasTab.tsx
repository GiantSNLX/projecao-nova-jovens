import { useMemo, useState } from 'react';
import {
  CalendarPlus,
  CheckCircle2,
  Clock,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type {
  AttendanceStatus,
  DeskPosition,
  MemberUser,
  ProgrammingTeam,
  ServiceState,
} from '../types/portal';
import { DESK_POSITION_INFO, TEAM_LABELS } from '../data/initialState';

interface EscalasTabProps {
  state: ServiceState;
  members: MemberUser[];
  activeUser: MemberUser;
  isLeader: boolean;
  onUpdateAttendance: (scheduleDate: string, assignmentId: string, status: AttendanceStatus) => void;
  onToggleServingOnDesk: (scheduleDate: string, assignmentId: string) => void;
  onChangeAssignmentMember: (scheduleDate: string, assignmentId: string, userId: string) => void;
  onChangeScheduleTeam: (scheduleDate: string, team: ProgrammingTeam) => void;
  onAddNextSaturday: () => void;
}

type EscalaSubTab = 'ver' | 'montar';

const ALL_POSITIONS: DeskPosition[] = ['CAPITAO', 'PRINCIPAL', 'RETORNO', 'CORTE', 'APOIO'];

function formatDateBr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

export function EscalasTab({
  state,
  members,
  activeUser,
  isLeader,
  onUpdateAttendance,
  onToggleServingOnDesk,
  onChangeAssignmentMember,
  onChangeScheduleTeam,
  onAddNextSaturday,
}: EscalasTabProps) {
  const [subTab, setSubTab] = useState<EscalaSubTab>('ver');

  const upcomingSchedules = useMemo(
    () => state.schedules.filter((s) => !s.isPast).sort((a, b) => a.date.localeCompare(b.date)),
    [state.schedules],
  );

  const [selectedDate, setSelectedDate] = useState<string>(
    upcomingSchedules[0]?.date ?? state.serviceDate,
  );

  const activeSchedule =
    upcomingSchedules.find((s) => s.date === selectedDate) ?? upcomingSchedules[0];

  // Compute how many times each projection member has served in each position (past + current check-ins)
  const historyStats = useMemo(() => {
    const deskMembers = members.filter(
      (m) => m.roles.includes('MEMBER') && (m.ministry.includes('Projeção') || m.roles.includes('CAPTAIN')),
    );

    return deskMembers.map((member) => {
      const counts: Record<DeskPosition, number> = {
        CAPITAO: 0,
        PRINCIPAL: 0,
        RETORNO: 0,
        CORTE: 0,
        APOIO: 0,
      };
      let lastServedDate = '';
      let lastServedPos: DeskPosition | null = null;

      for (const sched of state.schedules) {
        // Count past schedules OR current schedule where member checked in on desk
        const shouldCount = sched.isPast === true;
        for (const asg of sched.assignments) {
          if (asg.userId === member.id && (shouldCount || asg.servingOnDesk)) {
            counts[asg.position] += 1;
            if (!lastServedDate || sched.date > lastServedDate) {
              lastServedDate = sched.date;
              lastServedPos = asg.position;
            }
          }
        }
      }

      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return {
        member,
        counts,
        total,
        lastServedDate,
        lastServedPos,
      };
    });
  }, [members, state.schedules]);

  const activeSubTab: EscalaSubTab = isLeader ? subTab : 'ver';

  return (
    <div className="space-y-6">
      {/* Header + Sub-tabs */}
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Escalas</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {activeSubTab === 'ver'
              ? 'Veja os próximos sábados e confirme somente a sua escala.'
              : 'Monte as escalas dos próximos sábados e acompanhe quem já serviu em cada posição.'}
          </p>
        </div>

        {isLeader && (
          <div className="inline-flex rounded-lg border border-white/12 bg-[#12141A] p-1">
            <button
              type="button"
              onClick={() => setSubTab('ver')}
              className={`min-h-[40px] rounded-md px-3.5 text-sm font-medium transition-colors ${
                activeSubTab === 'ver'
                  ? 'bg-[#0095FF] text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Escala da semana
            </button>
            <button
              type="button"
              onClick={() => setSubTab('montar')}
              className={`min-h-[40px] rounded-md px-3.5 text-sm font-medium transition-colors ${
                activeSubTab === 'montar'
                  ? 'bg-[#0095FF] text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Montar escala
            </button>
          </div>
        )}
      </div>

      {/* Seletor dos próximos sábados */}
      <div className="flex flex-wrap items-center gap-2">
        {upcomingSchedules.map((sched, idx) => {
          const isSelected = activeSchedule?.date === sched.date;
          return (
            <button
              key={sched.date}
              type="button"
              onClick={() => setSelectedDate(sched.date)}
              className={`min-h-[44px] rounded-lg border px-3.5 text-sm font-medium transition-colors ${
                isSelected
                  ? 'border-[#0095FF] bg-[#0095FF]/15 text-white'
                  : 'border-white/10 bg-[#12141A] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>{formatDateBr(sched.date)}</span>
              {idx === 0 && (
                <span className="ml-1.5 text-xs text-[#38BDF8]">(Este sábado)</span>
              )}
            </button>
          );
        })}

        {activeSubTab === 'montar' && isLeader && (
          <button
            type="button"
            onClick={onAddNextSaturday}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-dashed border-white/20 px-3.5 text-sm font-medium text-zinc-300 hover:border-[#0095FF] hover:text-white"
          >
            <CalendarPlus className="h-4 w-4 text-[#0095FF]" />
            <span>Adicionar sábado</span>
          </button>
        )}
      </div>

      {/* SUB-ABA 1: VISUALIZAÇÃO LIMPA DA ESCALA */}
      {activeSubTab === 'ver' && activeSchedule && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>
              Programação:{' '}
              <strong className="text-white">
                {TEAM_LABELS[activeSchedule.programmingTeam].name}
              </strong>
            </span>
            <span>{formatDateBr(activeSchedule.date)} · 19h00</span>
          </div>

          <div className="divide-y divide-white/8 rounded-xl border border-white/10 bg-[#12141A]">
            {activeSchedule.assignments.map((assignment) => {
              const pos = DESK_POSITION_INFO[assignment.position];
              const member = members.find((m) => m.id === assignment.userId);
              const isMe = assignment.userId === activeUser.id;
              const isCurrentSaturday = activeSchedule.date === state.serviceDate;

              return (
                <div
                  key={assignment.id}
                  className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
                    isMe ? 'bg-[#0095FF]/8' : ''
                  }`}
                >
                  <div className="flex min-w-0 items-center justify-between gap-4 sm:justify-start">
                    <div className="w-24 shrink-0 text-sm font-semibold text-zinc-400">
                      {pos.label}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-base font-medium text-white">
                          {member?.name ?? 'A definir'}
                        </span>
                        {isMe && (
                          <span className="rounded bg-[#0095FF]/20 px-1.5 py-0.5 text-[11px] font-semibold text-[#38BDF8]">
                            Você
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status para todos; botões SOMENTE na linha da própria pessoa */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {!isMe ? (
                      assignment.servingOnDesk ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                          <UserCheck className="h-4 w-4" />
                          <span>Servindo na mesa</span>
                        </span>
                      ) : assignment.attendanceStatus === 'CONFIRMED' ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-zinc-300">
                          <CheckCircle2 className="h-4 w-4 text-[#0095FF]" />
                          <span>Confirmado</span>
                        </span>
                      ) : assignment.attendanceStatus === 'DECLINED' ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-red-400">
                          <XCircle className="h-4 w-4" />
                          <span>Não vai</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm text-zinc-500">
                          <Clock className="h-4 w-4" />
                          <span>Pendente</span>
                        </span>
                      )
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="grid grid-cols-2 gap-2 sm:flex">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateAttendance(activeSchedule.date, assignment.id, 'CONFIRMED')
                            }
                            className={`min-h-[44px] rounded-lg border px-3.5 text-sm font-medium transition-colors ${
                              assignment.attendanceStatus === 'CONFIRMED'
                                ? 'border-[#0095FF] bg-[#0095FF]/15 text-white'
                                : 'border-white/12 text-zinc-300 hover:bg-white/5'
                            }`}
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateAttendance(activeSchedule.date, assignment.id, 'DECLINED')
                            }
                            className={`min-h-[44px] rounded-lg border px-3.5 text-sm font-medium transition-colors ${
                              assignment.attendanceStatus === 'DECLINED'
                                ? 'border-red-500/60 bg-red-500/15 text-red-300'
                                : 'border-white/12 text-zinc-300 hover:bg-white/5'
                            }`}
                          >
                            Não vou
                          </button>
                        </div>

                        {isCurrentSaturday && (
                          <button
                            type="button"
                            onClick={() =>
                              onToggleServingOnDesk(activeSchedule.date, assignment.id)
                            }
                            className={`min-h-[44px] rounded-lg px-4 text-sm font-semibold transition-colors ${
                              assignment.servingOnDesk
                                ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                : 'bg-[#0095FF] text-white hover:bg-[#0082E0]'
                            }`}
                          >
                            {assignment.servingOnDesk
                              ? 'Servindo na mesa'
                              : 'Já estou servindo na mesa'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-ABA 2: MONTAR ESCALA + CONTROLE DE QUEM JÁ SERVIU (SOMENTE LIDERANÇA) */}
      {activeSubTab === 'montar' && isLeader && activeSchedule && (
        <div className="space-y-8">
          <section className="rounded-xl border border-white/10 bg-[#12141A] p-5">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Montar escala — {formatDateBr(activeSchedule.date)}
                </h2>
                <p className="text-sm text-zinc-400">
                  Defina a equipe de Programação e quem assume cada posição na mesa.
                </p>
              </div>

              <div className="flex gap-1.5">
                {(['ALPHA', 'BRAVO', 'CHARLIE'] as ProgrammingTeam[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onChangeScheduleTeam(activeSchedule.date, t)}
                    className={`min-h-[40px] rounded-lg border px-3 text-xs font-semibold ${
                      activeSchedule.programmingTeam === t
                        ? 'border-[#0095FF] bg-[#0095FF] text-white'
                        : 'border-white/12 text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    {TEAM_LABELS[t].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 divide-y divide-white/8">
              {activeSchedule.assignments.map((asg) => {
                const pos = DESK_POSITION_INFO[asg.position];
                return (
                  <div
                    key={asg.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{pos.label}</div>
                      <div className="text-xs text-zinc-500">{pos.responsibility}</div>
                    </div>

                    <select
                      aria-label={`Selecionar membro para ${pos.label}`}
                      value={asg.userId}
                      onChange={(e) =>
                        onChangeAssignmentMember(activeSchedule.date, asg.id, e.target.value)
                      }
                      className="min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white focus:border-[#0095FF] focus:outline-none sm:w-72"
                    >
                      {members.map((m) => {
                        const stat = historyStats.find((h) => h.member.id === m.id);
                        const countInPos = stat ? stat.counts[asg.position] : 0;
                        return (
                          <option key={m.id} value={m.id}>
                            {m.name} ({countInPos}x em {pos.short})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Controle de quem já serviu em cada posição */}
          <section className="rounded-xl border border-white/10 bg-[#12141A] p-5">
            <h2 className="text-base font-semibold text-white">
              Controle de rodízio — Quem já serviu em cada posição
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Quantidade de cultos servidos por posição nos sábados registrados.
            </p>

            {/* Desktop table */}
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-zinc-400">
                    <th className="py-2.5 pr-4 font-medium">Membro</th>
                    {ALL_POSITIONS.map((pos) => (
                      <th key={pos} className="px-3 py-2.5 text-center font-medium">
                        {DESK_POSITION_INFO[pos].short}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center font-medium">Total</th>
                    <th className="py-2.5 pl-4 text-right font-medium">Última vez</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {historyStats.map((row) => (
                    <tr key={row.member.id}>
                      <td className="py-3 pr-4 font-medium text-white">{row.member.name}</td>
                      {ALL_POSITIONS.map((pos) => (
                        <td
                          key={pos}
                          className={`font-mono-tech px-3 py-3 text-center ${
                            row.counts[pos] === 0 ? 'text-zinc-600' : 'text-zinc-200'
                          }`}
                        >
                          {row.counts[pos]}x
                        </td>
                      ))}
                      <td className="font-mono-tech px-3 py-3 text-center font-semibold text-[#38BDF8]">
                        {row.total}
                      </td>
                      <td className="py-3 pl-4 text-right text-xs text-zinc-400">
                        {row.lastServedDate
                          ? `${formatDateBr(row.lastServedDate)} (${
                              row.lastServedPos
                                ? DESK_POSITION_INFO[row.lastServedPos].short
                                : ''
                            })`
                          : 'Ainda não serviu'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked cards (zero overflow) */}
            <div className="mt-4 space-y-2.5 md:hidden">
              {historyStats.map((row) => (
                <div
                  key={row.member.id}
                  className="rounded-lg border border-white/10 bg-[#0B0C0F] p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{row.member.name}</span>
                    <span className="font-mono-tech text-xs text-[#38BDF8]">
                      Total: {row.total}
                    </span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-5 gap-1.5 text-center text-xs">
                    {ALL_POSITIONS.map((pos) => (
                      <div
                        key={pos}
                        className="rounded border border-white/8 bg-[#12141A] py-1.5"
                      >
                        <div className="text-[10px] text-zinc-500">
                          {DESK_POSITION_INFO[pos].short.slice(0, 4)}
                        </div>
                        <div className="font-mono-tech mt-0.5 font-semibold text-zinc-200">
                          {row.counts[pos]}
                        </div>
                      </div>
                    ))}
                  </div>
                  {row.lastServedDate && (
                    <p className="mt-2 text-xs text-zinc-500">
                      Última: {formatDateBr(row.lastServedDate)} (
                      {row.lastServedPos ? DESK_POSITION_INFO[row.lastServedPos].short : ''})
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
