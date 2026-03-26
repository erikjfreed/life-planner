import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateEntity } from '../entities/entitiesSlice';

const fmt = v => `$${Math.round(v).toLocaleString()}`;

export default function PetsPage() {
  const dispatch = useDispatch();
  const entities = useSelector(s => s.entities.items);
  const petEntities = entities.filter(e => e.type === 'pet');
  const [activeId, setActiveId] = useState(null);
  const selected = petEntities.find(e => e.id === activeId) ?? petEntities[0];

  if (petEntities.length === 0) {
    return <div style={styles.page}><p style={{ color: '#6b7280', fontSize: 13 }}>No pet entities.</p></div>;
  }

  const services = selected ? (selected.services_json ? JSON.parse(selected.services_json) : []) : [];
  const totalYearly = services.reduce((s, i) => s + i.yearly, 0);

  return (
    <div style={styles.page}>
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
          <div style={styles.summaryRow}>
            <div style={styles.idCell}><div style={styles.summaryLabel}>Entity ID</div><div style={styles.idValue}>{selected.id}</div></div>
            <div style={styles.summaryCell}><div style={styles.summaryLabel}>Name</div><div style={styles.summaryValue}>{selected.name}</div></div>
            {selected.appreciation_rate && <div style={styles.summaryCell}><div style={styles.summaryLabel}>Born</div><div style={styles.summaryValue}>{selected.appreciation_rate}</div></div>}
            <div style={styles.summaryCell}>
              <div style={styles.summaryLabel}>Lifespan</div>
              <div style={styles.summaryValue}>
                <select
                  value={selected.term_years || 12.5}
                  onChange={e => dispatch(updateEntity({ ...selected, id: selected.id, term_years: parseFloat(e.target.value) }))}
                  style={styles.select}
                >
                  {Array.from({ length: 31 }, (_, i) => 5 + i * 0.5).map(v => (
                    <option key={v} value={v}>{v} yrs</option>
                  ))}
                </select>
              </div>
            </div>
            {selected.appreciation_rate && selected.term_years && (
              <div style={styles.summaryCell}><div style={styles.summaryLabel}>RIP</div><div style={styles.summaryValue}>{selected.appreciation_rate + selected.term_years}</div></div>
            )}
            <div style={styles.summaryCell}><div style={styles.summaryLabel}>Yearly Cost</div><div style={styles.summaryValue}>{fmt(totalYearly)}</div></div>
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
              {services.map((item, i) => (
                <tr key={item.label} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                  <td style={styles.td}>{item.label}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(item.monthly)}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(item.yearly)}</td>
                </tr>
              ))}
              <tr style={{ background: '#f3f4f6' }}>
                <td style={styles.td}><strong>Total</strong></td>
                <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(services.reduce((s, i) => s + i.monthly, 0))}</strong></td>
                <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(totalYearly)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '16px 24px', fontFamily: 'sans-serif', overflowY: 'auto', height: '100%', boxSizing: 'border-box' },
  subtabs: { display: 'flex', gap: 2, borderBottom: '1px solid #e5e7eb', marginBottom: 20 },
  subtab: { padding: '6px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderBottom: '2px solid transparent', background: 'none', cursor: 'pointer', color: '#6b7280', marginBottom: -1 },
  subtabActive: { color: '#111827', borderBottom: '2px solid #2563eb', fontWeight: 600 },
  summaryRow: { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  summaryCell: { background: '#f3f4f6', borderRadius: 6, padding: '8px 12px', minWidth: 100 },
  idCell: { background: '#f9fafb', borderRadius: 6, padding: '8px 12px', minWidth: 50, border: '1px dashed #d1d5db' },
  summaryLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: 700, color: '#111827' },
  idValue: { fontSize: 14, fontWeight: 700, color: '#9ca3af', fontFamily: 'monospace' },
  table: { borderCollapse: 'collapse', width: 'auto' },
  th: { fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '2px solid #e5e7eb', padding: '4px 8px', textAlign: 'left' },
  td: { fontSize: 12, padding: '4px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827' },
  select: { fontSize: 14, fontWeight: 700, border: '1px solid #d1d5db', borderRadius: 3, padding: '1px 4px' },
};
