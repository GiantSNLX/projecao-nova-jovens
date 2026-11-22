import { ArrowRight, CheckCircle2, MonitorPlay, Music, Radio, UserCheck } from 'lucide-react';
import type {
  AttendanceStatus,
  MemberUser,
  ServiceState,
  TabId,
} from '../types/portal';
import { DESK_POSITION_INFO, TEAM_LABELS } from '../data/initialState';
import { GlassIconBadge } from './reactbits/GlassIconBadge';
import { SpotlightCard } from './reactbits/SpotlightCard';

interface InicioTabProps {
  state: ServiceState;
  activeUser: MemberUser;
  onUpdateAttendance: (assignmentId: string, status: AttendanceStatus) => void;
  onToggleServingOnDesk: (assignmentId: string) => void;
  onNavigateTab: (tab: TabId) => void;
}

function formatDateBr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
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
  const myMdo = state.saturdayMdoRecords.find(
    (r) => r.userId === activeUser.id && r.saturdayDate === state.serviceDate,
  );

  return (
    <div className="space-y-8">
      {/* Telão de boas-vindas */}
      <SpotlightCard
        spotlightColor="rgba(0, 149, 255, 0.16)"
        className="rounded-xl border border-[#0095FF]/35 bg-[#07080B]"
      >
        <section
          aria-label="Telão Projeção"
          className="relative flex aspect-video max-h-[240px] w-full flex-col items-center justify-center px-6 text-center"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,149,255,0.16),transparent_68%)]"
          />
          <div className="relative z-10 space-y-2">
            <span className="font-mono-tech inline-block rounded border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium tracking-widest text-[#38BDF8]">
              TELÃO PRINCIPAL · 16:9
            </span>
            <h2 className="text-2xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
              Projeção
            </h2>
            <p className="text-sm font-medium text-zinc-200 sm:text-lg">
              Projetando a Cristo através de mídias
            </p>
          </div>
        </section>
      </SpotlightCard>

      <section className="border-b border-white/10 pb-7">
        <p className="font-mono-tech text-xs text-zinc-400">
          {state.title} · {formatDateBr(state.serviceDate)} · {state.startsAtTime}
        </p>
        <h1 className="page-title mt-2">Olá, {activeUser.name.split(' ')[0]}.</h1>
        <p className="mt-2 max-w-2xl text-base text-zinc-400">
          {myAssignment
            ? `Você está escalado na mesa como ${DESK_POSITION_INFO[myAssignment.position].label}.`
            : isProgrammingRole
              ? 'Envie as mídias nos telões e o roteiro da semana para cair direto no painel do Culto.'
              : isMusicRole
                ? 'Envie as letras das músicas em 1 linha (Retorno/Studio) e 2 linhas (Principal).'
                : 'Acompanhe o andamento do culto da semana e registre seu MDO de sábado.'}
        </p>

        {/* Ação principal conforme papel do usuário */}
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          {myAssignment ? (
            <>
              <button
                type="button"
                onClick={() => onToggleServingOnDesk(myAssignment.id)}
                className={`group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold ${
                  myAssignment.servingOnDesk
                    ? 'btn-rb-surface border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'btn-rb-primary text-white'
                }`}
              >
                <UserCheck className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span>
                  {myAssignment.servingOnDesk
                    ? `Estou na mesa (${DESK_POSITION_INFO[myAssignment.position].label})`
                    : 'Estou na mesa'}
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
                className="btn-rb-surface inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-white/12 px-5 text-sm font-medium text-zinc-200"
              >
                <CheckCircle2 className="h-4 w-4 text-[#0095FF]" />
                <span>
                  {myAssignment.attendanceStatus === 'CONFIRMED'
                    ? 'Escala confirmada'
                    : 'Confirmar escala'}
                </span>
              </button>
            </>
          ) : isProgrammingRole ? (
            <button
              type="button"
              onClick={() => onNavigateTab('programacao')}
              className="btn-rb-primary group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white"
            >
              <span>Testar mídias e importar roteiro</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : isMusicRole ? (
            <button
              type="button"
              onClick={() => onNavigateTab('musicas')}
              className="btn-rb-primary group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white"
            >
              <span>Enviar letras das músicas</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateTab('meditacao')}
              className="btn-rb-primary group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white"
            >
              <span>Registrar meu MDO</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      </section>

      {/* Fluxo semanal: Programação + Músicas -> Culto */}
      <section>
        <h2 className="section-title">Fluxo da semana (dos ministérios para a Projeção)</h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <SpotlightCard className="group rounded-xl border border-white/10 bg-[#12141A] transition-colors hover:border-[#0095FF]/40">
            <button
              type="button"
              onClick={() => onNavigateTab('programacao')}
              className="w-full p-4 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-400">
                  1. Programação {team.name}
                </span>
                <GlassIconBadge icon={MonitorPlay} size="sm" tone="blue" />
              </div>
              <div className="mt-2 text-base font-semibold text-white">
                {state.runItems.length} horários · {state.mediaAssets.length} mídias
              </div>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#38BDF8]">
                <span>Abrir Programação e Mídias</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </SpotlightCard>

          <SpotlightCard className="group rounded-xl border border-white/10 bg-[#12141A] transition-colors hover:border-emerald-500/40">
            <button
              type="button"
              onClick={() => onNavigateTab('musicas')}
              className="w-full p-4 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-400">2. Ministério de Música</span>
                <GlassIconBadge icon={Music} size="sm" tone="emerald" />
              </div>
              <div className="mt-2 text-base font-semibold text-white">
                {songsWithLyrics} de {state.songs.length} letras prontas
              </div>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                <span>Abrir Músicas</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </SpotlightCard>

          <SpotlightCard className="group rounded-xl border border-white/10 bg-[#12141A] transition-colors hover:border-[#F5C41E]/40">
            <button
              type="button"
              onClick={() => onNavigateTab('culto')}
              className="w-full p-4 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-400">3. Projeção (Culto)</span>
                <GlassIconBadge icon={Radio} size="sm" tone="gold" />
              </div>
              <div className="mt-2 text-base font-semibold text-white">
                Conferir tudo para o Holyrics
              </div>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#F5C41E]">
                <span>Abrir painel do Culto</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </SpotlightCard>
        </div>

        <p className="mt-4 text-xs text-zinc-400">
          Seu MDO deste sábado ({formatDateBr(state.serviceDate)}):{' '}
          <span className="font-mono-tech text-zinc-200">
            M {myMdo?.meditationDays ?? 0}/5 · D {myMdo?.memorizedVerses ?? 0} vers. · O{' '}
            {myMdo?.prayerDays ?? 0}/5
          </span>
        </p>
      </section>
    </div>
  );
}
