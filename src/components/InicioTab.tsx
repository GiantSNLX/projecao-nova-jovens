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

  const isMusicRole = activeUser.roles.includes('MUSIC');
  const isProgrammingRole = activeUser.roles.includes('PROGRAMMING');

  const songsWithLyrics = state.songs.filter((s) => s.rawLyrics.trim().length > 0).length;
  const mdoDone = state.mdoEntries.filter((m) => m.userId === activeUser.id && m.completed).length;

  return (
    <div className="space-y-8">
      <section className="border-b border-white/10 pb-7">
        <p className="font-mono-tech text-xs text-zinc-400">
          {state.serviceDate} · {state.startsAtTime} · Programação {team.name}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Olá, {activeUser.name.split(' ')[0]}.
        </h1>
        <p className="mt-2 max-w-2xl text-base text-zinc-400">
          {myAssignment
            ? `Você está escalado na mesa como ${DESK_POSITION_INFO[myAssignment.position].label}.`
            : isProgrammingRole
              ? 'Envie a imagem do roteiro e as mídias do culto para cair direto na mesa da Projeção.'
              : isMusicRole
                ? 'Preencha as letras das músicas vindas do roteiro para gerar os arquivos do Holyrics.'
                : 'Acompanhe o fluxo do culto da semana e suas meditações.'}
        </p>

        {/* Primary action by user's context — zero clutter */}
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          {myAssignment ? (
            <>
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
                    ? `Servindo na mesa (${DESK_POSITION_INFO[myAssignment.position].label})`
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
            </>
          ) : isProgrammingRole ? (
            <button
              type="button"
              onClick={() => onNavigateTab('programacao')}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[#0095FF] px-5 text-sm font-semibold text-white hover:bg-[#0082E0]"
            >
              <span>Importar roteiro e enviar mídias</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : isMusicRole ? (
            <button
              type="button"
              onClick={() => onNavigateTab('musicas')}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[#0095FF] px-5 text-sm font-semibold text-white hover:bg-[#0082E0]"
            >
              <span>Completar letras das músicas</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateTab('meditacao')}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[#0095FF] px-5 text-sm font-semibold text-white hover:bg-[#0082E0]"
            >
              <span>Abrir meu controle de meditação</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      {/* Fluxo da semana: Programação + Música -> Projeção */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-300">
          Fluxo da semana (dos ministérios para a Projeção)
        </h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => onNavigateTab('programacao')}
            className="rounded-xl border border-white/10 bg-[#12141A] p-4 text-left transition-colors hover:border-white/20"
          >
            <span className="text-xs text-zinc-400">1. Programação {team.name}</span>
            <div className="mt-1 text-base font-semibold text-white">
              {state.runItems.length} momentos · {state.mediaAssets.length} mídias
            </div>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#0095FF]">
              <span>Importar roteiro e mídias</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('musicas')}
            className="rounded-xl border border-white/10 bg-[#12141A] p-4 text-left transition-colors hover:border-white/20"
          >
            <span className="text-xs text-zinc-400">2. Ministério de Música</span>
            <div className="mt-1 text-base font-semibold text-white">
              {songsWithLyrics} de {state.songs.length} letras prontas
            </div>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#0095FF]">
              <span>Ver músicas do roteiro</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('culto')}
            className="rounded-xl border border-white/10 bg-[#12141A] p-4 text-left transition-colors hover:border-white/20"
          >
            <span className="text-xs text-zinc-400">3. Projeção (Culto)</span>
            <div className="mt-1 text-base font-semibold text-white">
              Tudo reunido para o Holyrics
            </div>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#0095FF]">
              <span>Abrir painel do culto</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          Seu MDO desta semana: {mdoDone}/6 dias preenchidos.
        </p>
      </section>
    </div>
  );
}
