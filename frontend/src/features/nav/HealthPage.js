import { useDispatch, useSelector } from 'react-redux';
import { updateParameters } from '../parameters/parametersSlice';

// From health.csv — annual min/max per person
const ITEMS = [
  { label: 'Part A',           min:    0, max:    0, note: "Hospital & skilled nursing" },
  { label: 'Part B',           min: 4440, max: 4440, note: "Doctor in & out" },
  { label: 'Kaiser Advantage', min:    0, max: 5300, note: "Kaiser Medicare + prescriptions" },
  { label: 'Part D',           min:  200, max: 2000, note: "Kaiser prescriptions" },
  { label: 'Kaiser Plus',      min:  528, max: 5828, note: "Kaiser dental/vision" },
];

const PER_PERSON_MIN = ITEMS.reduce((s, i) => s + i.min, 0); // 5168
const PER_PERSON_MAX = ITEMS.reduce((s, i) => s + i.max, 0); // 17568
const COUPLE_MIN = PER_PERSON_MIN * 2; // 9936
const COUPLE_MAX = PER_PERSON_MAX * 2; // 35136

const fmt = v => `$${v.toLocaleString()}`;
const PCT_OPTIONS = Array.from({ length: 101 }, (_, i) => i); // 0-100

export default function HealthPage() {
  const dispatch = useDispatch();
  const params = useSelector(s => s.parameters.present.values);

  if (!params || !params.healthScenarioPct === undefined) return <p>Loading...</p>;

  const pct = params.healthScenarioPct ?? 0.45;
  const annual = Math.round(COUPLE_MIN + pct * (COUPLE_MAX - COUPLE_MIN));

  const handlePctChange = (newPct) => {
    const newBase = Math.round(COUPLE_MIN + newPct * (COUPLE_MAX - COUPLE_MIN));
    dispatch(updateParameters({ healthScenarioPct: newPct, healthBase: newBase }));
  };

  return (
    <div style={styles.page}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Plan</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Yr Min</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Yr Max</th>
            <th style={styles.th}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {ITEMS.map(item => (
            <tr key={item.label}>
              <td style={styles.td}>{item.label}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(item.min)}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(item.max)}</td>
              <td style={{ ...styles.td, color: '#6b7280' }}>{item.note}</td>
            </tr>
          ))}
          <tr style={styles.subtotalRow}>
            <td style={styles.td}><strong>Per Person</strong></td>
            <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(PER_PERSON_MIN)}</strong></td>
            <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(PER_PERSON_MAX)}</strong></td>
            <td style={styles.td} />
          </tr>
          <tr style={styles.subtotalRow}>
            <td style={styles.td}><strong>Per Couple</strong></td>
            <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(COUPLE_MIN)}</strong></td>
            <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(COUPLE_MAX)}</strong></td>
            <td style={styles.td} />
          </tr>
        </tbody>
      </table>

      <div style={styles.scenario}>
        <label style={styles.scenarioLabel}>Scenario (0% = best case, 100% = worst case)</label>
        <div style={styles.scenarioControls}>
          <select
            value={Math.round(pct * 100)}
            onChange={e => handlePctChange(parseInt(e.target.value) / 100)}
            style={styles.select}
          >
            {PCT_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
          </select>
          <span style={styles.result}>→ <strong>{fmt(annual)}</strong> / year (couple)</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '24px 32px', fontFamily: 'sans-serif', maxWidth: 700 },
  title: { fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 4px' },
  note: { fontSize: 12, color: '#6b7280', margin: '0 0 20px' },
  table: { borderCollapse: 'collapse', width: '100%', marginBottom: 24 },
  th: { fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb', padding: '6px 12px', textAlign: 'left' },
  td: { fontSize: 13, padding: '6px 12px', borderBottom: '1px solid #f3f4f6', color: '#111827' },
  subtotalRow: { background: '#f9fafb' },
  scenario: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '16px 20px' },
  scenarioLabel: { fontSize: 13, color: '#374151', display: 'block', marginBottom: 10 },
  scenarioControls: { display: 'flex', alignItems: 'center', gap: 16 },
  select: { fontSize: 13, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4 },
  result: { fontSize: 15, color: '#111827' },
};
