import { useRef, useEffect, useState } from 'react';

// Chart layout constants — must match all three charts
const MARGIN_LEFT = 10;
const MARGIN_RIGHT = 20;
const YAXIS_WIDTH = 52;
const PLOT_OFFSET = MARGIN_LEFT + YAXIS_WIDTH; // left edge of plot area

function xPixel(year, minYear, maxYear, containerWidth) {
  const plotWidth = containerWidth - PLOT_OFFSET - MARGIN_RIGHT;
  return PLOT_OFFSET + ((year - minYear) / (maxYear - minYear)) * plotWidth;
}

function DeathLine({ x, name, age, color, height, stripHeight }) {
  return (
    <g>
      {/* vertical line — full height */}
      <line x1={x} y1={0} x2={x} y2={height} stroke={color} strokeWidth={1} strokeDasharray="4 3" />
      {/* label at top of strip */}
      <rect x={x - 22} y={1} width={44} height={16} fill="white" fillOpacity={0.9} stroke={color} strokeWidth={1} rx={2} />
      <text x={x} y={13} textAnchor="middle" fontSize={10} fill={color}>{name} {age}</text>
    </g>
  );
}

export function DeathLinesOverlay({ erikDeathYear, debDeathYear, erikBirthYear, debBirthYear, minYear, maxYear, stripHeight = 50 }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      const e = entries[0].contentRect;
      setWidth(e.width);
      setHeight(e.height);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const erikAge = erikBirthYear && erikDeathYear ? erikDeathYear - erikBirthYear : null;
  const debAge  = debBirthYear  && debDeathYear  ? debDeathYear  - debBirthYear  : null;

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {width > 0 && (
        <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
          {erikDeathYear && erikAge && (
            <DeathLine
              x={xPixel(erikDeathYear, minYear, maxYear, width)}
              name="Erik" age={erikAge} color="#ef4444" height={height} stripHeight={stripHeight}
            />
          )}
          {debDeathYear && debAge && (
            <DeathLine
              x={xPixel(debDeathYear, minYear, maxYear, width)}
              name="Deb" age={debAge} color="#8b5cf6" height={height} stripHeight={stripHeight}
            />
          )}
        </svg>
      )}
    </div>
  );
}
