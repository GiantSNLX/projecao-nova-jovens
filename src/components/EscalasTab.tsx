import { CheckCircle2, Clock, UserCheck, XCircle } from 'lucide-react';
import type {
  AttendanceStatus,
  DeskPosition,
  MemberUser,
  ServiceState,
} from '../types/portal';
import { DESK_POSITION_INFO, TEAM_LABELS } from '../data/initialState';

interface EscalasTabProps {
  state: ServiceState;
  members: MemberUser[];
  activeUser: MemberUser;
  isLeader: boolean;
  onUpdateAttendance: (assignmentId: string, status: AttendanceStatus) => void;
  onToggleServingOnDesk: (assignmentId: string) => void;
  onChangeAssignmentMember: (assignmentId: string, userId: string) => void;
}

export function EscalasTab({
  state,
  members,
  activeUser,
  isLeader,
  onUpdateAttendance,
  onToggleServingOnDesk,
  onChangeAssignmentMember,
}: EscalasTabProps) {
  const team = TEAM_LABELS[state.programmingTeam];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Escala da semana
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {state.title} · {state.serviceDate} às {state.startsAtTime} · Programação {team.name}
          </p>
        </div>
        <span className="font-mono-tech text-xs text-zinc-400">
          5 posições na mesa
        </span>
      </div>

      {/* Clean matte list — stacks seamlessly on mobile and expands cleanly on desktop */}
      <div className="divide-y divide-white/8 rounded-xl border border-white/10 bg-[#12141A]">
        {state.assignments.map((assignment) => {
          const pos = DESK_POSITION_INFO[assignment.position as DeskPosition];
          const member = members.find((m) => m.id === assignment.userId);
          const isMe = assignment.userId === activeUser.id;
          const canAct = isMe || isLeader;

          return (
            <div
              key={assignment.id}
              className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-base font-semibold text-white">{pos.label}</span>
                  {isMe && (
                    <span className="text-xs font-medium text-[#0095FF]">Você</span>
                  )}

                  {assignment.servingOnDesk ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Servindo na mesa ({assignment.deskCheckinAt})</span>
                    </span>
                  ) : assignment.attendanceStatus === 'CONFIRMED' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#0095FF]" />
                      <span>Presença confirmada</span>
                    </span>
                  ) : assignment.attendanceStatus === 'DECLINED' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Não poderá ir</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Aguardando confirmação</span>
                    </span>
                  )}
                </div>

                {isLeader ? (
                  <div className="pt-1">
                    <label className="sr-only" htmlFor={`assign-${assignment.id}`}>
                      Membro na posição {pos.label}
                    </label>
                    <select
                      id={`assign-${assignment.id}`}
                      value={assignment.userId}
                      onChange={(e) => onChangeAssignmentMember(assignment.id, e.target.value)}
                      className="min-h-[44px] w-full max-w-xs rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-sm font-medium text-white focus:border-[#0095FF] focus:outline-none"
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-zinc-200">
                    {member?.name ?? 'A definir'}
                  </p>
                )}

                <p className="text-sm text-zinc-500">{pos.responsibility}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:shrink-0">
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <button
                    type="button"
                    disabled={!canAct}
                    onClick={() => onUpdateAttendance(assignment.id, 'CONFIRMED')}
                    className={`min-h-[44px] rounded-lg border px-3.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                      assignment.attendanceStatus === 'CONFIRMED'
                        ? 'border-[#0095FF] bg-[#0095FF]/12 text-[#38BDF8]'
                        : 'border-white/12 text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    disabled={!canAct}
                    onClick={() => onUpdateAttendance(assignment.id, 'DECLINED')}
                    className={`min-h-[44px] rounded-lg border px-3.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                      assignment.attendanceStatus === 'DECLINED'
                        ? 'border-red-500/60 bg-red-500/12 text-red-300'
                        : 'border-white/12 text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    Não vou
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!canAct}
                  onClick={() => onToggleServingOnDesk(assignment.id)}
                  className={`min-h-[44px] rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-40 ${
                    assignment.servingOnDesk
                      ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20'
                      : 'bg-[#0095FF] text-white hover:bg-[#0082E0]'
                  }`}
                >
                  {assignment.servingOnDesk ? 'Servindo na mesa' : 'Já estou servindo na mesa'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
