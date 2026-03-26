import { useState } from 'react';
import { useSelector } from 'react-redux';

const fmt = v => `$${Math.round(v).toLocaleString()}`;

function VehiclePanel({ entity, buyEvent }) {
  const services = entity.services_json ? JSON.parse(entity.services_json) : [];
  const totalExpense = services.reduce((s, i) => s + i.yearly, 0);
  const age = new Date().getFullYear() - buyEvent.year;

  return (
    <div style={styles.panel}>
      <div style={styles.grid}>
        <span style={styles.labelCell}>ID</span>
        <span style={styles.val}>{entity.id}</span>
        <span />
        <span style={styles.labelCell}>Owner</span>
        <span style={styles.val}>{entity.street_address || '—'}</span>
        <span style={styles.labelCell}>Purchase Price</span>
        <span style={styles.val}>{buyEvent.purchase_price != null ? fmt(buyEvent.purchase_price) : '—'}</span>
        <span />
        <span style={styles.labelCell}>Purchase Date</span>
        <span style={styles.val}>{`${buyEvent.month || 1}/1/${buyEvent.year}`}</span>
        <span style={styles.labelCell}>Age</span>
        <span style={styles.val}>{age} yrs</span>
        <span />
        <span style={styles.labelCell}>Yearly Cost</span>
        <span style={styles.val}>{fmt(totalExpense)}</span>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Item</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Monthly</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Yearly</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s, i) => (
            <tr key={s.label} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
              <td style={styles.td}>{s.label}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(s.monthly)}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(s.yearly)}</td>
            </tr>
          ))}
          <tr style={{ background: '#f3f4f6' }}>
            <td style={styles.td}><strong>Total</strong></td>
            <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(totalExpense / 12)}</strong></td>
            <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(totalExpense)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function VehiclesPage() {
  const entities = useSelector(s => s.entities.items);
  const events   = useSelector(s => s.events.items);

  const vehicles = entities.filter(e => e.type === 'vehicle');

  const [activeId, setActiveId] = useState(null);
  const selected = vehicles.find(e => e.id === activeId) ?? vehicles[0];

  if (vehicles.length === 0) {
    return <div style={styles.page}><p style={{ color: '#6b7280', fontSize: 13 }}>No vehicle entities.</p></div>;
  }

  const buyEvent = events.find(ev => ev.type === 'vehicle_buy' && ev.entity_id === selected?.id);
  const notYetBought = !buyEvent;

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
      {selected && notYetBought && (
        <div style={styles.panel}>
          <div style={styles.grid}>
            <span style={styles.labelCell}>ID</span>
            <span style={styles.val}>{selected.id}</span>
            <span />
            <span style={styles.labelCell}>Owner</span>
            <span style={styles.val}>{selected.street_address || '—'}</span>
            <span style={styles.labelCell}>Status</span>
            <span style={styles.val}>Not yet purchased</span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '16px 24px', fontFamily: 'sans-serif', overflowY: 'auto', height: '100%', boxSizing: 'border-box' },
  subtabs: { display: 'flex', gap: 6, marginBottom: 12 },
  subtab: { padding: '4px 14px', fontSize: 12, fontWeight: 500, border: 'none', borderLeft: '2px solid #d1d5db', borderBottom: '2px solid #d1d5db', borderRadius: '0 0 0 8px', background: 'none', cursor: 'pointer', color: '#6b7280' },
  subtabActive: { color: '#111827', borderLeftColor: '#2563eb', borderBottomColor: '#2563eb', fontWeight: 600 },
  panel: { maxWidth: 600, border: '1px solid #e5e7eb', borderRadius: 6, padding: '12px 16px' },
  grid: { display: 'inline-grid', gridTemplateColumns: 'auto auto 20px auto auto', gap: '6px 4px', alignItems: 'center', marginBottom: 12 },
  labelCell: { fontSize: 11, color: '#6b7280', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap', background: '#f3f4f6', padding: '2px 6px', borderRadius: 2 },
  val: { fontSize: 11, color: '#111827' },
  table: { borderCollapse: 'collapse', width: '100%' },
  th: { fontSize: 11, fontWeight: 600, color: '#6b7280', borderBottom: '2px solid #e5e7eb', padding: '4px 8px', textAlign: 'left' },
  td: { fontSize: 12, padding: '3px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827' },
};
