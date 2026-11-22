import type { LucideIcon } from 'lucide-react';

interface GlassIconBadgeProps {
  icon: LucideIcon;
  tone?: 'blue' | 'gold' | 'emerald' | 'zinc';
  size?: 'sm' | 'md';
  className?: string;
}

const TONE_MAP = {
  blue: 'border-[#0095FF]/35 bg-[#0095FF]/14 text-[#38BDF8] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]',
  gold: 'border-[#F5C41E]/35 bg-[#F5C41E]/14 text-[#F5C41E] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]',
  emerald: 'border-emerald-500/35 bg-emerald-500/14 text-emerald-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]',
  zinc: 'border-white/15 bg-white/[0.06] text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]',
};

/**
 * GlassIconBadge (estilo React Bits Glass Icons) — ícone em cápsula translúcida com borda especular.
 */
export function GlassIconBadge({
  icon: Icon,
  tone = 'blue',
  size = 'md',
  className = '',
}: GlassIconBadgeProps) {
  const dims = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl';
  const iconDims = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border backdrop-blur-sm transition-transform duration-200 group-hover:scale-105 ${dims} ${TONE_MAP[tone]} ${className}`}
    >
      <Icon className={iconDims} />
    </span>
  );
}
