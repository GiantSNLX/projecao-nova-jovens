import { useEffect, useState } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import type {
  AttendanceStatus,
  DeskAssignment,
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

function formatDateBr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

/* ------------------------------------------------------------------ */
/* Painel de LED: simula o telão, por isso é escuro nos dois temas.    */
/* ------------------------------------------------------------------ */

interface LedSlide {
  id: string;
  title: string;
  subtitle?: string;
  durationMs: number;
  isFinal?: boolean;
}

const LED_SLIDES: LedSlide[] = [
  { id: 'culto', title: 'Culto', durationMs: 2000 },
  { id: 'programacoes', title: 'Programações', durationMs: 2000 },
  { id: 'congressos', title: 'Congressos', durationMs: 2000 },
  { id: 'musicais', title: 'Musicais', durationMs: 2000 },
  { id: 'sonho-natal', title: 'Sonho de Natal', durationMs: 2200 },
  {
    id: 'projecao',
    title: 'Projeção',
    subtitle: 'Projetando a Cristo através de mídias',
    durationMs: 4800,
    isFinal: true,
  },
];

function LedPanel() {
  const [slideIndex, setSlideIndex] = useState<number>(LED_SLIDES.length - 1);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setSlideIndex((prev) => (prev + 1) % LED_SLIDES.length),
      LED_SLIDES[slideIndex].durationMs,
    );
    return () => window.clearTimeout(timer);
  }, [slideIndex]);

  const slide = LED_SLIDES[slideIndex];

  return (
    <section
      aria-label="Painel de LED"
      className="relative flex h-32 w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-line bg-[#050608] px-4 text-center"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(70, 120, 200, 0.16) 0%, rgba(5, 6, 8, 0) 70%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.14) 0.75px, transparent 0.75px)',
          backgroundSize: '4px 4px',
        }}
      />
      <div key={slide.id} className="relative z-10 space-y-1 px-2">
        <p
          className={`font-semibold text-white ${
            slide.isFinal ? 'text-2xl tracking-[-0.02em]' : 'text-lg uppercase tracking-[0.16em]'
          }`}
        >
          {slide.title}
        </p>
        {slide.subtitle && <p className="text-xs text-white/70 sm:text-sm">{slide.subtitle}</p>}
      </div>
      <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1">
        {LED_SLIDES.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Mostrar "${s.title}"`}
            onClick={() => setSlideIndex(idx)}
            className="flex h-5 items-center justify-center px-0.5"
          >
            <span
              className={`block h-1 rounded-full transition-all ${
                idx === slideIndex ? 'w-4 bg-white/85' : 'w-1 bg-white/30'
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Minha escala                                                        */
/* ------------------------------------------------------------------ */

const ATTENDANCE_TAG: Record<AttendanceStatus, { label: string; className: string }> = {
  CONFIRMED: { label: 'Presença confirmada', className: 'border-ok/35 bg-ok/10 text-ok' },
  PENDING: { label: 'Presença pendente', className: 'border-attn/35 bg-attn/10 text-attn' },
  DECLINED: { label: 'Ausência informada', className: 'border-danger/35 bg-danger/10 text-danger' },
};

const primaryBtn =
  'btn-rb-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white';
const secondaryBtn =
  'btn-rb-surface inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-line px-4 text-sm font-medium text-ink-2 hover:text-ink';

function MyAssignmentCard({
  assignment,
  onUpdateAttendance,
  onToggleServingOnDesk,
}: {
  assignment: DeskAssignment;
  onUpdateAttendance: InicioTabProps['onUpdateAttendance'];
  onToggleServingOnDesk: InicioTabProps['onToggleServingOnDesk'];
}) {
  const info = DESK_POSITION_INFO[assignment.position];
  const status = assignment.attendanceStatus;
  const tag = assignment.servingOnDesk
    ? { label: `Na mesa desde ${assignment.deskCheckinAt ?? ''}`.trim(), className: ATTENDANCE_TAG.CONFIRMED.className }
    : ATTENDANCE_TAG[status];

  return (
    <section aria-labelledby="minha-escala" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id="minha-escala" className="text-xs font-medium text-ink-3">
            Minha escala
          </h2>
          <p className="mt-0.5 text-lg font-semibold text-ink">{info.label}</p>
          <p className="mt-0.5 text-sm text-ink-3">{info.responsibility}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-md border px-2 py-1 text-xs font-medium ${tag.className}`}>
          {tag.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 [&>button]:flex-1 [&>button]:whitespace-nowrap sm:[&>button]:flex-none">
        {status === 'CONFIRMED' ? (
          <>
            <button
              type="button"
              onClick={() => onToggleServingOnDesk(assignment.id)}
              className={assignment.servingOnDesk ? secondaryBtn : primaryBtn}
            >
              {assignment.servingOnDesk ? 'Sair da mesa' : 'Entrar na mesa'}
            </button>
            <button
              type="button"
              onClick={() => onUpdateAttendance(assignment.id, 'PENDING')}
              className={secondaryBtn}
            >
              Desfazer confirmação
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onUpdateAttendance(assignment.id, 'CONFIRMED')}
              className={primaryBtn}
            >
              Confirmar presença
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateAttendance(assignment.id, status === 'DECLINED' ? 'PENDING' : 'DECLINED')
              }
              className={secondaryBtn}
            >
              {status === 'DECLINED' ? 'Desfazer resposta' : 'Informar ausência'}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Pendências do culto                                                 */
/* ------------------------------------------------------------------ */

type Owner = 'music' | 'programming' | 'desk';

interface PendingItem {
  key: string;
  label: string;
  hint: string;
  count: number;
  tab: TabId;
  owner: Owner;
}

function buildPendingItems(state: ServiceState): PendingItem[] {
  const hasLyrics = (raw: string) => raw.trim().length > 0;
  // Mesma regra da aba Programação: música depende de letra, encerramento não exige mídia,
  // e mídia de Arranque sem momento vinculado atende o momento "Arranque".
  const hasMedia = (itemId: string, title: string) =>
    state.mediaAssets.some(
      (m) =>
        m.runItemId === itemId ||
        (!m.runItemId && title.toLowerCase().includes('arranque') && m.displayTrigger === 'ARRANQUE'),
    );
  const needsMedia = state.runItems.filter(
    (r) =>
      r.requiresMedia &&
      r.itemType !== 'WORSHIP' &&
      !r.songCode &&
      r.itemType !== 'CLOSING' &&
      !hasMedia(r.id, r.title),
  );

  const items: PendingItem[] = [
    {
      key: 'letras-faltando',
      label: 'Letras não enviadas',
      hint: 'Música',
      count: state.songs.filter((s) => !hasLyrics(s.rawLyrics)).length,
      tab: 'musicas',
      owner: 'music',
    },
    {
      key: 'letras-ajuste',
      label: 'Ajustes solicitados em letras',
      hint: 'Música',
      count: state.songs.filter((s) => s.adjustmentRequest).length,
      tab: 'musicas',
      owner: 'music',
    },
    {
      key: 'letras-aprovacao',
      label: 'Letras aguardando aprovação',
      hint: 'Capitão',
      count: state.songs.filter((s) => hasLyrics(s.rawLyrics) && !s.approved && !s.adjustmentRequest)
        .length,
      tab: 'musicas',
      owner: 'music',
    },
    {
      key: 'momentos-sem-midia',
      label: 'Momentos do roteiro sem mídia',
      hint: 'Programação',
      count: needsMedia.length,
      tab: 'programacao',
      owner: 'programming',
    },
    {
      key: 'midias-ajuste',
      label: 'Ajustes solicitados em mídias',
      hint: 'Programação',
      count: state.mediaAssets.filter((m) => m.adjustmentRequest).length,
      tab: 'programacao',
      owner: 'programming',
    },
    {
      key: 'midias-aprovacao',
      label: 'Mídias aguardando aprovação',
      hint: 'Capitão',
      count: state.mediaAssets.filter((m) => !m.approved && !m.adjustmentRequest).length,
      tab: 'programacao',
      owner: 'programming',
    },
    {
      key: 'presencas',
      label: 'Presenças sem resposta',
      hint: 'Escala',
      count: state.assignments.filter((a) => a.attendanceStatus === 'PENDING').length,
      tab: 'escalas',
      owner: 'desk',
    },
    {
      key: 'ausencias',
      label: 'Ausências informadas',
      hint: 'Escala',
      count: state.assignments.filter((a) => a.attendanceStatus === 'DECLINED').length,
      tab: 'escalas',
      owner: 'desk',
    },
  ];
  return items.filter((i) => i.count > 0);
}

/* ------------------------------------------------------------------ */

export function InicioTab({
  state,
  activeUser,
  onUpdateAttendance,
  onToggleServingOnDesk,
  onNavigateTab,
}: InicioTabProps) {
  const myAssignment = state.assignments.find((a) => a.userId === activeUser.id);
  const team = TEAM_LABELS[state.programmingTeam];

  const isLeader = activeUser.roles.includes('ADMIN') || activeUser.roles.includes('CAPTAIN');
  const isMusicRole = activeUser.roles.includes('MUSIC');
  const isProgrammingRole = activeUser.roles.includes('PROGRAMMING');

  const songsWithLyrics = state.songs.filter((s) => s.rawLyrics.trim().length > 0).length;
  const myMdo = state.saturdayMdoRecords.find(
    (r) => r.userId === activeUser.id && r.saturdayDate === state.serviceDate,
  );

  const pending = buildPendingItems(state).filter(
    (i) =>
      isLeader ||
      (isMusicRole && i.owner === 'music') ||
      (isProgrammingRole && i.owner === 'programming'),
  );

  const context = myAssignment
    ? `Você está na escala da mesa como ${DESK_POSITION_INFO[myAssignment.position].label}.`
    : isProgrammingRole
      ? activeUser.programmingTeam === state.programmingTeam
        ? `Sua equipe (${team.name}) está com a programação deste culto.`
        : `A equipe ${team.name} está com a programação deste culto.`
      : isMusicRole
        ? `${songsWithLyrics} de ${state.songs.length} letras prontas para este culto.`
        : 'Confira o roteiro do culto e registre seu MDO.';

  const roleShortcut: { label: string; tab: TabId } | null = myAssignment
    ? null
    : isProgrammingRole
      ? { label: 'Abrir programação e mídias', tab: 'programacao' }
      : isMusicRole
        ? { label: 'Abrir músicas', tab: 'musicas' }
        : null;

  const summary: { label: string; value: string }[] = [
    { label: 'Momentos no roteiro', value: String(state.runItems.length) },
    { label: 'Letras prontas', value: `${songsWithLyrics} de ${state.songs.length}` },
    { label: 'Mídias enviadas', value: String(state.mediaAssets.length) },
    { label: 'Programação', value: `Equipe ${team.name}` },
  ];

  return (
    <div className="space-y-6">
      {/* Culto selecionado */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tabular-nums text-ink-3">
            {state.title} · {formatDateBr(state.serviceDate)} · {state.startsAtTime}
          </p>
          <h1 className="page-title mt-1">Olá, {activeUser.name.split(' ')[0]}.</h1>
          <p className="mt-1 text-sm text-ink-3">{context}</p>
        </div>
        {roleShortcut && (
          <button type="button" onClick={() => onNavigateTab(roleShortcut.tab)} className={primaryBtn}>
            <span>{roleShortcut.label}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </header>

      {state.isFrozen && (
        <p className="rounded-lg border border-attn/35 bg-attn/10 px-3 py-2 text-sm text-attn">
          Envios da semana travados pela liderança. Novas letras e mídias dependem de reabertura.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {myAssignment && (
            <MyAssignmentCard
              assignment={myAssignment}
              onUpdateAttendance={onUpdateAttendance}
              onToggleServingOnDesk={onToggleServingOnDesk}
            />
          )}

          {(isLeader || isMusicRole || isProgrammingRole) && (
            <section aria-labelledby="pendencias">
              <h2 id="pendencias" className="section-title">
                Pendências do culto
              </h2>
              {pending.length === 0 ? (
                <p className="mt-2 text-sm text-ink-3">Nada pendente para você neste culto.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line-soft overflow-hidden rounded-xl border border-line bg-surface">
                  {pending.map((item) => (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => onNavigateTab(item.tab)}
                        className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-ink/5"
                      >
                        <span className="w-7 shrink-0 text-right text-base font-semibold tabular-nums text-attn">
                          {item.count}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-ink">{item.label}</span>
                          <span className="block text-xs text-ink-3">{item.hint}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-ink-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <LedPanel />

          <section aria-labelledby="resumo" className="rounded-xl border border-line bg-surface">
            <h2 id="resumo" className="border-b border-line-soft px-4 py-2.5 text-xs font-medium text-ink-3">
              Resumo do culto
            </h2>
            <dl className="divide-y divide-line-soft">
              {summary.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <dt className="text-sm text-ink-3">{row.label}</dt>
                  <dd className="text-sm font-medium tabular-nums text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-ink-3">MDO de {formatDateBr(state.serviceDate)}</p>
              {myMdo ? (
                <p className="mt-0.5 text-sm font-medium tabular-nums text-ink">
                  M {myMdo.meditationDays}/5 · D {myMdo.memorizedVerses} · O {myMdo.prayerDays}/5
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-ink-2">Ainda não registrado</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('meditacao')}
              className="btn-rb-surface inline-flex min-h-[40px] shrink-0 items-center rounded-lg border border-line px-3 text-sm font-medium text-ink-2 hover:text-ink"
            >
              {myMdo ? 'Revisar' : 'Registrar'}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
