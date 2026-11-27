import { useMemo, useState } from 'react';
import { Check, Lock, Trash2, Unlock } from 'lucide-react';
import type {
  MemberUser,
  ProgrammingTeam,
  Role,
  ScreenCode,
  ServiceState,
} from '../types/portal';

type MinistryChoice = 'PROJECAO' | 'MUSICA' | 'PROGRAMACAO';

export interface NewUserPayload {
  name: string;
  senibId: string;
  pin: string;
  ministryChoice: MinistryChoice;
  programmingTeam?: ProgrammingTeam;
  isLeader: boolean;
  isCaptain: boolean;
}

interface ConfiguracoesTabProps {
  state: ServiceState;
  currentUserId: string;
  isLeader: boolean;
  onUpdateScreen: (code: ScreenCode, widthPx: number, heightPx: number) => void;
  onToggleFreeze: (reason?: string) => void;
  onAddMember: (payload: NewUserPayload) => { ok: boolean; error?: string };
  onUpdateMember: (userId: string, updater: (m: MemberUser) => MemberUser) => void;
  onRemoveMember: (userId: string) => void;
  onResetDemo: () => void;
}

function getMemberMinistry(m: MemberUser): MinistryChoice {
  if (m.roles.includes('MUSIC')) return 'MUSICA';
  if (m.roles.includes('PROGRAMMING')) return 'PROGRAMACAO';
  return 'PROJECAO';
}

const MINISTRY_LABEL: Record<MinistryChoice, string> = {
  PROJECAO: 'Projeção',
  MUSICA: 'Música',
  PROGRAMACAO: 'Programação',
};

/* Classes compartilhadas */
const sectionClass = 'rounded-xl border border-line bg-surface';
const sectionHeadClass = 'border-b border-line-soft px-4 py-3 sm:px-5';
const labelClass = 'mb-1 block text-xs font-medium text-ink-3';
const fieldClass =
  'min-h-11 w-full rounded-lg border border-line bg-sunken px-3 text-base text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none disabled:opacity-60 sm:min-h-10 sm:text-sm';
const secondaryBtnClass =
  'btn-rb-surface inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-3 text-sm font-medium text-ink-2 sm:min-h-9';
const dangerBtnClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-danger/40 px-3 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 sm:min-h-9';

const roleToggleClass = (on: boolean) =>
  `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors sm:min-h-10 sm:w-32 ${
    on
      ? 'border-accent/40 bg-accent/10 text-accent'
      : 'border-line text-ink-3 hover:bg-ink/5 hover:text-ink'
  }`;

export function ConfiguracoesTab({
  state,
  currentUserId,
  isLeader,
  onUpdateScreen,
  onToggleFreeze,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
  onResetDemo,
}: ConfiguracoesTabProps) {
  const [freezeReason, setFreezeReason] = useState('');
  const [name, setName] = useState('');
  const [senibId, setSenibId] = useState('');
  const [pin, setPin] = useState('1234');
  const [ministryChoice, setMinistryChoice] = useState<MinistryChoice>('PROJECAO');
  const [programmingTeam, setProgrammingTeam] = useState<ProgrammingTeam>('ALPHA');
  const [newIsLeader, setNewIsLeader] = useState(false);
  const [newIsCaptain, setNewIsCaptain] = useState(false);
  const [formMsg, setFormMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(
    null,
  );
  const [filterMinistry, setFilterMinistry] = useState<'ALL' | MinistryChoice>('ALL');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const counts = useMemo(() => {
    const active = state.members.filter((m) => m.active);
    const projecao = active.filter((m) => getMemberMinistry(m) === 'PROJECAO').length;
    const musica = active.filter((m) => getMemberMinistry(m) === 'MUSICA').length;
    const programacao = active.filter((m) => getMemberMinistry(m) === 'PROGRAMACAO').length;
    return { total: active.length, projecao, musica, programacao };
  }, [state.members]);

  const filteredMembers = useMemo(() => {
    if (filterMinistry === 'ALL') return state.members;
    return state.members.filter((m) => getMemberMinistry(m) === filterMinistry);
  }, [state.members, filterMinistry]);

  const filters: { key: 'ALL' | MinistryChoice; label: string; count: number }[] = [
    { key: 'ALL', label: 'Todos', count: counts.total },
    { key: 'PROJECAO', label: 'Projeção', count: counts.projecao },
    { key: 'MUSICA', label: 'Música', count: counts.musica },
    { key: 'PROGRAMACAO', label: 'Programação', count: counts.programacao },
  ];

  const aspectRatios = Array.from(new Set(state.screens.map((s) => s.aspectRatio))).join(', ');
  const recentLogs = state.auditLogs.slice(0, 12);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    const res = onAddMember({
      name: name.trim(),
      senibId: senibId.trim(),
      pin: pin.trim(),
      ministryChoice,
      programmingTeam: ministryChoice === 'PROGRAMACAO' ? programmingTeam : undefined,
      isLeader: newIsLeader,
      isCaptain: ministryChoice === 'PROJECAO' && newIsCaptain,
    });
    if (!res.ok) {
      setFormMsg({ tone: 'danger', text: res.error || 'Não foi possível cadastrar o usuário.' });
      return;
    }
    setName('');
    setSenibId('');
    setPin('1234');
    setNewIsLeader(false);
    setNewIsCaptain(false);
    setFormMsg({ tone: 'ok', text: 'Usuário cadastrado.' });
  };

  const handleSwitchMinistry = (member: MemberUser, nextMin: MinistryChoice) => {
    onUpdateMember(member.id, (m) => {
      const keepAdmin = m.roles.includes('ADMIN');
      const keepCaptain = m.roles.includes('CAPTAIN');
      let roles: Role[] = [];
      let ministry = 'Projeção';
      let progTeam: ProgrammingTeam | undefined = undefined;

      if (nextMin === 'MUSICA') {
        roles = ['MUSIC', 'MEMBER'];
        ministry = 'Música';
      } else if (nextMin === 'PROGRAMACAO') {
        progTeam = m.programmingTeam || 'ALPHA';
        const label = progTeam === 'ALPHA' ? 'Alpha' : progTeam === 'BRAVO' ? 'Bravo' : 'Charlie';
        roles = ['PROGRAMMING', 'MEMBER'];
        ministry = `Programação ${label}`;
      } else {
        roles = keepCaptain ? ['CAPTAIN', 'MEMBER'] : ['MEMBER'];
        ministry = keepAdmin ? 'Liderança / Projeção' : 'Projeção';
      }

      if (keepAdmin && !roles.includes('ADMIN')) {
        roles = ['ADMIN', ...roles];
      }
      return { ...m, ministry, roles, programmingTeam: progTeam };
    });
  };

  const handleToggleRoleFlag = (member: MemberUser, flag: 'ADMIN' | 'CAPTAIN') => {
    onUpdateMember(member.id, (m) => {
      const hasFlag = m.roles.includes(flag);
      const nextRoles: Role[] = hasFlag
        ? m.roles.filter((r) => r !== flag)
        : [flag, ...m.roles.filter((r) => r !== flag)];
      if (!nextRoles.includes('MEMBER')) nextRoles.push('MEMBER');

      const min = getMemberMinistry(m);
      let ministry = m.ministry;
      if (min === 'PROJECAO') {
        ministry = nextRoles.includes('ADMIN') ? 'Liderança / Projeção' : 'Projeção';
      }
      return { ...m, roles: nextRoles, ministry };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="page-title">Configurações</h1>
        <span className="inline-flex w-fit items-center rounded-md border border-line px-2 py-0.5 text-xs font-medium text-ink-3">
          {isLeader ? 'Acesso de liderança' : 'Somente leitura'}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Envios da semana */}
        <section aria-labelledby="cfg-envios" className={sectionClass}>
          <div className={`flex items-center justify-between gap-3 ${sectionHeadClass}`}>
            <h2 id="cfg-envios" className="section-title">
              Envios da semana
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${
                state.isFrozen
                  ? 'border-attn/40 bg-attn/10 text-attn'
                  : 'border-ok/40 bg-ok/10 text-ok'
              }`}
            >
              {state.isFrozen ? 'Travados' : 'Abertos'}
            </span>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            <p className="text-sm text-ink-3">
              {state.isFrozen ? (
                'Novos envios estão bloqueados até a reabertura.'
              ) : (
                <>
                  Prazo de envio: <span className="text-ink-2">{state.cutoffLabel}</span>.
                </>
              )}
            </p>

            {isLeader && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label htmlFor="cfg-motivo" className={labelClass}>
                    Motivo (opcional)
                  </label>
                  <input
                    id="cfg-motivo"
                    type="text"
                    value={freezeReason}
                    onChange={(e) => setFreezeReason(e.target.value)}
                    placeholder="Registrado no histórico"
                    className={fieldClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onToggleFreeze(freezeReason.trim() || undefined);
                    setFreezeReason('');
                  }}
                  className="btn-rb-primary inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white sm:min-h-10"
                >
                  {state.isFrozen ? (
                    <Unlock className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>{state.isFrozen ? 'Reabrir envios' : 'Travar envios da semana'}</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Resolução dos telões */}
        <section aria-labelledby="cfg-teloes" className={sectionClass}>
          <div className={`flex items-baseline justify-between gap-3 ${sectionHeadClass}`}>
            <h2 id="cfg-teloes" className="section-title">
              Resolução dos telões
            </h2>
            {aspectRatios && (
              <span className="text-xs text-ink-4">
                Proporção <span className="font-mono-tech">{aspectRatios}</span>
              </span>
            )}
          </div>

          <div
            aria-hidden="true"
            className="hidden px-5 pt-3 text-xs font-medium text-ink-3 sm:grid sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:gap-3"
          >
            <span>Telão</span>
            <span className="text-right">Largura (px)</span>
            <span className="text-right">Altura (px)</span>
          </div>

          <div className="divide-y divide-line-soft sm:divide-y-0 sm:pb-3">
            {state.screens.map((scr) => (
              <div
                key={scr.code}
                className="grid grid-cols-2 items-end gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:items-center sm:gap-3 sm:px-5 sm:py-2"
              >
                <p className="col-span-2 text-sm font-medium text-ink sm:col-span-1">
                  {scr.label}
                </p>
                <label className="block">
                  <span className={`${labelClass} sm:sr-only`}>Largura (px)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    disabled={!isLeader}
                    aria-label={`Largura em pixels, ${scr.label}`}
                    value={scr.widthPx}
                    onChange={(e) =>
                      onUpdateScreen(scr.code, Number(e.target.value) || scr.widthPx, scr.heightPx)
                    }
                    className={`${fieldClass} font-mono-tech text-right`}
                  />
                </label>
                <label className="block">
                  <span className={`${labelClass} sm:sr-only`}>Altura (px)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    disabled={!isLeader}
                    aria-label={`Altura em pixels, ${scr.label}`}
                    value={scr.heightPx}
                    onChange={(e) =>
                      onUpdateScreen(scr.code, scr.widthPx, Number(e.target.value) || scr.heightPx)
                    }
                    className={`${fieldClass} font-mono-tech text-right`}
                  />
                </label>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Usuários e permissões */}
      <section aria-labelledby="cfg-usuarios" className={sectionClass}>
        <div
          className={`flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between ${sectionHeadClass}`}
        >
          <h2 id="cfg-usuarios" className="section-title">
            Usuários e permissões
          </h2>
          <p className="text-xs text-ink-3">
            Ativos <span className="font-mono-tech font-semibold text-ink">{counts.total}</span>
          </p>
        </div>

        {isLeader && (
          <form
            onSubmit={handleCreateUser}
            aria-labelledby="cfg-novo"
            className="space-y-3 border-b border-line-soft p-4 sm:p-5"
          >
            <h3 id="cfg-novo" className="text-sm font-semibold text-ink">
              Novo usuário
            </h3>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
              <div className="sm:col-span-2 lg:col-span-4">
                <label htmlFor="cfg-nome" className={labelClass}>
                  Nome completo
                </label>
                <input
                  id="cfg-nome"
                  type="text"
                  required
                  autoComplete="off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Ana Paula Souza"
                  className={fieldClass}
                />
              </div>

              <div className="lg:col-span-2">
                <label htmlFor="cfg-senib" className={labelClass}>
                  Matrícula SENIB
                </label>
                <input
                  id="cfg-senib"
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  value={senibId}
                  onChange={(e) => setSenibId(e.target.value)}
                  placeholder="Ex.: 1301"
                  className={`${fieldClass} font-mono-tech`}
                />
              </div>

              <div className="lg:col-span-2">
                <label htmlFor="cfg-pin" className={labelClass}>
                  PIN (4 dígitos)
                </label>
                <input
                  id="cfg-pin"
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  pattern="\d{4}"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className={`${fieldClass} font-mono-tech`}
                />
              </div>

              <div className="lg:col-span-2">
                <label htmlFor="cfg-ministerio" className={labelClass}>
                  Ministério
                </label>
                <select
                  id="cfg-ministerio"
                  value={ministryChoice}
                  onChange={(e) => setMinistryChoice(e.target.value as MinistryChoice)}
                  className={fieldClass}
                >
                  <option value="PROJECAO">Projeção</option>
                  <option value="MUSICA">Música</option>
                  <option value="PROGRAMACAO">Programação</option>
                </select>
              </div>

              {ministryChoice === 'PROGRAMACAO' && (
                <div className="lg:col-span-2">
                  <label htmlFor="cfg-equipe" className={labelClass}>
                    Equipe
                  </label>
                  <select
                    id="cfg-equipe"
                    value={programmingTeam}
                    onChange={(e) => setProgrammingTeam(e.target.value as ProgrammingTeam)}
                    className={fieldClass}
                  >
                    <option value="ALPHA">Equipe Alpha</option>
                    <option value="BRAVO">Equipe Bravo</option>
                    <option value="CHARLIE">Equipe Charlie</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-x-5 gap-y-1 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink-2 sm:min-h-10">
                <input
                  type="checkbox"
                  checked={newIsLeader}
                  onChange={(e) => setNewIsLeader(e.target.checked)}
                  className="h-4 w-4 accent-accent-solid"
                />
                <span>Permissão de liderança</span>
              </label>

              {ministryChoice === 'PROJECAO' && (
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink-2 sm:min-h-10">
                  <input
                    type="checkbox"
                    checked={newIsCaptain}
                    onChange={(e) => setNewIsCaptain(e.target.checked)}
                    className="h-4 w-4 accent-accent-solid"
                  />
                  <span>Capitão de mesa</span>
                </label>
              )}

              <div className="mt-2 flex flex-col-reverse gap-2 sm:ml-auto sm:mt-0 sm:flex-row sm:items-center sm:gap-3">
                {formMsg && (
                  <p
                    role="status"
                    className={`text-xs font-medium ${
                      formMsg.tone === 'ok' ? 'text-ok' : 'text-danger'
                    }`}
                  >
                    {formMsg.text}
                  </p>
                )}
                <button
                  type="submit"
                  className="btn-rb-primary inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white sm:min-h-10"
                >
                  Cadastrar usuário
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Filtro por ministério */}
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h3 className="text-sm font-semibold text-ink">Cadastrados</h3>
          <div
            role="group"
            aria-label="Filtrar por ministério"
            className="grid grid-cols-2 gap-0.5 rounded-lg border border-line bg-sunken p-0.5 sm:inline-flex"
          >
            {filters.map((f) => {
              const selected = filterMinistry === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFilterMinistry(f.key)}
                  className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors sm:min-h-8 ${
                    selected ? 'bg-surface text-ink ring-1 ring-line' : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="font-mono-tech text-xs text-ink-4">{f.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de usuários */}
        {filteredMembers.length === 0 ? (
          <p className="border-t border-line-soft px-4 py-6 text-center text-sm text-ink-3 sm:px-5">
            {filterMinistry === 'ALL'
              ? 'Nenhum usuário cadastrado.'
              : `Nenhum usuário em ${MINISTRY_LABEL[filterMinistry]}.`}
          </p>
        ) : (
          <ul className="divide-y divide-line-soft border-t border-line-soft">
            {filteredMembers.map((member) => {
              const currentMin = getMemberMinistry(member);
              const memberIsLeader = member.roles.includes('ADMIN');
              const memberIsCaptain = member.roles.includes('CAPTAIN');
              const isSelf = member.id === currentUserId;
              const confirming = confirmRemoveId === member.id;

              return (
                <li key={member.id} className="px-4 py-3 sm:px-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-medium text-ink">{member.name}</span>
                        {isSelf && <span className="text-xs text-ink-4">(você)</span>}
                        {!isLeader && memberIsLeader && (
                          <span className="rounded border border-line px-1.5 text-[11px] font-medium text-ink-2">
                            Liderança
                          </span>
                        )}
                        {!isLeader && memberIsCaptain && (
                          <span className="rounded border border-line px-1.5 text-[11px] font-medium text-ink-2">
                            Capitão
                          </span>
                        )}
                        {!member.active && (
                          <span className="rounded border border-line px-1.5 text-[11px] font-medium text-ink-4">
                            Inativo
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-ink-4">
                        <span className="font-mono-tech">SENIB {member.senibId}</span>
                        <span aria-hidden="true"> · </span>
                        {member.ministry}
                      </p>
                    </div>

                    {isLeader && (
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2 sm:flex sm:items-center lg:shrink-0">
                        <select
                          aria-label={`Ministério de ${member.name}`}
                          value={currentMin}
                          onChange={(e) =>
                            handleSwitchMinistry(member, e.target.value as MinistryChoice)
                          }
                          className={`${fieldClass} col-span-3 sm:w-40`}
                        >
                          <option value="PROJECAO">Projeção</option>
                          <option value="MUSICA">Música</option>
                          <option value="PROGRAMACAO">Programação</option>
                        </select>

                        <button
                          type="button"
                          aria-pressed={memberIsCaptain}
                          aria-label={`Capitão: ${member.name}`}
                          onClick={() => handleToggleRoleFlag(member, 'CAPTAIN')}
                          className={roleToggleClass(memberIsCaptain)}
                        >
                          {memberIsCaptain && <Check className="h-4 w-4" aria-hidden="true" />}
                          <span>Capitão</span>
                        </button>

                        <button
                          type="button"
                          aria-pressed={memberIsLeader}
                          aria-label={`Liderança: ${member.name}`}
                          onClick={() => handleToggleRoleFlag(member, 'ADMIN')}
                          className={roleToggleClass(memberIsLeader)}
                        >
                          {memberIsLeader && <Check className="h-4 w-4" aria-hidden="true" />}
                          <span>Liderança</span>
                        </button>

                        {isSelf ? (
                          <span aria-hidden="true" className="hidden sm:block sm:w-10" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(confirming ? null : member.id)}
                            title="Remover usuário"
                            aria-label={`Remover ${member.name}`}
                            aria-expanded={confirming}
                            className={`inline-flex size-11 items-center justify-center rounded-lg border transition-colors sm:size-10 ${
                              confirming
                                ? 'border-danger/40 bg-danger/10 text-danger'
                                : 'border-line text-ink-3 hover:border-danger/40 hover:text-danger'
                            }`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isLeader && confirming && (
                    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-ink-2">
                        Remover <span className="font-medium text-ink">{member.name}</span> do
                        portal? Esta ação não pode ser desfeita.
                      </p>
                      <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(null)}
                          className={secondaryBtnClass}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onRemoveMember(member.id);
                            setConfirmRemoveId(null);
                          }}
                          className={dangerBtnClass}
                        >
                          Remover usuário
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Histórico */}
      <section aria-labelledby="cfg-historico" className={sectionClass}>
        <div className={`flex items-baseline justify-between gap-3 ${sectionHeadClass}`}>
          <h2 id="cfg-historico" className="section-title">
            Histórico recente
          </h2>
          <span className="text-xs text-ink-4">Últimas 12 alterações</span>
        </div>

        {recentLogs.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-3 sm:px-5">
            Nenhuma alteração registrada.
          </p>
        ) : (
          <ol className="divide-y divide-line-soft">
            {recentLogs.map((log) => (
              <li
                key={log.id}
                className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-baseline sm:px-5"
              >
                <span className="font-mono-tech text-xs text-ink-4">{log.timestamp}</span>
                <p className="min-w-0 text-ink-3">
                  <span className="font-medium text-ink">{log.actorName}</span> {log.detail}
                  {log.reason && <span className="text-ink-4"> Motivo: {log.reason}</span>}
                </p>
                <span className="col-start-2 text-xs text-ink-4 sm:col-start-auto sm:text-right">
                  {log.action}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Dados de demonstração (ação destrutiva, só Liderança) */}
      {isLeader && (
        <section aria-labelledby="cfg-demo" className={`${sectionClass} p-4 sm:p-5`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 id="cfg-demo" className="section-title">
                Dados de demonstração
              </h2>
              <p className="mt-0.5 text-sm text-ink-3">
                Descarta as alterações salvas neste navegador, inclusive mídias enviadas, e volta
                ao conteúdo inicial.
              </p>
            </div>

            {confirmReset ? (
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <p className="text-xs font-medium text-danger">Esta ação não pode ser desfeita.</p>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className={secondaryBtnClass}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmReset(false);
                      onResetDemo();
                    }}
                    className={dangerBtnClass}
                  >
                    Confirmar restauração
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className={`${dangerBtnClass} shrink-0`}
              >
                Restaurar dados de demonstração
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
