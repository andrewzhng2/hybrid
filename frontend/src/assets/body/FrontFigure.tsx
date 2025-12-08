import type { SVGProps } from 'react'

const FrontFigure = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 180 520"
    role="img"
    aria-label="Front body silhouette"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g
      fill="var(--body-silhouette-fill, rgba(255, 255, 255, 0.05))"
      stroke="var(--body-silhouette-stroke, rgba(255, 255, 255, 0.2))"
      strokeWidth="2"
    >
      <circle cx="90" cy="46" r="32" />
      <circle cx="80" cy="44" r="2.6" fill="rgba(255, 255, 255, 0.35)" stroke="none" />
      <circle cx="100" cy="44" r="2.6" fill="rgba(255, 255, 255, 0.35)" stroke="none" />
      <path
        d="M80 56c3 3.5 7 5.5 10 5.5s7-2 10-5.5"
        stroke="rgba(255, 255, 255, 0.35)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="9" y="110" width="40" height="210" rx="20" />
      <rect x="131" y="110" width="40" height="210" rx="20" />
      <rect x="52" y="88" width="76" height="250" rx="24" />
      <rect x="40" y="320" width="40" height="170" rx="16" />
      <rect x="100" y="320" width="40" height="170" rx="16" />
    </g>
    <line
      x1="90"
      y1="20"
      x2="90"
      y2="420"
      stroke="var(--body-silhouette-guide, rgba(255, 255, 255, 0.08))"
      strokeWidth="2"
      strokeDasharray="6 10"
      strokeLinecap="round"
    />
  </svg>
)

export default FrontFigure

