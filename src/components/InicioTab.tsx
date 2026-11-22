import { useEffect, useState } from 'react';
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

interface LedSlide {
  id: string;
  title: string;
  subtitle?: string;
  accent: string;
  durationMs: number;
  isFinal?: boolean;
}

const LED_SLIDES: LedSlide[] = [
  {
    id: 'culto',
    title: 'Culto',
    accent: 'rgba(0, 149, 255, 0.22)',
    durationMs: 2000,
  },
  {
    id: 'programacoes',
    title: 'Programações',
    accent: 'rgba(56, 189, 248, 0.20)',
    durationMs: 2000,
  },
  {
    id: 'congressos',
    title: 'Congressos',
    accent: 'rgba(245, 196, 30, 0.18)',
    durationMs: 2000,
  },
  {
    id: 'musicais',
    title: 'Musicais',
    accent: 'rgba(16, 185, 129, 0.18)',
    durationMs: 2000,
  },
  {
    id: 'sonho-natal',
    title: 'Sonho de Natal',
    accent: 'rgba(245, 196, 30, 0.22)',
    durationMs: 2200,
  },
  {
    id: 'projecao',
    title: 'Projeção',
    subtitle: 'Projetando a Cristo através de mídias',
    accent: 'rgba(0, 149, 255, 0.26)',
    durationMs: 4800,
    isFinal: true,
  },
];

export function InicioTab({
  state,
  activeUser,
  onUpdateAttendance,
  onToggleServingOnDesk,
  onNavigateTab,
}: InicioTabProps) {
  const [slideIndex, setSlideIndex] = useState<number>(LED_SLIDES.length - 1);

  useEffect(() => {
    const current = LED_SLIDES[slideIndex];
    const timer = window.setTimeout(() => {
      setSlideIndex((prev) => (prev + 1) % LED_SLIDES.length);
    }, current.durationMs);
    return () => window.clearTimeout(timer);
  }, [slideIndex]);

  const activeSlide = LED_SLIDES[slideIndex];

  const myAssignment = state.assignments.find((a) => a.userId === activeUser.id);
  const team = TEAM_LABELS[state.programmingTeam];

  const isMusicRole = activeUser.roles.includes('MUSIC');
  const isProgrammingRole = activeUser.roles.includes('PROGRAMMING');

  const songsWithLyrics = state.songs.filter((s) => s.rawLyrics.trim().length > 0).length;
  const myMdo = state.saturdayMdoRecords.find(
    (r) => r.userId === activeUser.id && r.saturdayDate === state.serviceDate,
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Painel de LED */}
      <div className="rounded-2xl border border-white/15 bg-[#090B10] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.65)] sm:p-2">
        <section
          aria-label="Painel de LED Projeção"
          className="relative flex aspect-[16/7] min-h-[168px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#040507] px-5 text-center sm:min-h-[220px]"
        >
          {/* Luz suave do painel conforme o slide atual */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse at center, ${activeSlide.accent} 0%, rgba(4,5,7,0.92) 72%)`,
            }}
          />

          {/* Micro-matriz de LED sutil + divisões discretas de gabinetes */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255, 255, 255, 0.14) 0.75px, transparent 0.75px)',
              backgroundSize: '4px 4px',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '25% 50%',
            }}
          />

          {/* Conteúdo central do telão */}
          <div key={activeSlide.id} className="relative z-10 max-w-2xl space-y-2 px-2">
            <h2
              className={`font-bold tracking-[-0.03em] text-white drop-shadow-[0_0_24px_rgba(0,149,255,0.35)] ${
                activeSlide.isFinal
                  ? 'text-2xl sm:text-5xl'
                  : 'text-xl uppercase tracking-[0.14em] text-zinc-100 sm:text-4xl'
              }`}
            >
              {activeSlide.title}
            </h2>
            {activeSlide.subtitle && (
              <p className="text-sm font-medium text-zinc-200 sm:text-xl">
                {activeSlide.subtitle}
              </p>
            )}
          </div>

          {/* Indicadores discretos na base do painel */}
          <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
            {LED_SLIDES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                aria-label={s.title}
                onClick={() => setSlideIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === slideIndex
                    ? 'w-5 bg-[#0095FF]'
                    : 'w-1.5 bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="border-b border-white/10 pb-6">
        <p className="font-mono-tech text-xs text-zinc-400">
          {state.title} · {formatDateBr(state.serviceDate)} · {state.startsAtTime}
        </p>
        <h1 className="page-title mt-1.5">Olá, {activeUser.name.split(' ')[0]}.</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {myAssignment
            ? `Escalado na mesa como ${DESK_POSITION_INFO[myAssignment.position].label}.`
            : isProgrammingRole
              ? `Equipe ${team.name} ativa nesta semana.`
              : isMusicRole
                ? `${songsWithLyrics} de ${state.songs.length} letras prontas.`
                : 'Confira a programação do sábado.'}
        </p>

        {/* Botões proporcionais no celular (grid-cols-2 quando há 2 botões) */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap">
          {myAssignment ? (
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => onToggleServingOnDesk(myAssignment.id)}
                className={`inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold sm:text-sm ${
                  myAssignment.servingOnDesk
                    ? 'btn-rb-surface border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'btn-rb-primary text-white'
                }`}
              >
                <UserCheck className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {myAssignment.servingOnDesk
                    ? `Na mesa (${DESK_POSITION_INFO[myAssignment.position].short})`
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
                className="btn-rb-surface inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg border border-white/12 px-4 text-xs font-medium text-zinc-200 sm:text-sm"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0095FF]" />
                <span className="truncate">
                  {myAssignment.attendanceStatus === 'CONFIRMED'
                    ? 'Escala confirmada'
                    : 'Confirmar escala'}
                </span>
              </button>
            </div>
          ) : isProgrammingRole ? (
            <button
              type="button"
              onClick={() => onNavigateTab('programacao')}
              className="btn-rb-primary inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white"
            >
              <span>Abrir Programação e Mídias</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : isMusicRole ? (
            <button
              type="button"
              onClick={() => onNavigateTab('musicas')}
              className="btn-rb-primary inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white"
            >
              <span>Abrir Músicas</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateTab('meditacao')}
              className="btn-rb-primary inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white"
            >
              <span>Registrar meu MDO</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      {/* Atalhos rápidos */}
      <section>
        <div className="grid gap-3 sm:grid-cols-3">
          <SpotlightCard className="group rounded-xl border border-white/10 bg-[#12141A] transition-colors hover:border-[#0095FF]/40">
            <button
              type="button"
              onClick={() => onNavigateTab('programacao')}
              className="w-full p-4 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-400">
                  Programação {team.name}
                </span>
                <GlassIconBadge icon={MonitorPlay} size="sm" tone="blue" />
              </div>
              <div className="mt-2 text-base font-semibold text-white">
                {state.runItems.length} horários · {state.mediaAssets.length} mídias
              </div>
            </button>
          </SpotlightCard>

          <SpotlightCard className="group rounded-xl border border-white/10 bg-[#12141A] transition-colors hover:border-emerald-500/40">
            <button
              type="button"
              onClick={() => onNavigateTab('musicas')}
              className="w-full p-4 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-400">Músicas</span>
                <GlassIconBadge icon={Music} size="sm" tone="emerald" />
              </div>
              <div className="mt-2 text-base font-semibold text-white">
                {songsWithLyrics} de {state.songs.length} letras prontas
              </div>
            </button>
          </SpotlightCard>

          <SpotlightCard className="group rounded-xl border border-white/10 bg-[#12141A] transition-colors hover:border-[#F5C41E]/40">
            <button
              type="button"
              onClick={() => onNavigateTab('culto')}
              className="w-full p-4 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-400">Culto</span>
                <GlassIconBadge icon={Radio} size="sm" tone="gold" />
              </div>
              <div className="mt-2 text-base font-semibold text-white">
                Painel e pacote Holyrics
              </div>
            </button>
          </SpotlightCard>
        </div>

        {myMdo && (
          <p className="mt-4 text-xs text-zinc-400">
            MDO ({formatDateBr(state.serviceDate)}):{' '}
            <span className="font-mono-tech text-zinc-200">
              M {myMdo.meditationDays}/5 · D {myMdo.memorizedVerses} · O {myMdo.prayerDays}/5
            </span>
          </p>
        )}
      </section>
    </div>
  );
}
