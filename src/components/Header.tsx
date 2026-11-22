import { LogOut, ShieldCheck } from 'lucide-react';
import type { MemberUser, TabId } from '../types/portal';
import { ProjectorMark } from './ProjectorMark';

interface HeaderProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  activeUser: MemberUser;
  isLeader: boolean;
  onLogout: () => void;
}

const NAV_ITEMS: { id: TabId; label: string }[] = [
  { id: 'inicio', label: 'Início' },
  { id: 'musicas', label: 'Músicas' },
  { id: 'programacao', label: 'Programação e Mídias' },
  { id: 'culto', label: 'Culto' },
  { id: 'meditacao', label: 'Controle de Meditação' },
  { id: 'escalas', label: 'Escalas' },
  { id: 'configuracoes', label: 'Configurações' },
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
        <div className="flex h-16 items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onTabChange('inicio')}
            className="flex min-h-[44px] items-center gap-2.5 text-left"
          >
            <ProjectorMark size={32} className="shrink-0" />
            <span className="truncate text-base font-semibold tracking-tight text-white">
              Projeção Nova Jovens
            </span>
          </button>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {isLeader && (
              <span className="inline-flex items-center gap-1 rounded-md border border-[#F5C41E]/35 bg-[#F5C41E]/10 px-2 py-1 text-xs font-medium text-[#F5C41E]">
                <ShieldCheck className="h-3.5 w-3.5" />
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
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/12 px-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Desktop navigation */}
        <nav aria-label="Navegação principal" className="hidden gap-1 overflow-x-auto md:flex">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative min-h-[44px] shrink-0 px-3 text-sm font-medium transition-colors ${
                  active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[#0095FF]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
