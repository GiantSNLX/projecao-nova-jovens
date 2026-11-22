import { Moon, RotateCcw, Shield, Sun } from 'lucide-react';
import type { MemberUser, ProgrammingTeam, Role, TabId } from '../types/portal';
import { ROLE_LABELS, TEAM_LABELS } from '../data/initialState';

interface HeaderProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  activeUser: MemberUser;
  activeRole: Role;
  users: MemberUser[];
  onChangeUser: (userId: string) => void;
  onChangeRole: (role: Role) => void;
  programmingTeam: ProgrammingTeam;
  serviceDate: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onResetDemo: () => void;
}

const DESKTOP_TABS: { id: TabId; label: string }[] = [
  { id: 'escala', label: 'Escala & Mesa' },
  { id: 'aovivo', label: 'Ao Vivo' },
  { id: 'musicas', label: 'Músicas' },
  { id: 'programacao', label: 'Programação & Simulador' },
  { id: 'devocional', label: 'MDO & Sábado' },
  { id: 'holyrics', label: 'Holyrics & .ZIP' },
  { id: 'governanca', label: 'Governança' },
];

export function Header({
  activeTab,
  onTabChange,
  activeUser,
  activeRole,
  users,
  onChangeUser,
  onChangeRole,
  programmingTeam,
  serviceDate,
  isDark,
  onToggleTheme,
  onResetDemo,
}: HeaderProps) {
  const team = TEAM_LABELS[programmingTeam];

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-white/10 dark:bg-[#0A0B0E]/95">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        {/* Top row */}
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Brand Lockup */}
          <button
            type="button"
            onClick={() => onTabChange('escala')}
            className="flex min-h-[44px] items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0095FF]"
          >
            <img
              src="./brand/projecao-logo.jpg"
              alt="Símbolo Projeção Nova Jovens 2"
              className="h-10 w-10 shrink-0 rounded-lg border border-black/15 object-cover shadow-xs"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold tracking-tight text-zinc-950 sm:text-base dark:text-white">
                  Projeção Nova Jovens
                </span>
                <img
                  src="./brand/nova-jovens-logo.png"
                  alt="Nova Jovens 2"
                  className="hidden h-5 w-auto rounded-xs bg-[#0A0B0E] px-1 py-0.5 object-contain sm:inline-block"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-mono-tech">{serviceDate}</span>
                <span aria-hidden="true">·</span>
                <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${team.badgeClass}`}>
                  {team.name}
                </span>
              </div>
            </div>
          </button>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Active user & role switcher (desktop + compact mobile) */}
            <div className="hidden items-center gap-2 lg:flex">
              <label className="sr-only" htmlFor="header-user-select">
                Usuário simulado
              </label>
              <select
                id="header-user-select"
                value={activeUser.id}
                onChange={(e) => onChangeUser(e.target.value)}
                className="min-h-[40px] rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 text-sm font-medium text-zinc-900 focus:border-[#0095FF] focus:outline-none dark:border-white/15 dark:bg-[#14171F] dark:text-zinc-100"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>

              <div className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 dark:border-white/15 dark:bg-[#14171F]">
                <Shield className="h-3.5 w-3.5 text-[#0095FF]" />
                <label className="sr-only" htmlFor="header-role-select">
                  Papel ativo
                </label>
                <select
                  id="header-role-select"
                  value={activeRole}
                  onChange={(e) => onChangeRole(e.target.value as Role)}
                  className="bg-transparent text-sm font-medium text-zinc-900 focus:outline-none dark:text-zinc-100"
                >
                  {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                    <option key={r} value={r} className="dark:bg-[#14171F]">
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:bg-[#14171F] dark:text-zinc-200 dark:hover:bg-[#1D212D]"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onResetDemo}
              title="Restaurar dados iniciais"
              aria-label="Restaurar dados iniciais"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:bg-[#14171F] dark:text-zinc-200 dark:hover:bg-[#1D212D]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile quick profile switcher (compact, zero overflow) */}
        <div className="flex items-center gap-2 pb-2.5 lg:hidden">
          <select
            aria-label="Membro ativo"
            value={activeUser.id}
            onChange={(e) => onChangeUser(e.target.value)}
            className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 text-sm font-medium text-zinc-900 dark:border-white/15 dark:bg-[#14171F] dark:text-zinc-100"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Papel de acesso"
            value={activeRole}
            onChange={(e) => onChangeRole(e.target.value as Role)}
            className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 text-sm font-medium text-zinc-900 dark:border-white/15 dark:bg-[#14171F] dark:text-zinc-100"
          >
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop navigation tabs */}
        <nav aria-label="Navegação principal" className="hidden gap-1 overflow-x-auto pb-0 md:flex">
          {DESKTOP_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative min-h-[44px] shrink-0 px-3.5 text-sm font-medium transition-colors ${
                  active
                    ? 'text-[#0095FF]'
                    : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                {tab.label}
                {active && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#0095FF]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
