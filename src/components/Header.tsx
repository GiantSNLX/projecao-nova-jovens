import {
  BookOpen,
  CalendarDays,
  Home,
  LogOut,
  MonitorPlay,
  Music,
  Radio,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import type { MemberUser, TabId } from '../types/portal';
import { ProjectorMark } from './ProjectorMark';

interface HeaderProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  activeUser: MemberUser;
  isLeader: boolean;
  onLogout: () => void;
}

const NAV_ITEMS: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'musicas', label: 'Músicas', icon: Music },
  { id: 'programacao', label: 'Programação e Mídias', icon: MonitorPlay },
  { id: 'culto', label: 'Culto', icon: Radio },
  { id: 'meditacao', label: 'Controle de Meditação', icon: BookOpen },
  { id: 'escalas', label: 'Escalas', icon: CalendarDays },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

export function Header({
  activeTab,
  onTabChange,
  activeUser,
  isLeader,
  onLogout,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0B0C0F]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onTabChange('inicio')}
            className="flex min-h-[44px] min-w-0 items-center gap-2 text-left"
          >
            <ProjectorMark size={30} className="shrink-0" />
            <span className="truncate text-sm font-semibold tracking-tight text-white sm:text-base">
              Projeção Nova Jovens
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            {isLeader && (
              <span className="inline-flex items-center gap-1 rounded-md border border-[#F5C41E]/35 bg-[#F5C41E]/10 px-2 py-1 text-[11px] font-medium text-[#F5C41E] sm:text-xs">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>Liderança</span>
              </span>
            )}

            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-zinc-100">{activeUser.name}</div>
              <div className="font-mono-tech text-xs text-zinc-400">
                SENIB {activeUser.senibId} · {activeUser.ministry}
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="btn-rb-surface inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-white/12 px-2.5 text-xs font-medium text-zinc-300 hover:text-white sm:min-h-[44px] sm:gap-1.5 sm:px-3 sm:text-sm"
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Navegação principal seguindo o fluxo semanal */}
        <nav aria-label="Navegação principal" className="hidden gap-0.5 overflow-x-auto md:flex lg:gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`group relative inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-2 text-xs font-medium transition-colors lg:gap-2 lg:px-3 lg:text-sm ${
                  active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon
                  className={`hidden h-4 w-4 transition-transform duration-150 group-hover:scale-110 lg:block ${
                    active ? 'text-[#0095FF]' : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                />
                <span>{item.label}</span>
                {active && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#0095FF] lg:inset-x-3" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
