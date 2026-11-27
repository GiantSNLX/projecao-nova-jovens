interface ProjectorMarkProps {
  size?: number;
  className?: string;
}

/**
 * Símbolo da Projeção Nova Jovens: projetor em silhueta sobre placa.
 * Desenhado num grid de 32 unidades, sem detalhes menores que 1,5 unidade,
 * para continuar nítido de 16 px (favicon) a 64 px (login).
 * Mesmo desenho de public/favicon.svg; manter os dois iguais.
 */
export function ProjectorMark({ size = 32, className = '' }: ProjectorMarkProps) {
  const tile = 'var(--c-accent-solid)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Projeção Nova Jovens"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill={tile} />
      {/* corpo */}
      <rect x="5" y="10" width="22" height="12" rx="3" fill="#fff" />
      {/* pés */}
      <rect x="8" y="21" width="3.5" height="3" rx="1" fill="#fff" />
      <rect x="20.5" y="21" width="3.5" height="3" rx="1" fill="#fff" />
      {/* lente */}
      <circle cx="19.5" cy="16" r="4.5" fill={tile} />
      <circle cx="19.5" cy="16" r="2" fill="#fff" />
      {/* ventilação */}
      <rect x="8.5" y="13.5" width="5" height="2" rx="1" fill={tile} />
      <rect x="8.5" y="17" width="3" height="2" rx="1" fill={tile} />
    </svg>
  );
}
