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

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function EventLine({ x, label, color, height, labelOffset = 0 }) {
  const labelWidth = label.length * 6 + 8;
  return (
    <g>
      <line x1={x} y1={0} x2={x} y2={height} stroke={color} strokeWidth={1} strokeDasharray="4 3" clipPath="url(#plotAreaClip)" />
      <rect x={x - labelWidth / 2} y={1 + labelOffset} width={labelWidth} height={16} fill="white" fillOpacity={0.9} stroke={color} strokeWidth={1} rx={2} />
      <text x={x} y={13 + labelOffset} textAnchor="middle" fontSize={10} fill={color}>{label}</text>
    </g>
  );
}

export function DeathLinesOverlay({ deathEvents, erikBirthYear, debBirthYear, ssEvents, minYear, maxYear, stripHeight = 50 }) {
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

  const erikDeath = (deathEvents ?? []).find(e => e.name === 'Erik');
  const debDeath  = (deathEvents ?? []).find(e => e.name === 'Deb');
  const erikDeathYear = erikDeath?.year;
  const debDeathYear  = debDeath?.year;
  const erikAge = erikBirthYear && erikDeathYear ? erikDeathYear - erikBirthYear : null;
  const debAge  = debBirthYear  && debDeathYear  ? debDeathYear  - debBirthYear  : null;


  return (
    <div ref={ref} style={{ position: 'absolute', top: 0, bottom: 0, left: 12, right: 12, pointerEvents: 'none' }}>
      {width > 0 && (
        <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <clipPath id="plotAreaClip">
              <rect x={PLOT_OFFSET} y={0} width={width - PLOT_OFFSET - MARGIN_RIGHT} height={height} />
            </clipPath>
          </defs>
          {(ssEvents ?? []).map((ev, i) => {
            const label = `SS ${ev.name}${ev.month ? ' ' + MONTHS[ev.month - 1] : ''}`;
            const fractionalYear = ev.year + (ev.month ? (ev.month - 1) / 12 : 0);
            return (
              <EventLine
                key={ev.name}
                x={xPixel(fractionalYear, minYear, maxYear, width)}
                label={label}
                color="#2563eb"
                height={height}
                labelOffset={i * 18}
              />
            );
          })}
          {erikDeath && erikAge && (
            <EventLine
              x={xPixel(erikDeathYear + (erikDeath.month ? (erikDeath.month - 1) / 12 : 0), minYear, maxYear, width)}
              label={`Erik ${erikAge}`}
              color="#ef4444"
              height={height}
            />
          )}
          {debDeath && debAge && (
            <EventLine
              x={xPixel(debDeathYear + (debDeath.month ? (debDeath.month - 1) / 12 : 0), minYear, maxYear, width)}
              label={`Deb ${debAge}`}
              color="#8b5cf6"
              height={height}
            />
          )}
        </svg>
      )}
    </div>
  );
}
