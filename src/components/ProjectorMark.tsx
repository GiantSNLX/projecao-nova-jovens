interface ProjectorMarkProps {
  size?: number;
  className?: string;
}

/**
 * Ícone vetorial limpo do mini projetor da Projeção Nova Jovens 2.
 */
export function ProjectorMark({ size = 36, className = '' }: ProjectorMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Mini projetor Projeção Nova Jovens"
      className={className}
    >
      {/* Motion accents */}
      <path
        d="M42 9C46 9.5 49.5 12 51 15.5"
        stroke="#F5C41E"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M44 13.5C46.5 14 48.3 15.6 49 17.8"
        stroke="#F5C41E"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M11 49.5C13 53 16.5 55 20.5 55.2"
        stroke="#F5C41E"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Feet */}
      <path
        d="M14 45H21L20 50H15L14 45Z"
        fill="#64748B"
        stroke="#0A0B0E"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M43 45H50L49 50H44L43 45Z"
        fill="#64748B"
        stroke="#0A0B0E"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Projector main chassis */}
      <path
        d="M12 22C12 18.6863 14.6863 16 18 16H33.5C35.8 14.2 38.7 13.2 41.8 13.2C48.8 13.2 54.5 18.4 55 25.2V40C55 43.3137 52.3137 46 49 46H18C14.6863 46 12 43.3137 12 40V22Z"
        fill="#F1F5F9"
        stroke="#0A0B0E"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Top yellow vent bar */}
      <rect
        x="16.5"
        y="19"
        width="14.5"
        height="5.5"
        rx="1.2"
        fill="#F5C41E"
        stroke="#0A0B0E"
        strokeWidth="1.8"
      />
      <rect x="18.6" y="20.9" width="1.8" height="1.8" fill="#0A0B0E" />
      <rect x="21.6" y="20.9" width="1.8" height="1.8" fill="#0A0B0E" />
      <rect x="24.6" y="20.9" width="1.8" height="1.8" fill="#0A0B0E" />
      <rect x="27.6" y="20.9" width="1.8" height="1.8" fill="#0A0B0E" />

      {/* Left panel buttons */}
      <rect x="16.5" y="28" width="5.5" height="4" rx="0.8" fill="#94A3B8" stroke="#0A0B0E" strokeWidth="1.8" />
      <rect x="24.5" y="28" width="5.5" height="4" rx="0.8" fill="#94A3B8" stroke="#0A0B0E" strokeWidth="1.8" />
      <rect x="16.5" y="34.8" width="5.5" height="4" rx="0.8" fill="#CBD5E1" stroke="#0A0B0E" strokeWidth="1.8" />
      <circle cx="25.8" cy="36.8" r="2.1" fill="#F5C41E" stroke="#0A0B0E" strokeWidth="1.6" />
      <circle cx="31.2" cy="36.8" r="2.1" fill="#EF4444" stroke="#0A0B0E" strokeWidth="1.6" />

      {/* Lens housing */}
      <circle cx="42.5" cy="29.5" r="11.5" fill="#E2E8F0" stroke="#0A0B0E" strokeWidth="3" />
      <circle cx="42.5" cy="29.5" r="8" fill="#0095FF" stroke="#0A0B0E" strokeWidth="2.4" />
      <circle cx="42.5" cy="29.5" r="4.2" fill="#38BDF8" />
      <path
        d="M39.5 26.8C40.5 25.7 42.1 25.3 43.6 25.7"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
