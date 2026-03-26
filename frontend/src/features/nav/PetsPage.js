import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateEntity } from '../entities/entitiesSlice';
import { updateParameters } from '../parameters/parametersSlice';

const fmt = v => `$${Math.round(v).toLocaleString()}`;

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function ripDate(dateStr, lifespan) {
  if (!dateStr || !lifespan) return '—';
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + Math.floor(lifespan));
  d.setMonth(d.getMonth() + Math.round((lifespan % 1) * 12));
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}


export default function PetsPage() {
  const dispatch = useDispatch();
  const entities = useSelector(s => s.entities.items);
  const params = useSelector(s => s.parameters.present.values);
  const petEntities = entities.filter(e => e.type === 'pet');
  const [activeId, setActiveId] = useState(null);
  const selected = petEntities.find(e => e.id === activeId) ?? petEntities[0];

  if (petEntities.length === 0) {
    return <div style={styles.page}><p style={{ color: '#6b7280', fontSize: 13 }}>No pet entities.</p></div>;
  }

  const services = selected ? (selected.services_json ? JSON.parse(selected.services_json) : []) : [];
  const totalYearly = services.reduce((s, i) => s + i.yearly, 0);
  const update = (key) => (value) => dispatch(updateParameters({ [key]: value }));

  return (
    <div style={styles.page}>
      <div style={styles.grid}>
        <span style={styles.label}>Boarding $/Day</span>
        <select
          value={params?.boardingCostPerPetPerDay ?? 75}
          onChange={e => update('boardingCostPerPetPerDay')(parseInt(e.target.value))}
          style={styles.select}
        >
          {Array.from({ length: 39 }, (_, i) => (i + 2) * 25).map(v => (
            <option key={v} value={v}>${v}</option>
          ))}
        </select>
        <span style={styles.label}>Boarding Days/Year</span>
        <span style={styles.val}>{params?.travelDaysWithoutPets ?? 21}</span>
      </div>

      <div style={styles.subtabs}>
        {petEntities.map(entity => (
          <button
            key={entity.id}
            onClick={() => setActiveId(entity.id)}
            style={{ ...styles.subtab, ...(entity.id === selected?.id ? styles.subtabActive : {}) }}
          >
            {entity.name}
          </button>
        ))}
      </div>

      {selected && (
        <div>
          <div style={styles.grid}>
            <span style={styles.label}>ID</span>
            <span style={styles.val}>{selected.id}</span>
            <span style={styles.label}>Lifespan</span>
            <span style={styles.val}>
              <select
                value={selected.term_years || 12.5}
                onChange={e => dispatch(updateEntity({ ...selected, id: selected.id, term_years: parseFloat(e.target.value) }))}
                style={styles.select}
              >
                {Array.from({ length: 31 }, (_, i) => 5 + i * 0.5).map(v => (
                  <option key={v} value={v}>{v} yrs</option>
                ))}
              </select>
            </span>
            <span style={styles.label}>Born</span>
            <span style={styles.val}>{fmtDate(selected.street_address)}</span>
            <span style={styles.label}>Name</span>
            <span style={styles.val}>{selected.name}</span>
            <span style={styles.label}>Yearly Cost</span>
            <span style={styles.val}>{fmt(totalYearly)}</span>
            <span style={styles.label}>RIP</span>
            <span style={styles.val}>{ripDate(selected.street_address, selected.term_years)}</span>
          </div>

          <div style={{ marginTop: 8 }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Item</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Monthly</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Yearly</th>
                  <th style={styles.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {services.map((item, i) => (
                  <tr key={item.label} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                    <td style={styles.td}>{item.label}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(item.monthly)}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(item.yearly)}</td>
                    <td style={{ ...styles.td, color: '#6b7280' }}>
                      {item.label === 'Boarding' ? `${params?.travelDaysWithoutPets ?? 21} days @ $${params?.boardingCostPerPetPerDay ?? 75}/day` : ''}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#f3f4f6' }}>
                  <td style={styles.td}><strong>Total</strong></td>
                  <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(services.reduce((s, i) => s + i.monthly, 0))}</strong></td>
                  <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(totalYearly)}</strong></td>
                  <td style={styles.td} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '8px 16px', fontFamily: 'sans-serif', overflowY: 'auto', height: '100%', boxSizing: 'border-box' },
  subtabs: { display: 'flex', gap: 2, borderBottom: '1px solid #e5e7eb', marginBottom: 8 },
  subtab: { padding: '6px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderBottom: '2px solid transparent', background: 'none', cursor: 'pointer', color: '#6b7280', marginBottom: -1 },
  subtabActive: { color: '#111827', borderBottom: '2px solid #2563eb', fontWeight: 600 },
  grid: { display: 'inline-grid', gridTemplateColumns: 'auto auto auto auto auto auto', gap: '2px 20px', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 11, color: '#6b7280', textAlign: 'right', whiteSpace: 'nowrap' },
  val: { fontSize: 11, color: '#111827', fontWeight: 600 },
  table: { borderCollapse: 'collapse', width: 'auto' },
  th: { fontSize: 11, fontWeight: 600, color: '#6b7280', borderBottom: '2px solid #e5e7eb', padding: '2px 6px', textAlign: 'left' },
  td: { fontSize: 11, padding: '2px 6px', borderBottom: '1px solid #f3f4f6', color: '#111827' },
  select: { fontSize: 11, fontWeight: 600, border: '1px solid #d1d5db', borderRadius: 3, padding: '0 2px' },
};
