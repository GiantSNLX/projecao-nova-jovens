import type { LucideIcon } from 'lucide-react';

interface GlassIconBadgeProps {
  icon: LucideIcon;
  /** Mantido por compatibilidade; o ícone agora é neutro em todos os tons. */
  tone?: 'blue' | 'gold' | 'emerald' | 'zinc';
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Ícone de apoio, sem cápsula decorativa: mesmo traço e cor neutra em todo o portal.
 * Cor de estado fica para os rótulos de estado, não para ícones de seção.
 */
export function GlassIconBadge({ icon: Icon, size = 'md', className = '' }: GlassIconBadgeProps) {
  const iconDims = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return <Icon aria-hidden="true" className={`shrink-0 text-ink-4 ${iconDims} ${className}`} />;
}
