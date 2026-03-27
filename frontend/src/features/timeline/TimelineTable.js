import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTimeline } from './timelineSlice';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getRowEvent(row, events, entities, params) {
  const labels = [];
  let type = null;

  const erikDeathEvent = events.find(e => e.type === 'spouse_death' && e.name === 'Erik');
  const debDeathEvent  = events.find(e => e.type === 'spouse_death' && e.name === 'Deb');

  if (erikDeathEvent && row.year === erikDeathEvent.year) {
    const age = params?.erikDOB ? erikDeathEvent.year - new Date(params.erikDOB).getFullYear() : '';
    labels.push(`RIP Erik ${age}`);
    type = 'spouse_death';
  }
  if (debDeathEvent && row.year === debDeathEvent.year) {
    const age = params?.debDOB ? debDeathEvent.year - new Date(params.debDOB).getFullYear() : '';
    labels.push(`RIP Deb ${age}`);
    type = 'spouse_death';
  }

  const endOfGameYear = erikDeathEvent && debDeathEvent
    ? Math.max(erikDeathEvent.year, debDeathEvent.year) + 2
    : null;
  if (endOfGameYear && row.year === endOfGameYear) {
    labels.push('EndGame');
    type = type || 'eog';
  }

  events.filter(e => e.type === 'social_security_start' && e.year === row.year).forEach(e => {
    labels.push(`SS ${e.name}${e.month ? ' ' + MONTHS[e.month - 1] : ''}`);
    type = type || 'ss';
  });

  entities.filter(e => e.type === 'pet' && e.appreciation_rate && e.term_years).forEach(e => {
    const deathYear = Math.round(e.appreciation_rate + e.term_years);
    if (deathYear === row.year) {
      labels.push(`RIP ${e.name} ${e.term_years}`);
      type = type || 'pet_death';
    }
  });

  events.filter(e => e.type === 'real_estate_buy' && e.year === row.year && !e.hidden).forEach(e => {
    const entity = entities.find(en => en.id === e.entity_id);
    labels.push(`Buy ${entity?.street_address ? entity.street_address.split(',')[0] : (entity?.name || '?')}`);
    type = type || 'real_estate_buy';
  });

  events.filter(e => e.type === 'real_estate_sell' && e.year === row.year && !e.hidden).forEach(e => {
    const entity = entities.find(en => en.id === e.entity_id);
    labels.push(`Sell ${entity?.street_address ? entity.street_address.split(',')[0] : (entity?.name || '?')}`);
    type = type || 'real_estate_sell';
  });

  events.filter(e => e.type === 'vehicle_buy' && e.year === row.year && !e.hidden).forEach(e => {
    const entity = entities.find(en => en.id === e.entity_id);
    labels.push(`Buy ${entity?.name || '?'}`);
    type = type || 'vehicle_buy';
  });

  events.filter(e => e.type === 'vehicle_sell' && e.year === row.year).forEach(e => {
    const entity = entities.find(en => en.id === e.entity_id);
    labels.push(`Sell ${entity?.name || '?'}`);
    type = type || 'vehicle_sell';
  });

  events.filter(e => e.type === 'vehicle_tradeup' && e.year === row.year).forEach(e => {
    const newEntity = entities.find(en => en.id === e.entity_id);
    labels.push(`Tradeup ${newEntity?.name || '?'}`);
    type = type || 'vehicle_tradeup';
  });

  if (labels.length === 0) return null;
  return { label: labels.join(', '), type };
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
  { key: 'real_estate_costs', label: 'Costs', group: 'Real Estate', format: fmt },
  { key: 'living', label: 'General', group: 'Expenses', format: fmt },
  { key: 'health', label: 'Health', group: 'Expenses', format: fmt },
  { key: 'pets', label: 'Pets', group: 'Expenses', format: fmt },
  { key: 'vehicles', label: 'Vehicles', group: 'Expenses', format: fmt },
  { key: 'travel', label: 'Travel', group: 'Expenses', format: fmt },
  { key: 'allowance', label: 'Allowance', group: 'Expenses', format: fmt },
  { key: 'cap_expense', label: 'Capital', group: 'Expenses', format: fmt },
  { key: 'total_expenses', label: 'Total', group: 'Expenses', format: fmt },
  { key: 'social_security_tax', label: 'SS', group: 'Tax', format: fmt },
  { key: 'draw_tax', label: 'Draw', group: 'Tax', format: fmt },
  { key: 'total_tax', label: 'Total', group: 'Tax', format: fmt },
  { key: 'roi', label: 'ROI', group: 'Income', format: fmt },
  { key: 'social_security_net', label: 'SS', group: 'Income', format: fmt },
  { key: 'gross_draw', label: 'Gross', group: 'Draw', format: fmt },
  { key: 'net_draw', label: 'NET', group: 'Draw', format: fmt },
  { key: 'capital_spend', label: 'Spend', group: 'Capital', format: fmt },
  { key: 'draw_rate', label: 'Rate', group: 'Capital', format: pct },
  { key: 'investment_balance', label: 'Investments', group: 'Wealth', format: fmt },
  { key: 'real_estate', label: 'Real Estate', group: 'Wealth', format: fmt },
  { key: 'invest_plus_re', label: 'NET', group: 'Wealth', format: fmt },
];

export default function TimelineTable() {
  const dispatch = useDispatch();
  const { rows, status, error } = useSelector((state) => state.timeline);
  const params = useSelector((s) => s.parameters.present.values);
  const events   = useSelector((s) => s.events.items);
  const entities = useSelector((s) => s.entities.items);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchTimeline());
  }, [status, dispatch]);

  if (status === 'loading') return <p>Loading...</p>;
  if (status === 'failed') return <p>Error: {error}</p>;

  return (
    <div style={{ overflowX: 'auto', paddingTop: 12, paddingLeft: 16 }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '11px', whiteSpace: 'nowrap' }}>
        <thead>
          <tr style={{ background: '#334155', color: '#e2e8f0' }}>
            {(() => {
              const cells = [];
              let i = 0;
              while (i < COLUMNS.length) {
                const col = COLUMNS[i];
                if (col.group) {
                  let span = 1;
                  while (i + span < COLUMNS.length && COLUMNS[i + span].group === col.group) span++;
                  cells.push(
                    <th key={col.group} colSpan={span} style={{ padding: '2px 8px', textAlign: 'center', border: '1px solid #475569', fontSize: 10, fontWeight: 700 }}>
                      {col.group}
                    </th>
                  );
                  i += span;
                } else {
                  cells.push(<th key={col.key} rowSpan={2} style={{ padding: '4px 2px', textAlign: 'center', borderBottom: '2px solid #475569' }}>{col.label}</th>);
                  i++;
                }
              }
              cells.push(<th key="event" rowSpan={2} style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '2px solid #475569' }}>Event</th>);
              return cells;
            })()}
          </tr>
          <tr style={{ background: '#334155', color: '#e2e8f0' }}>
            {COLUMNS.filter(c => c.group).map(col => (
              <th key={col.key} style={{ padding: '2px 8px', textAlign: 'center', border: '1px solid #475569', fontSize: 10 }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const event = getRowEvent(row, events, entities, params);
            const isDeath = event?.type === 'spouse_death';
            const isPetDeath = event?.type === 'pet_death';
            const isEog   = event?.type === 'eog';
            const isSS    = event?.type === 'ss';
            const isSell  = event?.type === 'real_estate_sell';
            const isBuy   = event?.type === 'real_estate_buy';
            const isVSell = event?.type === 'vehicle_sell';
            const isVBuy  = event?.type === 'vehicle_buy';
            const isVTradeup = event?.type === 'vehicle_tradeup';
            const eventColor = isDeath ? '#ef4444' : isPetDeath ? '#f97316' : isEog ? '#16a34a' : isSS ? '#2563eb' : isSell ? '#16a34a' : isBuy ? '#7c3aed' : (isVSell || isVBuy || isVTradeup) ? '#ec4899' : undefined;
            return (
              <tr key={row.year} style={{ background: i % 2 === 0 ? '#1e293b' : '#0f172a', color: '#e2e8f0' }}>
                {COLUMNS.map((col) => {
                  const narrow = col.key === 'year' || col.key === 'erik_age' || col.key === 'deb_age';
                  return (
                    <td key={col.key} style={{ padding: narrow ? '2px 3px' : '2px 8px', textAlign: 'right', borderBottom: '1px solid #334155' }}>
                      {col.format(col.compute ? col.compute(row) : row[col.key])}
                    </td>
                  );
                })}
                <td style={{ padding: '2px 8px', textAlign: 'left', borderBottom: '1px solid #334155', color: eventColor, fontWeight: event ? 600 : undefined, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={event?.label || ''}>
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
