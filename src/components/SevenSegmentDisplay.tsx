import React from 'react';

interface SevenSegmentDisplayProps {
  value: number | string;
  size?: 'sm' | 'md' | 'lg';
  glowColor?: string; // default neon cyan or alert red
}

// Map of digits 0-9 to active segments [a, b, c, d, e, f, g]
const DIGIT_SEGMENTS: Record<string, boolean[]> = {
  '0': [true, true, true, true, true, true, false],
  '1': [false, true, true, false, false, false, false],
  '2': [true, true, false, true, true, false, true],
  '3': [true, true, true, true, false, false, true],
  '4': [false, true, true, false, false, true, true],
  '5': [true, false, true, true, false, true, true],
  '6': [true, false, true, true, true, true, true],
  '7': [true, true, true, false, false, false, false],
  '8': [true, true, true, true, true, true, true],
  '9': [true, true, true, true, false, true, true],
  '-': [false, false, false, false, false, false, true],
  ' ': [false, false, false, false, false, false, false],
};

export const SevenSegmentDisplay: React.FC<SevenSegmentDisplayProps> = ({
  value,
  size = 'md',
  glowColor = '#00E5FF',
}) => {
  const digitStr = String(value).slice(-1);
  const segments = DIGIT_SEGMENTS[digitStr] || DIGIT_SEGMENTS['-'];

  // Segment geometry polygons for standard angled LED 7-segment
  const dimensions = {
    sm: { width: 44, height: 72 },
    md: { width: 64, height: 104 },
    lg: { width: 90, height: 148 },
  }[size];

  return (
    <div className="relative inline-flex flex-col items-center justify-center p-3 rounded-lg bg-black/80 border border-cyan-500/30 shadow-inner">
      <svg
        viewBox="0 0 100 160"
        width={dimensions.width}
        height={dimensions.height}
        className="overflow-visible"
      >
        <defs>
          <filter id={`glow-${digitStr}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background inactive faint shadow of all segments */}
        <g opacity="0.12" fill={glowColor}>
          {/* Segment A */}
          <polygon points="20,12 80,12 72,22 28,22" />
          {/* Segment B */}
          <polygon points="82,14 88,20 84,74 74,68 76,24" />
          {/* Segment C */}
          <polygon points="82,86 86,92 82,146 72,136 74,92" />
          {/* Segment D */}
          <polygon points="20,148 80,148 72,138 28,138" />
          {/* Segment E */}
          <polygon points="18,86 26,92 24,136 14,146 16,92" />
          {/* Segment F */}
          <polygon points="18,14 24,24 26,68 16,74 12,20" />
          {/* Segment G */}
          <polygon points="22,80 27,74 73,74 78,80 73,86 27,86" />
        </g>

        {/* Active segments with high-brightness neon glow */}
        <g
          fill={glowColor}
          filter={`url(#glow-${digitStr})`}
          className="transition-all duration-150"
        >
          {/* Segment A (Top) */}
          {segments[0] && <polygon points="20,12 80,12 72,22 28,22" />}
          {/* Segment B (Top-Right) */}
          {segments[1] && <polygon points="82,14 88,20 84,74 74,68 76,24" />}
          {/* Segment C (Bottom-Right) */}
          {segments[2] && <polygon points="82,86 86,92 82,146 72,136 74,92" />}
          {/* Segment D (Bottom) */}
          {segments[3] && <polygon points="20,148 80,148 72,138 28,138" />}
          {/* Segment E (Bottom-Left) */}
          {segments[4] && <polygon points="18,86 26,92 24,136 14,146 16,92" />}
          {/* Segment F (Top-Left) */}
          {segments[5] && <polygon points="18,14 24,24 26,68 16,74 12,20" />}
          {/* Segment G (Center) */}
          {segments[6] && <polygon points="22,80 27,74 73,74 78,80 73,86 27,86" />}
        </g>
      </svg>
      <div className="mt-1 text-[10px] font-tech text-cyan-400/80 tracking-widest uppercase">
        SEG-7 (74HC595)
      </div>
    </div>
  );
};
