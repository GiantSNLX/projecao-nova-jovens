import { useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

interface ClickSparkProps {
  children: ReactNode;
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  className?: string;
}

/**
 * ClickSpark (estilo React Bits) — micro-interação tátil ao clicar em botões e controles.
 */
export function ClickSpark({
  children,
  sparkColor = '#38BDF8',
  sparkSize = 8,
  sparkRadius = 16,
  sparkCount = 8,
  duration = 360,
  className = '',
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparksRef = useRef<Spark[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    resize();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const draw = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime;
        if (elapsed >= duration) return false;

        const progress = elapsed / duration;
        const eased = progress * (2 - progress);
        const distance = eased * sparkRadius;
        const lineLength = sparkSize * (1 - eased);

        const x1 = spark.x + distance * Math.cos(spark.angle);
        const y1 = spark.y + distance * Math.sin(spark.angle);
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

        ctx.strokeStyle = sparkColor;
        ctx.globalAlpha = 1 - eased;
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        return true;
      });

      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [sparkColor, sparkRadius, sparkSize, duration]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (!target?.closest('button, a, label[for], [role="button"]')) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = performance.now();

      for (let i = 0; i < sparkCount; i++) {
        sparksRef.current.push({
          x,
          y,
          angle: (2 * Math.PI * i) / sparkCount,
          startTime: now,
        });
      }
    },
    [sparkCount],
  );

  return (
    <div onClick={handleClick} className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 block h-full w-full"
      />
      {children}
    </div>
  );
}
