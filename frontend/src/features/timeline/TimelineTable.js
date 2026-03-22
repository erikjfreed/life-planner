import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTimeline } from './timelineSlice';

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

  useEffect(() => {
    if (status === 'idle') dispatch(fetchTimeline());
  }, [status, dispatch]);

  if (status === 'loading') return <p>Loading...</p>;
  if (status === 'failed') return <p>Error: {error}</p>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '13px', whiteSpace: 'nowrap' }}>
        <thead>
          <tr style={{ background: '#1a1a2e', color: '#fff' }}>
            {COLUMNS.map((col) => (
              <th key={col.key} style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '2px solid #444' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.year} style={{ background: i % 2 === 0 ? '#f9f9f9' : '#fff' }}>
              {COLUMNS.map((col) => (
                <td key={col.key} style={{ padding: '6px 12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                  {col.format(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
