import { useMemo, useState } from 'react';
import { Lock, ShieldCheck, Trash2, Unlock, UserPlus, Users } from 'lucide-react';
import type {
  MemberUser,
  ProgrammingTeam,
  Role,
  ScreenCode,
  ServiceState,
} from '../types/portal';
import { AnimatedCounter } from './reactbits/AnimatedCounter';
import { SpotlightCard } from './reactbits/SpotlightCard';

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
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [filterMinistry, setFilterMinistry] = useState<'ALL' | MinistryChoice>('ALL');

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
      setFormMsg(res.error || 'Não foi possível cadastrar.');
      return;
    }
    setName('');
    setSenibId('');
    setPin('1234');
    setNewIsLeader(false);
    setNewIsCaptain(false);
    setFormMsg('Usuário cadastrado com sucesso.');
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
    <div className="space-y-8">
      <div className="flex flex-col gap-2 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Usuários, permissões por ministério, resoluções dos telões e prazo de envio.
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${
            isLeader
              ? 'border-[#F5C41E]/35 bg-[#F5C41E]/10 text-[#F5C41E]'
              : 'border-white/12 text-zinc-400'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>{isLeader ? 'Status: Liderança' : 'Somente leitura'}</span>
        </span>
      </div>

      {/* Equipe e permissões */}
      <section className="rounded-xl border border-white/10 bg-[#12141A] p-5 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Users className="h-4 w-4 text-[#0095FF]" />
              <span>Usuários e Permissões</span>
            </h2>
            <p className="mt-0.5 text-sm text-zinc-400">
              Visualize quantas pessoas estão em cada ministério e gerencie acessos.
            </p>
          </div>
          <span className="text-xs font-medium text-zinc-400">
            Total ativos: <AnimatedCounter value={counts.total} className="text-white" />
          </span>
        </div>

        {/* Contagem por ministério */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SpotlightCard className="rounded-lg border border-white/10 bg-[#0B0C0F]">
            <button
              type="button"
              onClick={() => setFilterMinistry(filterMinistry === 'PROJECAO' ? 'ALL' : 'PROJECAO')}
              className={`flex min-h-[56px] w-full items-center justify-between px-4 py-3 text-left transition ${
                filterMinistry === 'PROJECAO' ? 'bg-[#0095FF]/12' : ''
              }`}
            >
              <div>
                <p className="text-xs text-zinc-400">Projeção</p>
                <p className="text-sm font-medium text-white">Mesa & Liderança</p>
              </div>
              <AnimatedCounter
                value={counts.projecao}
                className="text-2xl font-semibold text-[#0095FF]"
              />
            </button>
          </SpotlightCard>

          <SpotlightCard
            spotlightColor="rgba(16, 185, 129, 0.14)"
            className="rounded-lg border border-white/10 bg-[#0B0C0F]"
          >
            <button
              type="button"
              onClick={() => setFilterMinistry(filterMinistry === 'MUSICA' ? 'ALL' : 'MUSICA')}
              className={`flex min-h-[56px] w-full items-center justify-between px-4 py-3 text-left transition ${
                filterMinistry === 'MUSICA' ? 'bg-emerald-500/10' : ''
              }`}
            >
              <div>
                <p className="text-xs text-zinc-400">Música</p>
                <p className="text-sm font-medium text-white">Letras & Louvor</p>
              </div>
              <AnimatedCounter
                value={counts.musica}
                className="text-2xl font-semibold text-emerald-400"
              />
            </button>
          </SpotlightCard>

          <SpotlightCard
            spotlightColor="rgba(245, 196, 30, 0.14)"
            className="rounded-lg border border-white/10 bg-[#0B0C0F]"
          >
            <button
              type="button"
              onClick={() =>
                setFilterMinistry(filterMinistry === 'PROGRAMACAO' ? 'ALL' : 'PROGRAMACAO')
              }
              className={`flex min-h-[56px] w-full items-center justify-between px-4 py-3 text-left transition ${
                filterMinistry === 'PROGRAMACAO' ? 'bg-[#F5C41E]/10' : ''
              }`}
            >
              <div>
                <p className="text-xs text-zinc-400">Programação</p>
                <p className="text-sm font-medium text-white">Alpha, Bravo, Charlie</p>
              </div>
              <AnimatedCounter
                value={counts.programacao}
                className="text-2xl font-semibold text-[#F5C41E]"
              />
            </button>
          </SpotlightCard>
        </div>

        {/* Cadastro de novo usuário (Liderança) */}
        {isLeader && (
          <form
            onSubmit={handleCreateUser}
            className="rounded-xl border border-white/10 bg-[#0B0C0F] p-4 space-y-3"
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <UserPlus className="h-4 w-4 text-[#0095FF]" />
              <span>Cadastrar novo usuário</span>
            </h3>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-400">Nome completo</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Ana Paula"
                  className="min-h-[44px] w-full rounded-lg border border-white/12 bg-[#12141A] px-3 text-base text-white placeholder:text-zinc-600 focus:border-[#0095FF] focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-zinc-400">Matrícula SENIB</span>
                <input
                  type="text"
                  required
                  value={senibId}
                  onChange={(e) => setSenibId(e.target.value)}
                  placeholder="Ex.: 1301"
                  className="font-mono-tech min-h-[44px] w-full rounded-lg border border-white/12 bg-[#12141A] px-3 text-base text-white placeholder:text-zinc-600 focus:border-[#0095FF] focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-zinc-400">PIN (4 dígitos)</span>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="font-mono-tech min-h-[44px] w-full rounded-lg border border-white/12 bg-[#12141A] px-3 text-base text-white focus:border-[#0095FF] focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-zinc-400">Ministério</span>
                <select
                  value={ministryChoice}
                  onChange={(e) => setMinistryChoice(e.target.value as MinistryChoice)}
                  className="min-h-[44px] w-full rounded-lg border border-white/12 bg-[#12141A] px-3 text-base text-white focus:border-[#0095FF] focus:outline-none"
                >
                  <option value="PROJECAO">Projeção</option>
                  <option value="MUSICA">Música</option>
                  <option value="PROGRAMACAO">Programação</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              {ministryChoice === 'PROGRAMACAO' && (
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <span>Equipe:</span>
                  <select
                    value={programmingTeam}
                    onChange={(e) => setProgrammingTeam(e.target.value as ProgrammingTeam)}
                    className="min-h-[44px] rounded-lg border border-white/12 bg-[#12141A] px-3 text-base text-white focus:border-[#0095FF] focus:outline-none"
                  >
                    <option value="ALPHA">Alpha</option>
                    <option value="BRAVO">Bravo</option>
                    <option value="CHARLIE">Charlie</option>
                  </select>
                </label>
              )}

              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={newIsLeader}
                  onChange={(e) => setNewIsLeader(e.target.checked)}
                  className="h-4 w-4 accent-[#F5C41E]"
                />
                <span>Permissão de Liderança</span>
              </label>

              {ministryChoice === 'PROJECAO' && (
                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={newIsCaptain}
                    onChange={(e) => setNewIsCaptain(e.target.checked)}
                    className="h-4 w-4 accent-[#0095FF]"
                  />
                  <span>Capitão de mesa</span>
                </label>
              )}

              <button
                type="submit"
                className="ml-auto inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0095FF] px-4 text-sm font-semibold text-white hover:bg-[#0080DC]"
              >
                <UserPlus className="h-4 w-4" />
                <span>Cadastrar</span>
              </button>
            </div>

            {formMsg && (
              <p className="text-xs font-medium text-[#0095FF]">{formMsg}</p>
            )}
          </form>
        )}

        {/* Lista de usuários */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-400">
              {filterMinistry === 'ALL'
                ? `Todos os cadastrados (${filteredMembers.length})`
                : `Filtrado: ${filterMinistry} (${filteredMembers.length})`}
            </p>
            {filterMinistry !== 'ALL' && (
              <button
                type="button"
                onClick={() => setFilterMinistry('ALL')}
                className="text-xs text-[#0095FF] hover:underline"
              >
                Mostrar todos
              </button>
            )}
          </div>

          <div className="divide-y divide-white/8 rounded-lg border border-white/10 bg-[#0B0C0F]">
            {filteredMembers.map((member) => {
              const currentMin = getMemberMinistry(member);
              const memberIsLeader = member.roles.includes('ADMIN');
              const memberIsCaptain = member.roles.includes('CAPTAIN');
              const isSelf = member.id === currentUserId;

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-white">{member.name}</span>
                      <span className="font-mono-tech rounded border border-white/10 px-1.5 py-0.5 text-[11px] text-zinc-400">
                        SENIB {member.senibId}
                      </span>
                      {memberIsLeader && (
                        <span className="rounded border border-[#F5C41E]/35 bg-[#F5C41E]/10 px-2 py-0.5 text-[11px] font-medium text-[#F5C41E]">
                          Liderança
                        </span>
                      )}
                      {memberIsCaptain && (
                        <span className="rounded border border-[#0095FF]/35 bg-[#0095FF]/10 px-2 py-0.5 text-[11px] font-medium text-[#0095FF]">
                          Capitão
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">{member.ministry}</p>
                  </div>

                  {isLeader && (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`Ministério de ${member.name}`}
                        value={currentMin}
                        onChange={(e) =>
                          handleSwitchMinistry(member, e.target.value as MinistryChoice)
                        }
                        className="min-h-[44px] rounded-lg border border-white/12 bg-[#12141A] px-2.5 text-xs text-white focus:border-[#0095FF] focus:outline-none"
                      >
                        <option value="PROJECAO">Projeção</option>
                        <option value="MUSICA">Música</option>
                        <option value="PROGRAMACAO">Programação</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleToggleRoleFlag(member, 'CAPTAIN')}
                        className={`min-h-[44px] rounded-lg border px-2.5 text-xs font-medium ${
                          memberIsCaptain
                            ? 'border-[#0095FF]/50 bg-[#0095FF]/15 text-[#0095FF]'
                            : 'border-white/12 text-zinc-400 hover:bg-white/5'
                        }`}
                      >
                        Capitão
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleRoleFlag(member, 'ADMIN')}
                        className={`min-h-[44px] rounded-lg border px-2.5 text-xs font-medium ${
                          memberIsLeader
                            ? 'border-[#F5C41E]/50 bg-[#F5C41E]/15 text-[#F5C41E]'
                            : 'border-white/12 text-zinc-400 hover:bg-white/5'
                        }`}
                      >
                        Liderança
                      </button>

                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => onRemoveMember(member.id)}
                          title="Remover usuário"
                          aria-label={`Remover ${member.name}`}
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/12 text-zinc-400 hover:border-red-500/40 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-[#12141A] p-5">
          <h2 className="text-base font-semibold text-white">Prazo de envio</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {state.isFrozen
              ? 'Envios travados no momento.'
              : `Envios abertos. Prazo: ${state.cutoffLabel}.`}
          </p>

          {isLeader && (
            <>
              <input
                type="text"
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                placeholder="Motivo (opcional)"
                className="mt-3 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white placeholder:text-zinc-600 focus:border-[#0095FF] focus:outline-none"
              />

              <button
                type="button"
                onClick={() => {
                  onToggleFreeze(freezeReason.trim() || undefined);
                  setFreezeReason('');
                }}
                className={`mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold ${
                  state.isFrozen
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border border-[#F5C41E]/40 bg-[#F5C41E]/15 text-[#F5C41E] hover:bg-[#F5C41E]/25'
                }`}
              >
                {state.isFrozen ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                <span>{state.isFrozen ? 'Reabrir envios' : 'Travar envios'}</span>
              </button>
            </>
          )}
        </section>

        <section className="rounded-xl border border-white/10 bg-[#12141A] p-5">
          <h2 className="text-base font-semibold text-white">Resoluções dos 3 telões (16:9)</h2>
          <div className="mt-4 space-y-3">
            {state.screens.map((scr) => (
              <div
                key={scr.code}
                className="grid grid-cols-1 gap-2 rounded-lg border border-white/8 bg-[#0B0C0F] p-3 sm:grid-cols-3 sm:items-center"
              >
                <span className="text-sm font-medium text-white">{scr.label}</span>
                <input
                  type="number"
                  disabled={!isLeader}
                  aria-label={`Largura ${scr.label}`}
                  value={scr.widthPx}
                  onChange={(e) =>
                    onUpdateScreen(scr.code, Number(e.target.value) || scr.widthPx, scr.heightPx)
                  }
                  className="font-mono-tech min-h-[44px] rounded-lg border border-white/12 bg-[#12141A] px-3 text-base text-white disabled:opacity-60"
                />
                <input
                  type="number"
                  disabled={!isLeader}
                  aria-label={`Altura ${scr.label}`}
                  value={scr.heightPx}
                  onChange={(e) =>
                    onUpdateScreen(scr.code, scr.widthPx, Number(e.target.value) || scr.heightPx)
                  }
                  className="font-mono-tech min-h-[44px] rounded-lg border border-white/12 bg-[#12141A] px-3 text-base text-white disabled:opacity-60"
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-white/10 bg-[#12141A] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-white">Histórico recente</h2>
          {isLeader && (
            <button
              type="button"
              onClick={onResetDemo}
              className="min-h-[44px] rounded-lg border border-white/12 px-3 text-xs font-medium text-zinc-300 hover:bg-white/5"
            >
              Restaurar dados iniciais
            </button>
          )}
        </div>

        <div className="mt-3 divide-y divide-white/8">
          {state.auditLogs.slice(0, 12).map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-1 py-2.5 text-sm sm:flex-row sm:justify-between"
            >
              <div>
                <span className="font-mono-tech mr-2 text-xs text-zinc-500">{log.timestamp}</span>
                <span className="font-medium text-white">{log.actorName}</span>
                <span className="ml-1.5 text-zinc-400">{log.detail}</span>
                {log.reason && <span className="ml-2 text-xs text-[#F5C41E]">({log.reason})</span>}
              </div>
              <span className="text-xs text-zinc-500">{log.action}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
