'use client';

interface PainPinMarkerProps {
  x: number;
  y: number;
  painLevel?: number;
  selected?: boolean;
  size?: 'sm' | 'md';
}

export function PainPinMarkerSvg({
  x,
  y,
  painLevel,
  selected = false,
  size = 'md',
}: PainPinMarkerProps) {
  const scale = size === 'sm' ? 0.75 : 1;
  const pinColor = selected ? '#10b981' : '#ef4444';
  const glowColor = selected ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.2)';

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} pointerEvents="none">
      {selected && (
        <circle r="14" fill={glowColor}>
          <animate attributeName="r" values="10;16;10" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      {!selected && (
        <circle r="10" fill={glowColor} />
      )}
      {/* Pin head */}
      <circle cy="-4" r="5.5" fill={pinColor} stroke="#fff" strokeWidth="1.5" />
      {/* Pin point */}
      <path
        d="M0,0 L-3.5,8 Q0,11 3.5,8 Z"
        fill={pinColor}
        stroke="#fff"
        strokeWidth="0.8"
      />
      {painLevel !== undefined && painLevel > 0 && (
        <text
          y="-3"
          textAnchor="middle"
          fontSize="6"
          fontWeight="bold"
          fill="#fff"
        >
          {painLevel}
        </text>
      )}
    </g>
  );
}
