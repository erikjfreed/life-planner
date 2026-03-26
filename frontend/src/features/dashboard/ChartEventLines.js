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

function EventLineSvg({ x, color, height }) {
  return <line x1={x} y1={0} x2={x} y2={height} stroke={color} strokeWidth={1} strokeDasharray="4 3" clipPath="url(#plotAreaClip)" />;
}

function EventLabel({ x, label, color, labelOffset = 0 }) {
  return (
    <div style={{
      position: 'absolute', left: x + 1, top: labelOffset,
      background: '#1e293b', borderRadius: 2,
      padding: '0 3px', fontSize: 9, fontWeight: 600, color, whiteSpace: 'nowrap',
      lineHeight: '14px',
    }}>
      {label}
    </div>
  );
}

export function ChartEventLinesOverlay({ deathEvents, erikBirthYear, debBirthYear, ssEvents, reEvents, vehicleEvents, entities, minYear, maxYear, stripHeight = 50 }) {
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


  const allEvents = [];
  if (width > 0) {
    (ssEvents ?? []).forEach(ev => {
      const fractionalYear = ev.year + (ev.month ? (ev.month - 1) / 12 : 0);
      allEvents.push({ key: `ss-${ev.name}`, x: xPixel(fractionalYear, minYear, maxYear, width), label: `SS ${ev.name}${ev.month ? ' ' + MONTHS[ev.month - 1] : ''}`, color: '#2563eb' });
    });
    (reEvents ?? []).forEach(ev => {
      const entity = (entities ?? []).find(en => en.id === ev.entity_id);
      const name = entity?.street_address ? entity.street_address.split(',')[0] : (entity?.name || '?');
      const isSell = ev.type === 'real_estate_sell';
      const fractionalYear = ev.year + (ev.month ? (ev.month - 1) / 12 : 0);
      allEvents.push({ key: `${ev.type}-${ev.entity_id}`, x: xPixel(fractionalYear, minYear, maxYear, width), label: `${isSell ? 'Sell' : 'Buy'} ${name}`, color: isSell ? '#16a34a' : '#7c3aed' });
    });
    (vehicleEvents ?? []).forEach(ev => {
      const entity = (entities ?? []).find(en => en.id === ev.entity_id);
      const isSell = ev.type === 'vehicle_sell';
      const fractionalYear = ev.year + (ev.month ? (ev.month - 1) / 12 : 0);
      allEvents.push({ key: `${ev.type}-${ev.entity_id}`, x: xPixel(fractionalYear, minYear, maxYear, width), label: `${isSell ? 'Sell' : 'Buy'} ${entity?.name || '?'}`, color: '#ec4899' });
    });
    if (erikDeath && erikAge) {
      allEvents.push({ key: 'death-erik', x: xPixel(erikDeathYear + (erikDeath.month ? (erikDeath.month - 1) / 12 : 0), minYear, maxYear, width), label: `RIP Erik ${erikAge}`, color: '#ef4444' });
    }
    if (debDeath && debAge) {
      allEvents.push({ key: 'death-deb', x: xPixel(debDeathYear + (debDeath.month ? (debDeath.month - 1) / 12 : 0), minYear, maxYear, width), label: `RIP Deb ${debAge}`, color: '#8b5cf6' });
    }
    (entities ?? []).filter(e => e.type === 'pet' && e.appreciation_rate && e.term_years).forEach(e => {
      const deathYear = Math.round(e.appreciation_rate + e.term_years);
      allEvents.push({ key: `pet-death-${e.id}`, x: xPixel(deathYear, minYear, maxYear, width), label: `RIP ${e.name} ${e.term_years}`, color: '#f97316' });
    });
    allEvents.sort((a, b) => a.x - b.x);
    const staggerRows = [];
    allEvents.forEach(ev => {
      const labelWidth = ev.label.length * 5.5 + 10;
      let row = 0;
      while (row < staggerRows.length && ev.x < staggerRows[row] + 4) row++;
      if (row >= staggerRows.length) staggerRows.push(0);
      staggerRows[row] = ev.x + labelWidth;
      ev.labelOffset = row * 16;
    });
  }

  return (
    <div ref={ref} style={{ position: 'absolute', top: 0, bottom: 0, left: 12, right: 12, pointerEvents: 'none' }}>
      {width > 0 && (
        <>
          <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
            <defs>
              <clipPath id="plotAreaClip">
                <rect x={PLOT_OFFSET} y={0} width={width - PLOT_OFFSET - MARGIN_RIGHT} height={height} />
              </clipPath>
            </defs>
            {allEvents.map(ev => <EventLineSvg key={ev.key} x={ev.x} color={ev.color} height={height} />)}
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 0, width, height, zIndex: 20 }}>
            {allEvents.map(ev => <EventLabel key={`label-${ev.key}`} x={ev.x} label={ev.label} color={ev.color} labelOffset={ev.labelOffset} />)}
          </div>
        </>
      )}
    </div>
  );
}
