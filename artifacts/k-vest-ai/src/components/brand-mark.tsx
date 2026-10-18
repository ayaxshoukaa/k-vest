import type { SVGProps } from 'react';

type BrandMarkProps = SVGProps<SVGSVGElement>;

export function BrandMark(props: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <defs>
        <linearGradient id="kv-mark-warm" x1="10" y1="9" x2="37" y2="39" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFB59B" />
          <stop offset="1" stopColor="#FF7138" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="45" height="45" rx="13.5" fill="#11172B" />
      <rect x="1.5" y="1.5" width="45" height="45" rx="13.5" stroke="#FF7138" strokeOpacity=".62" />
      <path
        d="M15.5 33V15"
        stroke="#FFB59B"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M17.2 23.8h4.5L32 14.7"
        stroke="url(#kv-mark-warm)"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m21.7 23.8 10.4 9.1"
        stroke="#F2E6E2"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m35 8.8 1.2 2.5 2.6 1.2-2.6 1.1L35 16l-1.2-2.4-2.6-1.1 2.6-1.2L35 8.8Z"
        fill="#AFC6FF"
      />
      <circle cx="33.5" cy="34" r="2" fill="#FF7138" />
    </svg>
  );
}
