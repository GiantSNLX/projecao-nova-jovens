import { useMemo, useState, type FormEvent } from 'react';
import { Archive, CalendarPlus, Check, Plus, RotateCcw } from 'lucide-react';
import type {
  AttendanceStatus,
  DeskPosition,
  MemberUser,
  SaturdaySchedule,
  ScheduleLocationType,
  ServiceState,
} from '../types/portal';
import { DESK_POSITION_INFO } from '../data/initialState';

export interface NewSchedulePayload {
  date: string;
  title: string;
  locationType: ScheduleLocationType;
  roomName?: string;
}

interface EscalasTabProps {
  state: ServiceState;
  members: MemberUser[];
  activeUser: MemberUser;
  isLeader: boolean;
  onUpdateAttendance: (scheduleId: string, assignmentId: string, status: AttendanceStatus) => void;
  onToggleServingOnDesk: (scheduleId: string, assignmentId: string) => void;
  onChangeAssignmentMember: (scheduleId: string, assignmentId: string, userId: string) => void;
  onUpdateScheduleDetails: (
    scheduleId: string,
    patch: { title?: string; locationType?: ScheduleLocationType; roomName?: string },
  ) => void;
  onTogglePositionInSchedule: (scheduleId: string, position: DeskPosition) => void;
  onAddSchedule: (payload: NewSchedulePayload) => string;
  onToggleArchiveSchedule: (scheduleId: string, archived: boolean) => void;
}

type EscalaSubTab = 'ver' | 'montar' | 'arquivados';

const ALL_POSITIONS: DeskPosition[] = [
  'CAPITAO',
  'PRINCIPAL',
  'RETORNO',
  'CORTE',
  'STUDIO',
  'APOIO',
];

/* Padrões visuais da aba (tokens de tema; nada de cor fixa) */
const BTN_BASE =
  'inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm transition-colors lg:min-h-9';
const BTN_PRIMARY = `${BTN_BASE} btn-rb-primary font-semibold`;
const BTN_SECONDARY = `${BTN_BASE} btn-rb-surface border border-line font-medium text-ink-2 hover:text-ink`;
const FIELD =
  'min-h-11 w-full rounded-lg border border-line bg-sunken px-3 text-base text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none lg:min-h-9 lg:text-sm';
const LABEL = 'mb-1 block text-xs text-ink-3';
const CARD = 'rounded-xl border border-line bg-surface';
const CARD_HEADER = 'border-b border-line px-4 py-3';

const PRESENCE_INFO: Record<AttendanceStatus, { label: string; className: string }> = {
  CONFIRMED: { label: 'Confirmada', className: 'border-ok/30 bg-ok/10 text-ok' },
  PENDING: { label: 'Pendente', className: 'border-attn/30 bg-attn/10 text-attn' },
  DECLINED: { label: 'Ausência informada', className: 'border-danger/30 bg-danger/10 text-danger' },
};

function formatDateBr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

function getLocationLabel(locationType: ScheduleLocationType, roomName?: string): string {
  if (locationType === 'SALA') {
    return roomName?.trim() ? roomName.trim() : 'Sala';
  }
  return 'Auditório principal';
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

function PresenceBadge({ status }: { status: AttendanceStatus }) {
  const info = PRESENCE_INFO[status];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${info.className}`}
    >
      {info.label}
    </span>
  );
}

function OnDeskBadge() {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-md bg-ok-solid px-2 py-0.5 text-xs font-medium text-white">
      Na mesa
    </span>
  );
}

export function EscalasTab({
  state,
  members,
  activeUser,
  isLeader,
  onUpdateAttendance,
  onToggleServingOnDesk,
  onChangeAssignmentMember,
  onUpdateScheduleDetails,
  onTogglePositionInSchedule,
  onAddSchedule,
  onToggleArchiveSchedule,
}: EscalasTabProps) {
  const [subTab, setSubTab] = useState<EscalaSubTab>('ver');
  const [showNewForm, setShowNewForm] = useState(false);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const isScheduleArchived = (s: SaturdaySchedule): boolean =>
    s.isPast === true ||
    (s.isPast === undefined && s.date < todayIso && s.id !== state.activeScheduleId);

  const upcomingSchedules = useMemo(
    () =>
      state.schedules
        .filter((s) => !isScheduleArchived(s))
        .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.schedules, state.activeScheduleId, todayIso],
  );

  const archivedSchedules = useMemo(
    () =>
      state.schedules
        .filter((s) => isScheduleArchived(s))
        .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.schedules, state.activeScheduleId, todayIso],
  );

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    state.activeScheduleId || upcomingSchedules[0]?.id || '',
  );

  const activeSchedule =
    upcomingSchedules.find((s) => s.id === selectedScheduleId) ?? upcomingSchedules[0];

  const sameDateSchedules = useMemo(() => {
    if (!activeSchedule) return [];
    return upcomingSchedules.filter((s) => s.date === activeSchedule.date);
  }, [upcomingSchedules, activeSchedule]);

  const [newDate, setNewDate] = useState(
    upcomingSchedules[upcomingSchedules.length - 1]?.date ?? state.serviceDate,
  );
  const [newTitle, setNewTitle] = useState('');
  const [newLocationType, setNewLocationType] =
    useState<ScheduleLocationType>('AUDITORIO_PRINCIPAL');
  const [newRoomName, setNewRoomName] = useState('Sala 2');

  const historyStats = useMemo(() => {
    const deskMembers = members.filter(
      (m) =>
        m.active &&
        (!m.roles.includes('MUSIC') && !m.roles.includes('PROGRAMMING') ||
          m.roles.includes('CAPTAIN') ||
          m.roles.includes('ADMIN')),
    );

    return deskMembers.map((member) => {
      const counts: Record<DeskPosition, number> = {
        CAPITAO: 0,
        PRINCIPAL: 0,
        RETORNO: 0,
        CORTE: 0,
        STUDIO: 0,
        APOIO: 0,
      };
      let lastServedDate = '';
      let lastServedPos: DeskPosition | null = null;

      for (const sched of state.schedules) {
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

  const activeSubTab: EscalaSubTab =
    !isLeader && subTab === 'montar' ? 'ver' : subTab;

  const handleQuickAddParallelOnSameDay = () => {
    if (!activeSchedule) return;
    const parallelNum = sameDateSchedules.length + 1;
    const createdId = onAddSchedule({
      date: activeSchedule.date,
      title: `${activeSchedule.title} · Sala ${parallelNum}`,
      locationType: 'SALA',
      roomName: `Sala ${parallelNum}`,
    });
    setSelectedScheduleId(createdId);
  };

  const handleCreateSchedule = (e: FormEvent) => {
    e.preventDefault();
    if (!newDate || !newTitle.trim()) return;
    const createdId = onAddSchedule({
      date: newDate,
      title: newTitle.trim(),
      locationType: newLocationType,
      roomName: newLocationType === 'SALA' ? newRoomName.trim() || 'Sala' : undefined,
    });
    setSelectedScheduleId(createdId);
    setNewTitle('');
    setShowNewForm(false);
  };

  const subTabs: { id: EscalaSubTab; label: string; count?: number }[] = [
    { id: 'ver', label: 'Próximas' },
    ...(isLeader ? [{ id: 'montar' as const, label: 'Montar escala' }] : []),
    { id: 'arquivados', label: 'Arquivadas', count: archivedSchedules.length },
  ];

  const showSelector =
    activeSubTab !== 'arquivados' &&
    (upcomingSchedules.length > 0 || (activeSubTab === 'montar' && isLeader));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title">Escalas</h1>

        <div
          role="group"
          aria-label="Visualização das escalas"
          className={`grid w-full gap-0.5 rounded-lg border border-line bg-sunken p-0.5 sm:inline-flex sm:w-auto ${
            isLeader ? 'grid-cols-3' : 'grid-cols-2'
          }`}
        >
          {subTabs.map((tab) => {
            const selected = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setSubTab(tab.id)}
                className={`inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors sm:min-h-9 ${
                  selected ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="font-mono-tech text-xs text-ink-3">{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Seletor de escalas programadas (inclui eventos paralelos na mesma data) */}
      {showSelector && (
        <div
          role="group"
          aria-label="Escalas programadas"
          className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
        >
          {upcomingSchedules.map((sched) => {
            const isSelected = activeSchedule?.id === sched.id;
            return (
              <button
                key={sched.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedScheduleId(sched.id)}
                className={`flex min-h-11 w-52 shrink-0 flex-col items-start justify-center gap-0.5 rounded-lg border px-3 py-1.5 text-left transition-colors sm:w-56 ${
                  isSelected
                    ? 'border-accent bg-accent/10'
                    : 'border-line bg-surface hover:bg-ink/5'
                }`}
              >
                <span className="flex w-full items-center justify-between gap-2 text-xs text-ink-3">
                  <span className="font-mono-tech">{formatDateBr(sched.date)}</span>
                  <span className="truncate">
                    {getLocationLabel(sched.locationType, sched.roomName)}
                  </span>
                </span>
                <span className="w-full truncate text-sm font-medium text-ink">{sched.title}</span>
              </button>
            );
          })}

          {activeSubTab === 'montar' && isLeader && (
            <button
              type="button"
              aria-expanded={showNewForm}
              onClick={() => setShowNewForm((prev) => !prev)}
              className="inline-flex min-h-11 w-40 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 text-sm font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Novo evento
            </button>
          )}
        </div>
      )}

      {/* Novo evento (pode coincidir com a data de outro evento) */}
      {activeSubTab === 'montar' && isLeader && showNewForm && (
        <form onSubmit={handleCreateSchedule} className={CARD}>
          <div className={CARD_HEADER}>
            <h2 className="section-title">Novo evento</h2>
            <p className="mt-0.5 text-xs text-ink-3">
              Pode ser criado na mesma data de outro evento, em outra sala.
            </p>
          </div>

          <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className={LABEL}>Data</span>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className={`${FIELD} font-mono-tech`}
              />
            </label>

            <label className="block">
              <span className={LABEL}>Nome do evento</span>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex.: Culto de jovens"
                className={FIELD}
              />
            </label>

            <label className="block">
              <span className={LABEL}>Local</span>
              <select
                value={newLocationType}
                onChange={(e) => setNewLocationType(e.target.value as ScheduleLocationType)}
                className={FIELD}
              >
                <option value="AUDITORIO_PRINCIPAL">Auditório principal (6 posições)</option>
                <option value="SALA">Sala (Principal e Retorno)</option>
              </select>
            </label>

            {newLocationType === 'SALA' && (
              <label className="block">
                <span className={LABEL}>Nome da sala</span>
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Ex.: Sala 2"
                  className={FIELD}
                />
              </label>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setShowNewForm(false)} className={BTN_SECONDARY}>
              Cancelar
            </button>
            <button type="submit" className={BTN_PRIMARY}>
              Criar evento
            </button>
          </div>
        </form>
      )}

      {/* Sem escala programada */}
      {activeSubTab !== 'arquivados' && !activeSchedule && (
        <div className={`${CARD} px-4 py-6 text-center text-sm text-ink-3`}>
          Nenhuma escala programada.
          {isLeader &&
            (activeSubTab === 'montar'
              ? ' Use Novo evento para criar a próxima.'
              : ' Crie um evento em Montar escala.')}
        </div>
      )}

      {/* PRÓXIMAS: posição, pessoa e presença */}
      {activeSubTab === 'ver' && activeSchedule && (() => {
        const isServiceDay = activeSchedule.date === state.serviceDate;
        const confirmedCount = activeSchedule.assignments.filter(
          (a) => a.attendanceStatus === 'CONFIRMED',
        ).length;

        return (
          <section className={CARD} aria-labelledby="escala-atual-titulo">
            <div
              className={`${CARD_HEADER} flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4`}
            >
              <div className="min-w-0">
                <h2 id="escala-atual-titulo" className="section-title truncate">
                  {activeSchedule.title}
                </h2>
                <p className="mt-0.5 text-xs text-ink-3">
                  <span className="font-mono-tech">{formatDateBr(activeSchedule.date)}</span>
                  {' · '}
                  {getLocationLabel(activeSchedule.locationType, activeSchedule.roomName)}
                </p>
              </div>
              <p className="shrink-0 text-xs text-ink-3">
                {plural(activeSchedule.assignments.length, 'posição', 'posições')}
                {' · '}
                {plural(confirmedCount, 'confirmada', 'confirmadas')}
              </p>
            </div>

            <div
              aria-hidden="true"
              className="hidden grid-cols-[8rem_minmax(0,1fr)_auto] gap-x-4 border-b border-line-soft px-4 py-2 text-xs text-ink-3 md:grid"
            >
              <span>Posição</span>
              <span>Pessoa</span>
              <span className="text-right">Presença</span>
            </div>

            <ul className="divide-y divide-line-soft">
              {activeSchedule.assignments.map((assignment) => {
                const pos = DESK_POSITION_INFO[assignment.position];
                const member = members.find((m) => m.id === assignment.userId);
                const isMe = assignment.userId === activeUser.id;
                const status = assignment.attendanceStatus;
                const onDesk = status === 'CONFIRMED' && assignment.servingOnDesk;

                const confirm = () =>
                  onUpdateAttendance(activeSchedule.id, assignment.id, 'CONFIRMED');
                const decline = () =>
                  onUpdateAttendance(activeSchedule.id, assignment.id, 'DECLINED');
                const undo = () =>
                  onUpdateAttendance(activeSchedule.id, assignment.id, 'PENDING');
                const toggleDesk = () =>
                  onToggleServingOnDesk(activeSchedule.id, assignment.id);
                // Entrar na mesa confirma a presença; se o registro já marca a mesa
                // sem presença confirmada, basta confirmar.
                const enterDesk = () =>
                  assignment.servingOnDesk ? confirm() : toggleDesk();

                const canEnterDesk = isMe && isServiceDay && status !== 'DECLINED' && !onDesk;
                const actions: { key: string; label: string; onClick: () => void; primary: boolean }[] =
                  [];
                if (isMe) {
                  if (canEnterDesk) {
                    actions.push({ key: 'entrar', label: 'Entrar na mesa', onClick: enterDesk, primary: true });
                  }
                  if (status !== 'CONFIRMED') {
                    actions.push({
                      key: 'confirmar',
                      label: 'Confirmar presença',
                      onClick: confirm,
                      primary: !canEnterDesk,
                    });
                  }
                  if (onDesk) {
                    actions.push({ key: 'sair', label: 'Sair da mesa', onClick: toggleDesk, primary: false });
                  }
                  if (status !== 'DECLINED') {
                    actions.push({ key: 'ausencia', label: 'Informar ausência', onClick: decline, primary: false });
                  }
                  if (status !== 'PENDING') {
                    actions.push({ key: 'desfazer', label: 'Desfazer resposta', onClick: undo, primary: false });
                  }
                }

                return (
                  <li
                    key={assignment.id}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-3 md:grid-cols-[8rem_minmax(0,1fr)_auto] md:gap-x-4 ${
                      isMe ? 'bg-accent/5' : ''
                    }`}
                  >
                    <span className="col-start-1 row-start-1 text-xs text-ink-3 md:text-sm md:font-medium md:text-ink-2">
                      {pos.label}
                    </span>

                    <span className="col-start-1 row-start-2 flex min-w-0 items-center gap-2 md:col-start-2 md:row-start-1">
                      <span className="truncate text-sm font-medium text-ink">
                        {member?.name ?? 'A definir'}
                      </span>
                      {isMe && (
                        <span className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">
                          Você
                        </span>
                      )}
                    </span>

                    <span className="col-start-2 row-span-2 row-start-1 flex flex-col items-end gap-1 justify-self-end md:col-start-3 md:row-span-1 md:flex-row md:items-center md:gap-1.5">
                      <PresenceBadge status={status} />
                      {onDesk && <OnDeskBadge />}
                    </span>

                    {actions.length > 0 && (
                      <div className="col-span-2 row-start-3 mt-2.5 flex flex-wrap gap-2 md:col-span-2 md:col-start-2 md:row-start-2 md:mt-2">
                        {actions.map((action) => (
                          <button
                            key={action.key}
                            type="button"
                            onClick={action.onClick}
                            className={`${action.primary ? BTN_PRIMARY : BTN_SECONDARY} grow basis-32 md:grow-0 md:basis-auto`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })()}

      {/* MONTAR ESCALA (somente liderança) */}
      {activeSubTab === 'montar' && isLeader && activeSchedule && (
        <div className="space-y-4">
          <section className={CARD} aria-labelledby="montar-escala-titulo">
            <div
              className={`${CARD_HEADER} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
            >
              <div className="min-w-0">
                <h2 id="montar-escala-titulo" className="section-title">
                  Montar escala
                </h2>
                <p className="mt-0.5 text-xs text-ink-3">
                  <span className="font-mono-tech">{formatDateBr(activeSchedule.date)}</span>
                  {' · '}
                  {getLocationLabel(activeSchedule.locationType, activeSchedule.roomName)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleQuickAddParallelOnSameDay}
                  title="Cria um evento paralelo em outra sala, na mesma data"
                  className={`${BTN_SECONDARY} grow sm:grow-0`}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Adicionar sala
                </button>
                <button
                  type="button"
                  onClick={() => onToggleArchiveSchedule(activeSchedule.id, true)}
                  className={`${BTN_SECONDARY} grow sm:grow-0`}
                >
                  <Archive className="h-4 w-4" aria-hidden="true" />
                  Arquivar escala
                </button>
              </div>
            </div>

            <div className="space-y-4 border-b border-line px-4 py-4">
              {sameDateSchedules.length > 1 && (
                <div>
                  <p className={LABEL}>Eventos nesta data</p>
                  <div className="flex flex-wrap gap-2">
                    {sameDateSchedules.map((sd) => {
                      const isCurr = sd.id === activeSchedule.id;
                      return (
                        <button
                          key={sd.id}
                          type="button"
                          aria-pressed={isCurr}
                          onClick={() => setSelectedScheduleId(sd.id)}
                          className={`inline-flex min-h-11 max-w-full items-center rounded-lg border px-3 text-sm transition-colors lg:min-h-9 ${
                            isCurr
                              ? 'border-accent bg-accent/10 font-medium text-ink'
                              : 'border-line text-ink-2 hover:bg-ink/5'
                          }`}
                        >
                          <span className="truncate">
                            {getLocationLabel(sd.locationType, sd.roomName)} · {sd.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className={LABEL}>Nome do evento</span>
                  <input
                    type="text"
                    value={activeSchedule.title}
                    onChange={(e) =>
                      onUpdateScheduleDetails(activeSchedule.id, { title: e.target.value })
                    }
                    placeholder="Ex.: Culto de jovens"
                    className={FIELD}
                  />
                </label>

                <label className="block">
                  <span className={LABEL}>Local</span>
                  <select
                    value={activeSchedule.locationType}
                    onChange={(e) =>
                      onUpdateScheduleDetails(activeSchedule.id, {
                        locationType: e.target.value as ScheduleLocationType,
                        roomName:
                          e.target.value === 'SALA'
                            ? activeSchedule.roomName || 'Sala 2'
                            : undefined,
                      })
                    }
                    className={FIELD}
                  >
                    <option value="AUDITORIO_PRINCIPAL">Auditório principal</option>
                    <option value="SALA">Sala</option>
                  </select>
                </label>

                {activeSchedule.locationType === 'SALA' && (
                  <label className="block">
                    <span className={LABEL}>Nome da sala</span>
                    <input
                      type="text"
                      value={activeSchedule.roomName || ''}
                      onChange={(e) =>
                        onUpdateScheduleDetails(activeSchedule.id, { roomName: e.target.value })
                      }
                      placeholder="Ex.: Sala 2"
                      className={FIELD}
                    />
                  </label>
                )}
              </div>

              <div>
                <p className={LABEL}>Posições neste evento</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_POSITIONS.map((pos) => {
                    const active = activeSchedule.assignments.some((a) => a.position === pos);
                    const Icon = active ? Check : Plus;
                    return (
                      <button
                        key={pos}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onTogglePositionInSchedule(activeSchedule.id, pos)}
                        className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors lg:min-h-9 ${
                          active
                            ? 'border-accent/40 bg-accent/10 font-medium text-ink'
                            : 'border-dashed border-line-strong text-ink-3 hover:bg-ink/5 hover:text-ink'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${active ? 'text-accent' : ''}`}
                          aria-hidden="true"
                        />
                        {DESK_POSITION_INFO[pos].label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="hidden grid-cols-[minmax(0,1fr)_18rem] gap-x-4 border-b border-line-soft px-4 py-2 text-xs text-ink-3 md:grid"
            >
              <span>Posição</span>
              <span>Pessoa escalada</span>
            </div>

            <ul className="divide-y divide-line-soft">
              {activeSchedule.assignments.map((asg) => {
                const pos = DESK_POSITION_INFO[asg.position];
                return (
                  <li
                    key={asg.id}
                    className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_18rem] md:items-center md:gap-x-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-ink">{pos.label}</span>
                        <PresenceBadge status={asg.attendanceStatus} />
                        {asg.attendanceStatus === 'CONFIRMED' && asg.servingOnDesk && (
                          <OnDeskBadge />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-ink-4">{pos.responsibility}</p>
                    </div>

                    <select
                      aria-label={`Pessoa escalada em ${pos.label}`}
                      value={asg.userId}
                      onChange={(e) =>
                        onChangeAssignmentMember(activeSchedule.id, asg.id, e.target.value)
                      }
                      className={FIELD}
                    >
                      {members.map((m) => {
                        const stat = historyStats.find((h) => h.member.id === m.id);
                        const countInPos = stat ? stat.counts[asg.position] : 0;
                        return (
                          <option key={m.id} value={m.id}>
                            {m.name} ({plural(countInPos, 'vez', 'vezes')} em {pos.short})
                          </option>
                        );
                      })}
                    </select>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={CARD} aria-labelledby="rodizio-titulo">
            <div className={CARD_HEADER}>
              <h2 id="rodizio-titulo" className="section-title">
                Rodízio por posição
              </h2>
              <p className="mt-0.5 text-xs text-ink-3">
                Quantidade de cultos servidos em cada posição nas escalas registradas.
              </p>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line-soft text-xs text-ink-3">
                    <th scope="col" className="px-4 py-2 text-left font-medium">
                      Pessoa
                    </th>
                    {ALL_POSITIONS.map((pos) => (
                      <th key={pos} scope="col" className="px-3 py-2 text-center font-medium">
                        {DESK_POSITION_INFO[pos].short}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2 text-center font-medium">
                      Total
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      Última escala
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {historyStats.map((row) => (
                    <tr key={row.member.id} className="hover:bg-ink/5">
                      <th scope="row" className="px-4 py-2 text-left font-medium text-ink">
                        {row.member.name}
                      </th>
                      {ALL_POSITIONS.map((pos) => (
                        <td
                          key={pos}
                          className={`font-mono-tech px-3 py-2 text-center ${
                            row.counts[pos] === 0 ? 'text-ink-4' : 'text-ink-2'
                          }`}
                        >
                          {row.counts[pos]}
                        </td>
                      ))}
                      <td className="font-mono-tech px-3 py-2 text-center font-semibold text-ink">
                        {row.total}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-xs text-ink-3">
                        {row.lastServedDate ? (
                          <>
                            <span className="font-mono-tech">
                              {formatDateBr(row.lastServedDate)}
                            </span>
                            {row.lastServedPos &&
                              ` · ${DESK_POSITION_INFO[row.lastServedPos].short}`}
                          </>
                        ) : (
                          'Sem registro'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line-soft md:hidden">
              {historyStats.map((row) => (
                <li key={row.member.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-ink">
                      {row.member.name}
                    </span>
                    <span className="shrink-0 text-xs text-ink-3">
                      Total{' '}
                      <span className="font-mono-tech font-semibold text-ink">{row.total}</span>
                    </span>
                  </div>
                  <dl className="mt-1.5 grid grid-cols-3 gap-x-4 gap-y-0.5 text-xs">
                    {ALL_POSITIONS.map((pos) => (
                      <div key={pos} className="flex justify-between gap-1">
                        <dt className="truncate text-ink-3">{DESK_POSITION_INFO[pos].short}</dt>
                        <dd
                          className={`font-mono-tech ${
                            row.counts[pos] === 0 ? 'text-ink-4' : 'text-ink-2'
                          }`}
                        >
                          {row.counts[pos]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-1.5 text-xs text-ink-4">
                    Última escala:{' '}
                    {row.lastServedDate ? (
                      <>
                        <span className="font-mono-tech">{formatDateBr(row.lastServedDate)}</span>
                        {row.lastServedPos &&
                          ` · ${DESK_POSITION_INFO[row.lastServedPos].short}`}
                      </>
                    ) : (
                      'sem registro'
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* ARQUIVADAS */}
      {activeSubTab === 'arquivados' &&
        (archivedSchedules.length === 0 ? (
          <div className={`${CARD} px-4 py-6 text-center text-sm text-ink-3`}>
            Nenhuma escala arquivada. As escalas de datas passadas e as arquivadas pela liderança
            aparecem aqui.
          </div>
        ) : (
          <section className={CARD} aria-label="Escalas arquivadas">
            <ul className="divide-y divide-line">
              {archivedSchedules.map((sched) => (
                <li key={sched.id} className="px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-ink">{sched.title}</h3>
                      <p className="mt-0.5 text-xs text-ink-3">
                        <span className="font-mono-tech">{formatDateBr(sched.date)}</span>
                        {' · '}
                        {getLocationLabel(sched.locationType, sched.roomName)}
                      </p>
                    </div>

                    {isLeader && (
                      <button
                        type="button"
                        onClick={() => {
                          onToggleArchiveSchedule(sched.id, false);
                          setSelectedScheduleId(sched.id);
                          setSubTab('ver');
                        }}
                        className={`${BTN_SECONDARY} self-start`}
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        Reativar escala
                      </button>
                    )}
                  </div>

                  <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {sched.assignments.map((asg) => {
                      const member = members.find((m) => m.id === asg.userId);
                      return (
                        <div key={asg.id} className="flex min-w-0 items-baseline gap-2">
                          <dt className="w-20 shrink-0 text-xs text-ink-3">
                            {DESK_POSITION_INFO[asg.position].short}
                          </dt>
                          <dd className="truncate text-ink-2">{member?.name ?? 'A definir'}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
