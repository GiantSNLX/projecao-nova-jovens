import {
  BookOpen,
  CalendarDays,
  Home,
  LogOut,
  MonitorPlay,
  Moon,
  Music,
  Radio,
  Settings,
  Sun,
} from 'lucide-react';
import type { MemberUser, TabId } from '../types/portal';
import { useTheme } from '../utils/theme';
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
  { id: 'programacao', label: 'Programação e mídias', icon: MonitorPlay },
  { id: 'culto', label: 'Culto', icon: Radio },
  { id: 'meditacao', label: 'Controle de meditação', icon: BookOpen },
  { id: 'escalas', label: 'Escalas', icon: CalendarDays },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

const iconButton =
  'btn-rb-surface inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 rounded-lg border border-line text-ink-2 hover:text-ink sm:min-h-[44px] sm:min-w-[44px]';

export function Header({
  activeTab,
  onTabChange,
  activeUser,
  isLeader,
  onLogout,
}: HeaderProps) {
  const { theme, toggle } = useTheme();
  const nextThemeLabel = theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-2 sm:h-16">
          <button
            type="button"
            onClick={() => onTabChange('inicio')}
            className="flex min-h-[44px] min-w-0 items-center gap-2.5 text-left"
          >
            <ProjectorMark size={28} className="shrink-0" />
            <span className="truncate text-sm font-semibold tracking-tight text-ink sm:text-base">
              Projeção Nova Jovens
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="mr-1 hidden text-right sm:block">
              <div className="text-sm font-medium text-ink">{activeUser.name}</div>
              <div className="text-xs text-ink-3">
                {isLeader && !activeUser.ministry.includes('Liderança') ? 'Liderança · ' : ''}
                {activeUser.ministry}
              </div>
            </div>

            <button
              type="button"
              onClick={toggle}
              aria-label={nextThemeLabel}
              title={nextThemeLabel}
              className={iconButton}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className={`${iconButton} px-2.5 text-xs font-medium sm:px-3 sm:text-sm`}
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Navegação principal na ordem do fluxo semanal */}
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
                className={`relative inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-2 text-xs font-medium transition-colors lg:gap-2 lg:px-3 lg:text-sm ${
                  active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
                }`}
              >
                <Icon className={`hidden h-4 w-4 lg:block ${active ? 'text-ink' : 'text-ink-4'}`} />
                <span>{item.label}</span>
                {active && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent-solid lg:inset-x-3" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
