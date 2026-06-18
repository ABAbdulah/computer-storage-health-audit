interface LogoProps {
  size?: number
  className?: string
}

/**
 * SpaceScope mark — an aperture / scope reticle. The crosshair + segmented
 * ring reads as an instrument that inspects what's inside the disk.
 */
export function Logo({ size = 28, className }: LogoProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ss-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(var(--accent))" />
          <stop offset="1" stopColor="rgb(var(--cat-media))" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13" stroke="url(#ss-grad)" strokeWidth="2.2" />
      <circle cx="16" cy="16" r="6.5" stroke="rgb(var(--accent))" strokeWidth="2" opacity="0.55" />
      <circle cx="16" cy="16" r="2.4" fill="url(#ss-grad)" />
      <path d="M16 1.5V6M16 26v4.5M1.5 16H6M26 16h4.5" stroke="rgb(var(--accent))" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
