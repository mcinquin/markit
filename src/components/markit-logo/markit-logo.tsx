type MarkItLogoProps = {
  className?: string;
  /** full = tampon complet ; mark = pastille navbar / favicon */
  variant?: "full" | "mark";
  title?: string;
};

/**
 * Logo tampon MarkIt (proposition 4) — SVG vectoriel.
 */
export function MarkItLogo({
  className,
  variant = "full",
  title = "MarkIt",
}: MarkItLogoProps) {
  if (variant === "mark") {
    return (
      <svg
        className={className}
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        <rect
          x="6"
          y="8"
          width="60"
          height="56"
          rx="10"
          transform="rotate(-4 36 36)"
          fill="#FFFEF8"
          stroke="#0F172A"
          strokeWidth="4"
        />
        <text
          x="16"
          y="42"
          fill="#0F172A"
          fontFamily="var(--font-display), system-ui, sans-serif"
          fontSize="22"
          fontWeight="700"
        >
          M
        </text>
        <path
          d="M36 40 L42 46 L54 28"
          stroke="#0F9F93"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="54" cy="52" r="5" fill="#F5C518" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 228 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <g transform="rotate(-3 114 64)">
        <rect
          x="12"
          y="14"
          width="204"
          height="98"
          rx="16"
          fill="#FFFEF8"
          stroke="#0F172A"
          strokeWidth="5.5"
        />
        {/* Soulignement citron centré */}
        <path d="M94 99 H134" stroke="#F5C518" strokeWidth="3" strokeLinecap="round" />
        <text
          x="32"
          y="72"
          fill="#0F172A"
          fontFamily="var(--font-display), system-ui, sans-serif"
          fontSize="44"
          fontWeight="700"
          letterSpacing="-1.5"
        >
          MARK
        </text>
        <path
          d="M160 34 L168 41 L184 26"
          stroke="#0F9F93"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="160"
          y="72"
          fill="#0F9F93"
          fontFamily="var(--font-display), system-ui, sans-serif"
          fontSize="38"
          fontWeight="700"
          letterSpacing="2"
        >
          IT
        </text>
        <text
          x="114"
          y="93"
          textAnchor="middle"
          fill="#0F9F93"
          fontFamily="var(--font-body), system-ui, sans-serif"
          fontSize="12"
          fontWeight="700"
          letterSpacing="3"
        >
          MEETING BINGO
        </text>
      </g>
    </svg>
  );
}

export function MarkItBrand({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <MarkItLogo variant="mark" className="h-9 w-9 shrink-0" />
      <span className="font-display text-xl font-bold tracking-tight text-ink">
        MarkIt<span className="text-accent">.</span>
      </span>
    </span>
  );
}
