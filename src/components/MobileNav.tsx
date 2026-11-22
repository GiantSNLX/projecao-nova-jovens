import { useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  Home,
  Menu,
  MonitorPlay,
  Music,
  Radio,
  Settings,
  X,
} from 'lucide-react';
import type { TabId } from '../types/portal';

interface MobileNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const PRIMARY_ITEMS: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'culto', label: 'Culto', icon: Radio },
  { id: 'escalas', label: 'Escalas', icon: CalendarDays },
  { id: 'meditacao', label: 'MDO', icon: BookOpen },
];

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const select = (id: TabId) => {
    onTabChange(id);
    setMenuOpen(false);
  };

  const isDrawerActive =
    activeTab === 'musicas' || activeTab === 'programacao' || activeTab === 'configuracoes';

  return (
    <>
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] rounded-t-2xl border-t border-white/12 bg-[#12141A] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Páginas do portal</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Fechar menu"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="divide-y divide-white/8 rounded-xl border border-white/10 bg-[#0B0C0F]">
              {[
                { id: 'inicio' as TabId, label: 'Início', icon: Home },
                {
                  id: 'programacao' as TabId,
                  label: 'Programação e Mídias',
                  icon: MonitorPlay,
                },
                { id: 'musicas' as TabId, label: 'Músicas', icon: Music },
                { id: 'culto' as TabId, label: 'Culto', icon: Radio },
                { id: 'escalas' as TabId, label: 'Escalas', icon: CalendarDays },
                { id: 'meditacao' as TabId, label: 'MDO do Sábado', icon: BookOpen },
                { id: 'configuracoes' as TabId, label: 'Configurações', icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => select(item.id)}
                    className={`flex min-h-[48px] w-full items-center gap-3 px-4 text-left text-base font-medium ${
                      active ? 'text-[#0095FF]' : 'text-zinc-200'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Menu inferior"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0B0C0F]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      >
        <div className="grid h-16 grid-cols-5">
          {PRIMARY_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => select(item.id)}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  active ? 'text-[#0095FF]' : 'text-zinc-400'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 text-xs font-medium ${
              isDrawerActive || menuOpen ? 'text-[#0095FF]' : 'text-zinc-400'
            }`}
          >
            <Menu className="h-5 w-5" />
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}
