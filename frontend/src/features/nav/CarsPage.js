import { useState } from 'react';
import { useSelector } from 'react-redux';

const fmt = v => `$${Math.round(v).toLocaleString()}`;

function VehiclePanel({ entity, buyEvent }) {
  const services = entity.services_json ? JSON.parse(entity.services_json) : [];
  const totalExpense = services.reduce((s, i) => s + i.yearly, 0);
  const age = new Date().getFullYear() - buyEvent.year;

  return (
    <div style={styles.panel}>
      {/* Summary */}
      <div style={styles.summaryRow}>
        <div style={styles.idCell}><div style={styles.summaryLabel}>Entity ID</div><div style={styles.idValue}>{entity.id}</div></div>
        {buyEvent.purchase_price != null && (
          <div style={styles.summaryCell}><div style={styles.summaryLabel}>Purchase Price</div><div style={styles.summaryValue}>{fmt(buyEvent.purchase_price)}</div></div>
        )}
        <div style={styles.summaryCell}><div style={styles.summaryLabel}>Year</div><div style={styles.summaryValue}>{buyEvent.year}</div></div>
        <div style={styles.summaryCell}><div style={styles.summaryLabel}>Age</div><div style={styles.summaryValue}>{age} yrs</div></div>
      </div>

      {/* Annual Expenses */}
      <div style={styles.sectionLabel}>Annual Expenses</div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Item</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Monthly</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Yearly</th>
          </tr>
        </thead>
        <tbody>
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
    </div>
  );
}

export default function CarsPage() {
  const entities = useSelector(s => s.entities.items);
  const events   = useSelector(s => s.events.items);

  const vehicles = entities.filter(e => e.type === 'vehicle').filter(entity =>
    events.some(ev => ev.type === 'car_buy' && ev.entity_id === entity.id)
  );

  const [activeId, setActiveId] = useState(null);
  const selected = vehicles.find(e => e.id === activeId) ?? vehicles[0];

  if (vehicles.length === 0) {
    return <div style={styles.page}><p style={{ color: '#6b7280', fontSize: 13 }}>No vehicles with a buy event.</p></div>;
  }

  const buyEvent = events.find(ev => ev.type === 'car_buy' && ev.entity_id === selected?.id);

  return (
    <div style={styles.page}>
      <div style={styles.subtabs}>
        {vehicles.map(entity => (
          <button
            key={entity.id}
            onClick={() => setActiveId(entity.id)}
            style={{ ...styles.subtab, ...(entity.id === selected?.id ? styles.subtabActive : {}) }}
          >
            {entity.name}
          </button>
        ))}
      </div>
      {selected && buyEvent && <VehiclePanel entity={selected} buyEvent={buyEvent} />}
    </div>
  );
}

const styles = {
  page: { padding: '16px 24px', fontFamily: 'sans-serif', overflowY: 'auto', height: '100%', boxSizing: 'border-box' },
  subtabs: { display: 'flex', gap: 2, borderBottom: '1px solid #e5e7eb', marginBottom: 20 },
  subtab: { padding: '6px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderBottom: '2px solid transparent', background: 'none', cursor: 'pointer', color: '#6b7280', marginBottom: -1 },
  subtabActive: { color: '#111827', borderBottom: '2px solid #2563eb', fontWeight: 600 },
  panel: { maxWidth: 600 },
  summaryRow: { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  summaryCell: { background: '#f3f4f6', borderRadius: 6, padding: '8px 12px', minWidth: 100 },
  idCell: { background: '#f9fafb', borderRadius: 6, padding: '8px 12px', minWidth: 50, border: '1px dashed #d1d5db' },
  summaryLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: 700, color: '#111827' },
  idValue: { fontSize: 14, fontWeight: 700, color: '#9ca3af', fontFamily: 'monospace' },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '16px 0 6px' },
  table: { borderCollapse: 'collapse', width: '100%' },
  th: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb', padding: '4px 8px', textAlign: 'left' },
  td: { fontSize: 12, padding: '3px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827' },
  subtotalRow: { background: '#f9fafb' },
  totalRow: { background: '#f3f4f6' },
};
