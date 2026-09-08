/* Single-stroke 16px-grid icons ported from the design prototype.
   The prototype renders these from raw `d` paths so we mirror that for
   pixel-faithfulness — Lucide doesn't ship every shape used (sparkle, blur, etc.). */

export const ICON = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm10 2-4.35-4.35',
  share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  text: 'M4 7h16M4 12h10M4 17h16',
  image: 'M3 5h18v14H3zM8 12l3 3 4-5 5 6',
  cursor: 'M5 3l6 18 3-8 8-3z',
  globe:
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2c3 3 4 6.5 4 10s-1 7-4 10c-3-3-4-6.5-4-10s1-7 4-10z',
  copy: 'M9 9h11v11H9zM5 5h11v3M5 5v11h3',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  pen: 'M14 4l6 6L8 22H2v-6z',
  sparkle: 'M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 18l9 5 9-5',
  rect: 'M4 6h16v12H4z',
  arrowAnno: 'M5 19L19 5M19 5h-7M19 5v7',
  hl: 'M3 17l6-6 4 4 8-8M3 21h18',
  blur: 'M12 2v3M12 19v3M3 12h3M18 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  number:
    'M3 6h2v6H3zM7 6h2v6M11 6h6v2h-4v2h4v2h-6zM3 16h2v4H3zM7 18h6v2H7z',
  hand:
    'M9 11V5a2 2 0 0 1 4 0v6M13 11V3a2 2 0 0 1 4 0v8M17 11V5a2 2 0 0 1 4 0v8a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8v-2a2 2 0 0 1 4 0v3',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v6h6M12 7v5l4 2',
  zoomIn: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm10 2-4.35-4.35M11 8v6M8 11h6',
  zoomOut: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm10 2-4.35-4.35M8 11h6',
  chevronD: 'M6 9l6 6 6-6',
  chevronR: 'M9 6l6 6-6 6',
  chevronL: 'M15 6l-6 6 6 6',
  list: 'M3 6h.01M3 12h.01M3 18h.01M8 6h13M8 12h13M8 18h13',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
} as const;

export type IconName = keyof typeof ICON;

export function Icon({
  d,
  size = 16,
  stroke = 'currentColor',
  strokeWidth = 1.6,
  fill = 'none',
  className,
  style,
}: {
  d: string;
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}
