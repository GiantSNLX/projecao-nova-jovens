import {
  CheckCircle2,
  Clock,
  Monitor,
  Radio,
  ShieldAlert,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import type {
  AttendanceStatus,
  DeskPosition,
  MemberUser,
  ProgrammingTeam,
  Role,
  ServiceState,
  TabId,
} from '../types/portal';
import { DESK_POSITION_INFO, TEAM_LABELS } from '../data/initialState';

interface OverviewDeskTabProps {
  state: ServiceState;
  members: MemberUser[];
  activeUser: MemberUser;
  activeRole: Role;
  onUpdateAttendance: (assignmentId: string, status: AttendanceStatus) => void;
  onToggleServingOnDesk: (assignmentId: string) => void;
  onChangeAssignmentMember: (assignmentId: string, userId: string) => void;
  onChangeProgrammingTeam: (team: ProgrammingTeam) => void;
  onNavigateTab: (tab: TabId) => void;
}

export function OverviewDeskTab({
  state,
  members,
  activeUser,
  activeRole,
  onUpdateAttendance,
  onToggleServingOnDesk,
  onChangeAssignmentMember,
  onChangeProgrammingTeam,
  onNavigateTab,
}: OverviewDeskTabProps) {
  const canManageSchedule = activeRole === 'ADMIN' || activeRole === 'CAPTAIN';
  const team = TEAM_LABELS[state.programmingTeam];

  const confirmedCount = state.assignments.filter((a) => a.attendanceStatus === 'CONFIRMED').length;
  const servingCount = state.assignments.filter((a) => a.servingOnDesk).length;
  const approvedSongsCount = state.songs.filter((s) => s.approved).length;
  const validMediaCount = state.mediaAssets.filter((m) => m.validationStatus !== 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Operational Hero Banner — Brand-aligned, crisp, mobile-first */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-[#12151C]">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-12 lg:items-center">
          <div className="space-y-4 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0095FF]/35 bg-[#0095FF]/10 px-3 py-1 text-xs font-semibold text-[#0095FF]">
                <Radio className="h-3.5 w-3.5" />
                <span>{state.title} · {state.serviceDate} às {state.startsAtTime}</span>
              </span>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${team.badgeClass}`}>
                {team.name} · {team.phonetic}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-4xl dark:text-white">
              Operação da semana pronta para o Holyrics.
            </h1>

            <p className="max-w-2xl text-base text-zinc-600 dark:text-zinc-300">
              Confira a escala das cinco posições da mesa, confirme sua presença e valide músicas, roteiro e mídias nos três telões 16:9 antes do culto.
            </p>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => onNavigateTab('aovivo')}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#0095FF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0080DC]"
              >
                <Radio className="h-4 w-4" />
                <span>Abrir Controle do Culto</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('programacao')}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-zinc-50 px-5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:bg-[#191D26] dark:text-white dark:hover:bg-[#222733]"
              >
                <Monitor className="h-4 w-4 text-[#0095FF]" />
                <span>Simular Mídias (3 Telas)</span>
              </button>
            </div>
          </div>

          {/* Right Brand Stage Card */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-zinc-800 bg-[#08090C] p-4 text-white">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src="./brand/projecao-logo.jpg"
                    alt="Projeção Nova Jovens 2"
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <div>
                    <div className="text-sm font-semibold text-white">Projeção Nova Jovens 2</div>
                    <div className="font-mono-tech text-xs text-zinc-400">
                      Cutoff: {state.cutoffLabel}
                    </div>
                  </div>
                </div>
                <img
                  src="./brand/nova-jovens-logo.png"
                  alt="Nova Jovens 2"
                  className="h-8 w-auto object-contain"
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-[#11141B] p-2.5">
                  <span className="block text-xs text-zinc-400">Confirmados</span>
                  <span className="font-mono-tech mt-0.5 block text-lg font-semibold text-white">
                    {confirmedCount}/{state.assignments.length}
                  </span>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#11141B] p-2.5">
                  <span className="block text-xs text-zinc-400">Na Mesa Agora</span>
                  <span className="font-mono-tech mt-0.5 block text-lg font-semibold text-emerald-400">
                    {servingCount}/{state.assignments.length}
                  </span>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#11141B] p-2.5">
                  <span className="block text-xs text-zinc-400">Músicas Aprovadas</span>
                  <span className="font-mono-tech mt-0.5 block text-lg font-semibold text-[#38BDF8]">
                    {approvedSongsCount}/{state.songs.length}
                  </span>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#11141B] p-2.5">
                  <span className="block text-xs text-zinc-400">Mídias Validadas</span>
                  <span className="font-mono-tech mt-0.5 block text-lg font-semibold text-[#F5C41E]">
                    {validMediaCount} arq.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Programming Team Selector (Alpha / Bravo / Charlie) */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-[#12151C]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
              Ministério de Programação da Semana
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Padrão fonético militar (OTAN): A = Alpha, B = Bravo, C = Charlie.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:w-auto">
            {(['ALPHA', 'BRAVO', 'CHARLIE'] as ProgrammingTeam[]).map((t) => {
              const info = TEAM_LABELS[t];
              const isSelected = state.programmingTeam === t;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!canManageSchedule}
                  onClick={() => onChangeProgrammingTeam(t)}
                  className={`min-h-[44px] rounded-xl border px-3 text-sm font-semibold transition-colors disabled:cursor-default ${
                    isSelected
                      ? 'border-[#0095FF] bg-[#0095FF] text-white'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:bg-[#191D26] dark:text-zinc-300 dark:hover:bg-white/10'
                  }`}
                >
                  {info.code} · {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Escala da Mesa (5 posições oficiais) */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-[#12151C]">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#0095FF]" />
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
                Escala da Mesa — Posições Oficiais
              </h2>
            </div>
            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
              Confirme sua presença e marque "Já estou servindo na mesa" ao assumir seu posto.
            </p>
          </div>
          {state.isFrozen && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#F5C41E]/40 bg-[#F5C41E]/10 px-3 py-1.5 text-xs font-semibold text-[#F5C41E]">
              <ShieldAlert className="h-4 w-4" />
              <span>Prazo de alterações travado (Cutoff)</span>
            </span>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {state.assignments.map((assignment) => {
            const posInfo = DESK_POSITION_INFO[assignment.position as DeskPosition];
            const member = members.find((m) => m.id === assignment.userId);
            const isCurrentUser = assignment.userId === activeUser.id;
            const canActOnThisRow = isCurrentUser || canManageSchedule;

            return (
              <article
                key={assignment.id}
                className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                  assignment.servingOnDesk
                    ? 'border-emerald-500/45 bg-emerald-500/5'
                    : isCurrentUser
                      ? 'border-[#0095FF]/50 bg-[#0095FF]/5'
                      : 'border-zinc-200 bg-zinc-50/70 dark:border-white/10 dark:bg-[#171B24]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-white/10">
                        {posInfo.label}
                      </span>
                      {isCurrentUser && (
                        <span className="ml-2 text-xs font-semibold text-[#0095FF]">
                          (Você)
                        </span>
                      )}
                    </div>

                    {assignment.servingOnDesk ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Servindo {assignment.deskCheckinAt ?? ''}</span>
                      </span>
                    ) : assignment.attendanceStatus === 'CONFIRMED' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#0095FF]/15 px-2.5 py-1 text-xs font-semibold text-[#38BDF8]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Confirmado</span>
                      </span>
                    ) : assignment.attendanceStatus === 'DECLINED' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Ausente</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/15 px-2.5 py-1 text-xs font-medium text-zinc-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Pendente</span>
                      </span>
                    )}
                  </div>

                  {/* Member selector for Captain/Admin, static name for others */}
                  <div className="mt-3">
                    {canManageSchedule ? (
                      <select
                        aria-label={`Escalado para ${posInfo.label}`}
                        value={assignment.userId}
                        onChange={(e) => onChangeAssignmentMember(assignment.id, e.target.value)}
                        className="min-h-[44px] w-full rounded-lg border border-zinc-300 bg-white px-3 text-base font-semibold text-zinc-900 dark:border-white/15 dark:bg-[#0E1117] dark:text-white"
                      >
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-base font-semibold text-zinc-950 dark:text-white">
                        {member?.name ?? 'A definir'}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {posInfo.responsibility}
                    </p>
                  </div>
                </div>

                {/* Action buttons — minimum 44px touch targets */}
                <div className="mt-4 flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-white/10">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!canActOnThisRow}
                      onClick={() => onUpdateAttendance(assignment.id, 'CONFIRMED')}
                      className={`min-h-[44px] rounded-lg border px-2 text-xs font-semibold transition-colors disabled:opacity-45 ${
                        assignment.attendanceStatus === 'CONFIRMED'
                          ? 'border-[#0095FF] bg-[#0095FF]/15 text-[#0095FF]'
                          : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10'
                      }`}
                    >
                      Confirmar Presença
                    </button>
                    <button
                      type="button"
                      disabled={!canActOnThisRow}
                      onClick={() => onUpdateAttendance(assignment.id, 'DECLINED')}
                      className={`min-h-[44px] rounded-lg border px-2 text-xs font-semibold transition-colors disabled:opacity-45 ${
                        assignment.attendanceStatus === 'DECLINED'
                          ? 'border-red-500 bg-red-500/15 text-red-400'
                          : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10'
                      }`}
                    >
                      Não Posso Ir
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!canActOnThisRow}
                    onClick={() => onToggleServingOnDesk(assignment.id)}
                    className={`min-h-[44px] w-full rounded-lg px-3 text-sm font-semibold transition-colors disabled:opacity-45 ${
                      assignment.servingOnDesk
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#0095FF] dark:hover:bg-[#0080DC]'
                    }`}
                  >
                    {assignment.servingOnDesk
                      ? 'Em posição na mesa (Check-in feito)'
                      : 'Já estou servindo na mesa'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
