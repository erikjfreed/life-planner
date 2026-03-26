import { useDispatch, useSelector } from 'react-redux';
import { updateParameters } from '../parameters/parametersSlice';

const fmt = v => `$${Math.round(v).toLocaleString()}`;

export default function TravelPage() {
  const dispatch = useDispatch();
  const params = useSelector(s => s.parameters.present.values);

  if (!params || Object.keys(params).length === 0) return <p>Loading...</p>;

  const update = (key) => (value) => dispatch(updateParameters({ [key]: value }));

  const daysWithPets = params.travelDaysWithPets ?? 21;
  const daysWithoutPets = params.travelDaysWithoutPets ?? 14;
  const totalDays = daysWithPets + daysWithoutPets;

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Travel</h2>

      <div style={styles.summaryRow}>
        <div style={styles.summaryCell}>
          <div style={styles.summaryLabel}>Days with Pets</div>
          <div style={styles.summaryValue}>
            <select value={daysWithPets} onChange={e => update('travelDaysWithPets')(parseInt(e.target.value))} style={styles.select}>
              {Array.from({ length: 53 }, (_, i) => i).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div style={styles.summaryCell}>
          <div style={styles.summaryLabel}>Days without Pets</div>
          <div style={styles.summaryValue}>
            <select value={daysWithoutPets} onChange={e => update('travelDaysWithoutPets')(parseInt(e.target.value))} style={styles.select}>
              {Array.from({ length: 53 }, (_, i) => i).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div style={styles.summaryCell}>
          <div style={styles.summaryLabel}>Total Days</div>
          <div style={styles.summaryValue}>{totalDays}</div>
        </div>
        <div style={styles.summaryCell}>
          <div style={styles.summaryLabel}>Travel Base</div>
          <div style={styles.summaryValue}>{fmt(params.travelBase)}</div>
        </div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Item</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Days</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Yearly</th>
            <th style={styles.th}>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: '#1e293b' }}>
            <td style={styles.td}>Travel with Pets</td>
            <td style={{ ...styles.td, textAlign: 'right' }}>{daysWithPets}</td>
            <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(params.travelBase * (daysWithPets / totalDays))}</td>
            <td style={{ ...styles.td, color: '#94a3b8' }}>Pets travel along</td>
          </tr>
          <tr>
            <td style={styles.td}>Travel without Pets</td>
            <td style={{ ...styles.td, textAlign: 'right' }}>{daysWithoutPets}</td>
            <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(params.travelBase * (daysWithoutPets / totalDays))}</td>
            <td style={{ ...styles.td, color: '#94a3b8' }}>Pets need boarding</td>
          </tr>
          <tr style={{ background: '#334155' }}>
            <td style={styles.td}><strong>Total</strong></td>
            <td style={{ ...styles.td, textAlign: 'right' }}><strong>{totalDays}</strong></td>
            <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(params.travelBase)}</strong></td>
            <td style={styles.td} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  page: { padding: '16px 24px', fontFamily: 'sans-serif', overflowY: 'auto', height: '100%', boxSizing: 'border-box' },
  title: { margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#e2e8f0' },
  summaryRow: { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  summaryCell: { background: '#1e293b', borderRadius: 6, padding: '8px 12px', minWidth: 100 },
  summaryLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: 700, color: '#e2e8f0' },
  select: { fontSize: 14, fontWeight: 700, border: '1px solid #475569', borderRadius: 3, padding: '1px 4px', background: '#1e293b', color: '#e2e8f0' },
  table: { borderCollapse: 'collapse', width: 'auto' },
  th: { fontSize: 12, fontWeight: 600, color: '#94a3b8', borderBottom: '2px solid #334155', padding: '4px 8px', textAlign: 'left' },
  td: { fontSize: 12, padding: '4px 8px', borderBottom: '1px solid #334155', color: '#e2e8f0' },
};
