import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTimeline } from './timelineSlice';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getRowEvent(row, events, params) {
  const erikDeathEvent = events.find(e => e.type === 'death' && e.name === 'Erik');
  const debDeathEvent  = events.find(e => e.type === 'death' && e.name === 'Deb');

  const deathEvents = [];
  if (erikDeathEvent && row.year === erikDeathEvent.year) {
    const age = params?.erikDOB ? erikDeathEvent.year - new Date(params.erikDOB).getFullYear() : '';
    deathEvents.push(`RIP Erik ${age}`);
  }
  if (debDeathEvent && row.year === debDeathEvent.year) {
    const age = params?.debDOB ? debDeathEvent.year - new Date(params.debDOB).getFullYear() : '';
    deathEvents.push(`RIP Deb ${age}`);
  }
  if (deathEvents.length > 0) return { label: deathEvents.join(', '), type: 'death' };

  const endOfGameYear = erikDeathEvent && debDeathEvent
    ? Math.max(erikDeathEvent.year, debDeathEvent.year) + 2
    : null;
  if (endOfGameYear && row.year === endOfGameYear) return { label: 'EndGame', type: 'eog' };

  const ssLabels = events
    .filter(e => e.type === 'ss_start' && e.year === row.year)
    .map(e => `SS ${e.name}${e.month ? ' ' + MONTHS[e.month - 1] : ''}`);
  if (ssLabels.length > 0) return { label: ssLabels.join(', '), type: 'ss' };

  return null;
}

const fmt = (val) =>
  val == null || val === 0
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

const pct = (val) => (val == null || val === 0 ? '—' : `${(val * 100).toFixed(0)}%`);

const COLUMNS = [
  { key: 'year', label: 'Year', format: (v) => v },
  { key: 'erik_age', label: 'Erik', format: (v) => v },
  { key: 'deb_age', label: 'Deb', format: (v) => v },
  { key: 'loans', label: 'Loans', group: 'Real Estate', format: fmt },
  { key: 're_costs', label: 'Costs', group: 'Real Estate', format: fmt, compute: (r) => (r.orcas || 0) + (r.portland || 0) },
  { key: 'health', label: 'Health', group: 'Lifestyle', format: fmt },
  { key: 'dogs', label: 'Dogs', group: 'Lifestyle', format: fmt },
  { key: 'cars', label: 'Cars', group: 'Lifestyle', format: fmt },
  { key: 'travel', label: 'Travel', group: 'Lifestyle', format: fmt },
  { key: 'living', label: 'General', group: 'Lifestyle', format: fmt },
  { key: 'allowance', label: 'Allowance', group: 'Lifestyle', format: fmt },
  { key: 'ltc', label: 'LTC', group: 'Lifestyle', format: fmt },
  { key: 'total_expenses', label: 'Total Exp', format: fmt },
  { key: 'ss_net', label: 'SS Net', group: 'Income', format: fmt },
  { key: 'net_draw', label: 'Draw', group: 'Income', format: fmt },
  { key: 'draw_rate', label: 'Rate', group: 'Income', format: pct },
  { key: 'investment_balance', label: 'Investments', group: 'Wealth', format: fmt },
  { key: 'invest_plus_re', label: 'W/RE', group: 'Wealth', format: fmt },
];

export default function TimelineTable() {
  const dispatch = useDispatch();
  const { rows, status, error } = useSelector((state) => state.timeline);
  const params = useSelector((s) => s.parameters.present.values);
  const events = useSelector((s) => s.events.items);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchTimeline());
  }, [status, dispatch]);

  if (status === 'loading') return <p>Loading...</p>;
  if (status === 'failed') return <p>Error: {error}</p>;

  return (
    <div style={{ overflowX: 'auto', paddingTop: 12, paddingLeft: 16 }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '11px', whiteSpace: 'nowrap' }}>
        <thead>
          <tr style={{ background: '#d1d5db', color: '#111827' }}>
            {(() => {
              const cells = [];
              let i = 0;
              while (i < COLUMNS.length) {
                const col = COLUMNS[i];
                if (col.group) {
                  let span = 1;
                  while (i + span < COLUMNS.length && COLUMNS[i + span].group === col.group) span++;
                  cells.push(
                    <th key={col.group} colSpan={span} style={{ padding: '2px 8px', textAlign: 'center', border: '1px solid #999', fontSize: 10, fontWeight: 700 }}>
                      {col.group}
                    </th>
                  );
                  i += span;
                } else {
                  cells.push(<th key={col.key} rowSpan={2} style={{ padding: '4px 8px', textAlign: 'center', borderBottom: '2px solid #d1d5db' }}>{col.label}</th>);
                  i++;
                }
              }
              cells.push(<th key="event" rowSpan={2} style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '2px solid #d1d5db' }}>Event</th>);
              return cells;
            })()}
          </tr>
          <tr style={{ background: '#d1d5db', color: '#111827' }}>
            {COLUMNS.filter(c => c.group).map(col => (
              <th key={col.key} style={{ padding: '2px 8px', textAlign: 'center', border: '1px solid #999', fontSize: 10 }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const event = getRowEvent(row, events, params);
            const isDeath = event?.type === 'death';
            const isEog   = event?.type === 'eog';
            const isSS    = event?.type === 'ss';
            const outline = isDeath ? '1.5px solid #ef4444' : isEog ? '1.5px solid #16a34a' : isSS ? '1.5px solid #2563eb' : undefined;
            const eventColor = isDeath ? '#ef4444' : isEog ? '#16a34a' : isSS ? '#2563eb' : undefined;
            return (
              <tr key={row.year} style={{ background: i % 2 === 0 ? '#f9f9f9' : '#fff', outline }}>
                {COLUMNS.map((col) => (
                  <td key={col.key} style={{ padding: '2px 8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                    {col.format(col.compute ? col.compute(row) : row[col.key])}
                  </td>
                ))}
                <td style={{ padding: '2px 8px', textAlign: 'left', borderBottom: '1px solid #eee', color: eventColor, fontWeight: event ? 600 : undefined }}>
                  {event?.label || ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
