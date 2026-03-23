import { useState } from 'react';
import { useSelector } from 'react-redux';

const fmt  = v => `$${Math.round(v).toLocaleString()}`;

function buildValues(purchasePrice, purchaseYear, rate, endYear = 2060) {
  const rows = [];
  let value = purchasePrice;
  for (let year = purchaseYear; year <= endYear; year++) {
    rows.push({ year, value });
    value = value * (1 + rate);
  }
  return rows;
}

function PropertyPanel({ entity, buyEvent, endYear }) {
  const [view, setView] = useState('expenses');
  const services = entity.services_json ? JSON.parse(entity.services_json) : [];
  const serviceTotal = services.reduce((s, i) => s + i.yearly, 0);
  const totalExpense = serviceTotal + (entity.tax_yearly ?? 0) + (entity.insurance_yearly ?? 0);
  const rate = entity.appreciation_rate ?? 0.05;
  const values = buildValues(buyEvent.purchase_price, buyEvent.year, rate, endYear);

  return (
    <div style={styles.propertyPanel}>
      <div style={styles.summaryRow}>
        <div style={styles.summaryCell}><div style={styles.summaryLabel}>Purchase Price</div><div style={styles.summaryValue}>{fmt(buyEvent.purchase_price)}</div></div>
        <div style={styles.summaryCell}><div style={styles.summaryLabel}>Year</div><div style={styles.summaryValue}>{buyEvent.year}</div></div>
      </div>

      <div style={styles.innerTabs}>
        <button onClick={() => setView('expenses')} style={{ ...styles.innerTab, ...(view === 'expenses' ? styles.innerTabActive : {}) }}>Expenses</button>
        <button onClick={() => setView('values')} style={{ ...styles.innerTab, ...(view === 'values' ? styles.innerTabActive : {}) }}>Appreciation</button>
      </div>

      {view === 'expenses' && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Item</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Monthly</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Yearly</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.td}>Property Tax</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt((entity.tax_yearly ?? 0) / 12)}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(entity.tax_yearly ?? 0)}</td>
            </tr>
            <tr>
              <td style={styles.td}>Insurance</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt((entity.insurance_yearly ?? 0) / 12)}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(entity.insurance_yearly ?? 0)}</td>
            </tr>
            {services.map(s => (
              <tr key={s.label}>
                <td style={styles.td}>{s.label}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(s.monthly)}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(s.yearly)}</td>
              </tr>
            ))}
            <tr style={styles.totalRow}>
              <td style={styles.td}><strong>Total</strong></td>
              <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(totalExpense / 12)}</strong></td>
              <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(totalExpense)}</strong></td>
            </tr>
          </tbody>
        </table>
      )}

      {view === 'values' && (
        <div style={styles.valueScroll}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Year</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Value ({(rate * 100).toFixed(1)}%)</th>
              </tr>
            </thead>
            <tbody>
              {values.map((r, i) => (
                <tr key={r.year} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                  <td style={styles.td}>{r.year}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(r.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function RealEstatePage() {
  const entities = useSelector(s => s.entities.items);
  const events   = useSelector(s => s.events.items);

  const reEntities = entities.filter(e => e.type === 'real_estate').filter(entity =>
    events.some(ev => ev.type === 're_buy' && ev.entity_id === entity.id)
  );

  const deathYears = events.filter(e => e.type === 'death').map(e => e.year);
  const endOfGame = deathYears.length > 0 ? Math.max(...deathYears) + 2 : 2060;

  const [activeId, setActiveId] = useState(null);
  const selected = reEntities.find(e => e.id === activeId) ?? reEntities[0];

  if (reEntities.length === 0) {
    return <div style={styles.page}><p style={{ color: '#6b7280', fontSize: 13 }}>No real estate entities with a buy event.</p></div>;
  }

  const buyEvent = events.find(ev => ev.type === 're_buy' && ev.entity_id === selected?.id);

  return (
    <div style={styles.page}>
      <div style={styles.subtabs}>
        {reEntities.map(entity => (
          <button
            key={entity.id}
            onClick={() => setActiveId(entity.id)}
            style={{ ...styles.subtab, ...(entity.id === selected?.id ? styles.subtabActive : {}) }}
          >
            {entity.street_address || entity.name}
          </button>
        ))}
      </div>
      {selected && buyEvent && <PropertyPanel entity={selected} buyEvent={buyEvent} endYear={endOfGame} />}
    </div>
  );
}

const styles = {
  page: { padding: '16px 24px', fontFamily: 'sans-serif', overflowY: 'auto', height: '100%', boxSizing: 'border-box' },
  subtabs: { display: 'flex', gap: 2, borderBottom: '1px solid #e5e7eb', marginBottom: 20 },
  subtab: { padding: '6px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderBottom: '2px solid transparent', background: 'none', cursor: 'pointer', color: '#6b7280', marginBottom: -1 },
  subtabActive: { color: '#111827', borderBottom: '2px solid #2563eb', fontWeight: 600 },
  propertyPanel: { maxWidth: 600 },
  innerTabs: { display: 'flex', gap: 6, marginBottom: 12 },
  innerTab: { padding: '4px 14px', fontSize: 12, fontWeight: 500, border: 'none', borderLeft: '2px solid #d1d5db', borderBottom: '2px solid #d1d5db', borderRadius: '0 0 0 8px', background: 'none', cursor: 'pointer', color: '#6b7280' },
  innerTabActive: { color: '#111827', borderLeftColor: '#2563eb', borderBottomColor: '#2563eb', fontWeight: 600 },
  summaryRow: { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  summaryCell: { background: '#f3f4f6', borderRadius: 6, padding: '8px 12px', minWidth: 100 },
  summaryLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: 700, color: '#111827' },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '16px 0 6px' },
  table: { borderCollapse: 'collapse', width: '100%' },
  th: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb', padding: '4px 8px', textAlign: 'left' },
  td: { fontSize: 12, padding: '3px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827' },
  subtotalRow: { background: '#f9fafb' },
  totalRow: { background: '#f3f4f6' },
  valueScroll: { maxHeight: 300, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 4 },
};
