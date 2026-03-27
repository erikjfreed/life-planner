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
      <div style={styles.grid}>
        <span style={styles.label}>Days with Pets</span>
        <span style={styles.val}>
          <select value={daysWithPets} onChange={e => update('travelDaysWithPets')(parseInt(e.target.value))} style={styles.select}>
            {Array.from({ length: 53 }, (_, i) => i).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </span>
        <span />
        <span style={styles.label}>Days without Pets</span>
        <span style={styles.val}>
          <select value={daysWithoutPets} onChange={e => update('travelDaysWithoutPets')(parseInt(e.target.value))} style={styles.select}>
            {Array.from({ length: 53 }, (_, i) => i).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </span>
        <span style={styles.label}>Total Days</span>
        <span style={styles.val}>{totalDays}</span>
        <span />
        <span style={styles.label}>Travel Base</span>
        <span style={styles.val}>{fmt(params.travelBase)}</span>
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
          <tr style={{ background: '#0f172a' }}>
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
  grid: { display: 'inline-grid', gridTemplateColumns: 'auto auto 20px auto auto', gap: '6px 4px', alignItems: 'center', marginBottom: 16 },
  label: { fontSize: 12, color: '#94a3b8', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap', background: '#334155', padding: '2px 6px', borderRadius: 2 },
  val: { fontSize: 12, color: '#e2e8f0' },
  select: { fontSize: 12, border: '1px solid #475569', borderRadius: 3, padding: '0 2px', background: '#1e293b', color: '#e2e8f0' },
  table: { borderCollapse: 'collapse', width: 'auto' },
  th: { fontSize: 12, fontWeight: 600, color: '#94a3b8', borderBottom: '2px solid #334155', padding: '4px 8px', textAlign: 'left' },
  td: { fontSize: 12, padding: '3px 8px', borderBottom: '1px solid #334155', color: '#e2e8f0' },
};
