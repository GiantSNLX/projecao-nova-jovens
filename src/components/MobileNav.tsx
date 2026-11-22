import { useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  FileArchive,
  Menu,
  MonitorPlay,
  Music,
  Radio,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { TabId } from '../types/portal';

interface MobileNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const PRIMARY_MOBILE_ITEMS: { id: TabId; label: string; icon: typeof CalendarDays }[] = [
  { id: 'escala', label: 'Escala', icon: CalendarDays },
  { id: 'aovivo', label: 'Ao Vivo', icon: Radio },
  { id: 'programacao', label: 'Telões', icon: MonitorPlay },
  { id: 'devocional', label: 'MDO', icon: BookOpen },
];

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreTab =
    activeTab === 'musicas' || activeTab === 'holyrics' || activeTab === 'governanca';

  const selectTab = (id: TabId) => {
    onTabChange(id);
    setMoreOpen(false);
  };

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] rounded-t-2xl border-t border-zinc-200 bg-white p-4 shadow-xl dark:border-white/15 dark:bg-[#12151C]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                Mais módulos do portal
              </span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Fechar menu"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => selectTab('musicas')}
                className={`flex min-h-[48px] items-center gap-3 rounded-xl border px-4 text-left text-base font-medium ${
                  activeTab === 'musicas'
                    ? 'border-[#0095FF] bg-[#0095FF]/10 text-[#0095FF]'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-white/10 dark:bg-[#191D26] dark:text-zinc-100'
                }`}
              >
                <Music className="h-5 w-5 shrink-0" />
                <span>Ministério de Música</span>
              </button>
              <button
                type="button"
                onClick={() => selectTab('holyrics')}
                className={`flex min-h-[48px] items-center gap-3 rounded-xl border px-4 text-left text-base font-medium ${
                  activeTab === 'holyrics'
                    ? 'border-[#0095FF] bg-[#0095FF]/10 text-[#0095FF]'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-white/10 dark:bg-[#191D26] dark:text-zinc-100'
                }`}
              >
                <FileArchive className="h-5 w-5 shrink-0" />
                <span>Holyrics & Exportar .ZIP</span>
              </button>
              <button
                type="button"
                onClick={() => selectTab('governanca')}
                className={`flex min-h-[48px] items-center gap-3 rounded-xl border px-4 text-left text-base font-medium ${
                  activeTab === 'governanca'
                    ? 'border-[#0095FF] bg-[#0095FF]/10 text-[#0095FF]'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-white/10 dark:bg-[#191D26] dark:text-zinc-100'
                }`}
              >
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <span>Governança & Telões</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Navegação móvel"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden dark:border-white/10 dark:bg-[#0A0B0E]/95"
      >
        <div className="grid h-16 grid-cols-5">
          {PRIMARY_MOBILE_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  active ? 'text-[#0095FF]' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 text-xs font-medium ${
              isMoreTab || moreOpen ? 'text-[#0095FF]' : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Menu className="h-5 w-5" />
            <span>Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
}
