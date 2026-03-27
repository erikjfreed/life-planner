import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateEvent, fetchEvents } from '../events/eventsSlice';

const fmt = v => `$${Math.round(v).toLocaleString()}`;

function VehiclePanel({ entity, buyEvent, sellEvent, nextEntity, dispatch }) {
  const services = entity.services_json ? JSON.parse(entity.services_json) : [];
  const totalExpense = services.reduce((s, i) => s + i.yearly, 0);
  const owner = entity.street_address;

  const handleSellYearChange = async (yearVal) => {
    if (yearVal === '') {
      // Clear tradeup
      if (nextEntity) {
        await fetch('/api/vehicle-tradeup', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sell_entity_id: entity.id, buy_entity_id: nextEntity.id }),
        });
      }
    } else {
      // Create tradeup
      if (nextEntity) {
        await fetch('/api/vehicle-tradeup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sell_entity_id: entity.id, buy_entity_id: nextEntity.id, year: parseInt(yearVal), purchase_price: 50000 }),
        });
      }
    }
    dispatch(fetchEvents());
  };

  return (
    <div style={styles.panel}>
      <div style={styles.grid}>
        <span style={styles.labelCell}>ID</span>
        <span style={styles.val}>{entity.id}</span>
        <span />
        <span style={styles.labelCell}>Owner</span>
        <span style={styles.val}>{owner || '—'}</span>
        <span style={styles.labelCell}>Purchase Price</span>
        <span style={styles.val}>{buyEvent.purchase_price != null ? fmt(buyEvent.purchase_price) : '—'}</span>
        <span />
        <span style={styles.labelCell}>Purchase Date</span>
        <span style={styles.val}>{`${buyEvent.month || 1}/1/${buyEvent.year}`}</span>
        <span style={styles.labelCell}>Yearly Cost</span>
        <span style={styles.val}>{fmt(totalExpense)}</span>
        <span />
        <span style={styles.labelCell}>Sell Year</span>
        <span style={styles.val}>
          <select
            value={sellEvent?.year ?? ''}
            onChange={e => handleSellYearChange(e.target.value)}
            style={styles.select}
          >
            <option value="">—</option>
            {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() + i).map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </span>
        {sellEvent ? (() => {
          const yearsOwned = sellEvent.year - buyEvent.year;
          const depRate = entity.appreciation_rate ?? -0.075;
          const estimatedValue = Math.round(buyEvent.purchase_price * Math.pow(1 + depRate, yearsOwned) / 1000) * 1000;
          return <>
            <span style={styles.labelCell}>Sale Price</span>
            <span style={styles.val}>
              <select
                value={sellEvent.sale_price ?? estimatedValue}
                onChange={e => dispatch(updateEvent({ ...sellEvent, sale_price: parseInt(e.target.value) }))}
                style={styles.select}
              >
                {Array.from({ length: 80 }, (_, i) => (i + 1) * 1000).map(v => (
                  <option key={v} value={v}>{fmt(v)}</option>
                ))}
              </select>
            </span>
            <span />
            <span style={styles.labelCell}>Est. Depreciated</span>
            <span style={styles.val}>{fmt(estimatedValue)}</span>
          </>;
        })() : null}
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
            <tr key={s.label} style={{ background: i % 2 === 0 ? '#1e293b' : '#0f172a' }}>
              <td style={styles.td}>{s.label}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(s.monthly)}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(s.yearly)}</td>
            </tr>
          ))}
          <tr style={{ background: '#334155' }}>
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
  const dispatch = useDispatch();
  const entities = useSelector(s => s.entities.items);
  const events   = useSelector(s => s.events.items);

  const vehicles = entities.filter(e => e.type === 'vehicle');

  const [activeId, setActiveId] = useState(null);
  const selected = vehicles.find(e => e.id === activeId) ?? vehicles[0];

  if (vehicles.length === 0) {
    return <div style={styles.page}><p style={{ color: '#94a3b8', fontSize: 13 }}>No vehicle entities.</p></div>;
  }

  const buyEvent = events.find(ev => ev.type === 'vehicle_buy' && ev.entity_id === selected?.id);
  const sellEvent = events.find(ev => ev.type === 'vehicle_sell' && ev.entity_id === selected?.id);
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
      {selected && buyEvent && (() => {
        const owner = selected.street_address;
        const nextEntity = vehicles.find(v => v.street_address === owner && v.id !== selected.id && !events.some(e => e.type === 'vehicle_buy' && e.entity_id === v.id && e.hidden));
        return <VehiclePanel entity={selected} buyEvent={buyEvent} sellEvent={sellEvent} nextEntity={nextEntity} dispatch={dispatch} />;
      })()}
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
  subtab: { padding: '4px 14px', fontSize: 12, fontWeight: 500, border: 'none', borderLeft: '2px solid #334155', borderBottom: '2px solid #334155', borderRadius: '0 0 0 8px', background: 'none', cursor: 'pointer', color: '#94a3b8' },
  subtabActive: { color: '#e2e8f0', borderLeftColor: '#2563eb', borderBottomColor: '#2563eb', fontWeight: 600 },
  panel: { maxWidth: 600, border: '1px solid #334155', borderRadius: 6, padding: '12px 16px' },
  grid: { display: 'inline-grid', gridTemplateColumns: 'auto auto 20px auto auto', gap: '6px 4px', alignItems: 'center', marginBottom: 12 },
  labelCell: { fontSize: 12, color: '#94a3b8', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap', background: '#334155', padding: '2px 6px', borderRadius: 2 },
  val: { fontSize: 12, color: '#e2e8f0' },
  select: { fontSize: 12, border: '1px solid #475569', borderRadius: 3, padding: '0 2px', background: '#1e293b', color: '#e2e8f0' },
  table: { borderCollapse: 'collapse', width: '100%' },
  th: { fontSize: 12, fontWeight: 600, color: '#94a3b8', borderBottom: '2px solid #334155', padding: '4px 8px', textAlign: 'left' },
  td: { fontSize: 12, padding: '3px 8px', borderBottom: '1px solid #334155', color: '#e2e8f0' },
};
