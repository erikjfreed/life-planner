import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTimeline } from './timelineSlice';

function getRowEvent(row, params) {
  const deathEvents = [];
  if (params?.erikDeathYear && row.year === params.erikDeathYear) {
    const age = params.erikDOB ? params.erikDeathYear - new Date(params.erikDOB).getFullYear() : '';
    deathEvents.push(`Erik ${age}`);
  }
  if (params?.debDeathYear && row.year === params.debDeathYear) {
    const age = params.debDOB ? params.debDeathYear - new Date(params.debDOB).getFullYear() : '';
    deathEvents.push(`Deb ${age}`);
  }
  if (deathEvents.length > 0) return { label: deathEvents.join(', '), type: 'death' };

  const endOfGameYear = params?.erikDeathYear && params?.debDeathYear
    ? Math.max(params.erikDeathYear, params.debDeathYear) + 2
    : null;
  if (endOfGameYear && row.year === endOfGameYear) return { label: 'EndGame', type: 'eog' };

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
  { key: 'loans', label: 'Loans', format: fmt },
  { key: 'health', label: 'Health', format: fmt },
  { key: 'dogs', label: 'Dogs', format: fmt },
  { key: 'cars', label: 'Cars', format: fmt },
  { key: 'travel', label: 'Travel', format: fmt },
  { key: 'living', label: 'Living', format: fmt },
  { key: 'allowance', label: 'Allowance', format: fmt },
  { key: 'orcas', label: 'Orcas', format: fmt },
  { key: 'portland', label: 'Portland', format: fmt },
  { key: 'ltc', label: 'LTC', format: fmt },
  { key: 'total_expenses', label: 'Total Exp', format: fmt },
  { key: 'ss_net', label: 'SS Net', format: fmt },
  { key: 'net_draw', label: 'Draw', format: fmt },
  { key: 'draw_rate', label: 'Rate', format: pct },
  { key: 'investment_balance', label: 'Investments', format: fmt },
  { key: 'invest_plus_re', label: 'Total Wealth', format: fmt },
];

export default function TimelineTable() {
  const dispatch = useDispatch();
  const { rows, status, error } = useSelector((state) => state.timeline);
  const params = useSelector((s) => s.parameters.present.values);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchTimeline());
  }, [status, dispatch]);

  if (status === 'loading') return <p>Loading...</p>;
  if (status === 'failed') return <p>Error: {error}</p>;

  return (
    <div style={{ overflowX: 'auto', paddingTop: 12 }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '11px', whiteSpace: 'nowrap' }}>
        <thead>
          <tr style={{ background: '#d1d5db', color: '#111827' }}>
            {COLUMNS.map((col) => (
              <th key={col.key} style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '2px solid #d1d5db' }}>
                {col.label}
              </th>
            ))}
            <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '2px solid #d1d5db' }}>Event</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const event = getRowEvent(row, params);
            const isDeath = event?.type === 'death';
            const isEog   = event?.type === 'eog';
            const outline = isDeath ? '1.5px solid #ef4444' : isEog ? '1.5px solid #16a34a' : undefined;
            const eventColor = isDeath ? '#ef4444' : isEog ? '#16a34a' : undefined;
            return (
              <tr key={row.year} style={{ background: i % 2 === 0 ? '#f9f9f9' : '#fff', outline }}>
                {COLUMNS.map((col) => (
                  <td key={col.key} style={{ padding: '2px 8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                    {col.format(row[col.key])}
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
