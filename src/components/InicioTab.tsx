import { ArrowRight, CheckCircle2, UserCheck } from 'lucide-react';
import type {
  AttendanceStatus,
  MemberUser,
  ServiceState,
  TabId,
} from '../types/portal';
import { DESK_POSITION_INFO, TEAM_LABELS } from '../data/initialState';

interface InicioTabProps {
  state: ServiceState;
  activeUser: MemberUser;
  onUpdateAttendance: (assignmentId: string, status: AttendanceStatus) => void;
  onToggleServingOnDesk: (assignmentId: string) => void;
  onNavigateTab: (tab: TabId) => void;
}

export function InicioTab({
  state,
  activeUser,
  onUpdateAttendance,
  onToggleServingOnDesk,
  onNavigateTab,
}: InicioTabProps) {
  const myAssignment = state.assignments.find((a) => a.userId === activeUser.id);
  const team = TEAM_LABELS[state.programmingTeam];

  const confirmedCount = state.assignments.filter((a) => a.attendanceStatus === 'CONFIRMED').length;
  const servingCount = state.assignments.filter((a) => a.servingOnDesk).length;
  const approvedSongs = state.songs.filter((s) => s.approved).length;
  const mdoDone = state.mdoEntries.filter((m) => m.userId === activeUser.id && m.completed).length;
  const verseDone = state.saturdayVerses.some(
    (v) => v.userId === activeUser.id && v.saturdayDate === state.serviceDate && v.spoken,
  );

  return (
    <div className="space-y-8">
      {/* Clean flat summary header — zero card-inside-card clutter */}
      <section className="border-b border-white/10 pb-8">
        <p className="font-mono-tech text-xs text-zinc-400">
          {state.serviceDate} · {state.startsAtTime} · Programação {team.name}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Olá, {activeUser.name.split(' ')[0]}.
        </h1>
        <p className="mt-2 max-w-2xl text-base text-zinc-400">
          {myAssignment
            ? `Você está escalado como ${DESK_POSITION_INFO[myAssignment.position].label} neste culto.`
            : 'Acompanhe o preparo do culto, suas meditações e os envios da semana.'}
        </p>

        {/* Direct action row for the logged-in member */}
        {myAssignment ? (
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={() => onToggleServingOnDesk(myAssignment.id)}
              className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors ${
                myAssignment.servingOnDesk
                  ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : 'bg-[#0095FF] text-white hover:bg-[#0082E0]'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>
                {myAssignment.servingOnDesk
                  ? `Em posição na mesa (${DESK_POSITION_INFO[myAssignment.position].label})`
                  : 'Já estou servindo na mesa'}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateAttendance(
                  myAssignment.id,
                  myAssignment.attendanceStatus === 'CONFIRMED' ? 'PENDING' : 'CONFIRMED',
                )
              }
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-white/12 px-5 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {myAssignment.attendanceStatus === 'CONFIRMED'
                  ? 'Presença confirmada'
                  : 'Confirmar presença'}
              </span>
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => onNavigateTab('meditacao')}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-[#0095FF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0082E0]"
            >
              <span>Registrar meu MDO e Versículos</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      {/* Clean ruled summary list — minimal, scannable, mobile-native */}
      <section>
        <h2 className="text-base font-semibold text-white">Resumo do culto</h2>
        <div className="mt-3 divide-y divide-white/8 rounded-xl border border-white/10 bg-[#12141A]">
          <button
            type="button"
            onClick={() => onNavigateTab('escalas')}
            className="flex min-h-[56px] w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
          >
            <div>
              <div className="text-sm font-medium text-white">Escala da Mesa</div>
              <div className="text-sm text-zinc-400">
                {confirmedCount} de 5 confirmados · {servingCount} servindo agora
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('musicas')}
            className="flex min-h-[56px] w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
          >
            <div>
              <div className="text-sm font-medium text-white">Músicas da Semana</div>
              <div className="text-sm text-zinc-400">
                {state.songs.length} importadas · {approvedSongs} aprovadas para o Holyrics
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('programacao')}
            className="flex min-h-[56px] w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
          >
            <div>
              <div className="text-sm font-medium text-white">
                Programação {team.name} e Mídias
              </div>
              <div className="text-sm text-zinc-400">
                {state.runItems.length} blocos no roteiro · {state.mediaAssets.length} arquivos enviados
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('meditacao')}
            className="flex min-h-[56px] w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
          >
            <div>
              <div className="text-sm font-medium text-white">Meu Controle de Meditação</div>
              <div className="text-sm text-zinc-400">
                MDO: {mdoDone}/6 dias na semana · Versículo de sábado:{' '}
                {verseDone ? 'registrado' : 'pendente'}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('culto')}
            className="flex min-h-[56px] w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
          >
            <div>
              <div className="text-sm font-medium text-white">Culto e Pacote Holyrics</div>
              <div className="text-sm text-zinc-400">
                Painel ao vivo da mesa e download da pasta compactada (.zip)
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500" />
          </button>
        </div>
      </section>
    </div>
  );
}
