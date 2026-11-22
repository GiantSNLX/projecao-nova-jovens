import { useEffect, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  className?: string;
}

/**
 * AnimatedCounter (estilo React Bits) — interpola suavemente valores numéricos ao mudar.
 */
export function AnimatedCounter({ value, className = '' }: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (display === value) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDisplay(value);
      return;
    }

    const start = display;
    const diff = value - start;
    const duration = 220;
    const startedAt = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const p = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * eased));
      if (p < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, display]);

  return <span className={`font-mono-tech tabular-nums ${className}`}>{display}</span>;
}
