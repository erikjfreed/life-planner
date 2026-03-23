
const ITEMS = [
  { label: 'Insurance',      weekly:  22, monthly:   94, yearly:  1128, note: 'Both dogs' },
  { label: 'Misc Health',    weekly:  23, monthly:  100, yearly:  1200, note: 'Vets, meds' },
  { label: 'Food',           weekly: 115, monthly:  500, yearly:  6000, note: '' },
  { label: 'Misc',           weekly:  23, monthly:  100, yearly:  1200, note: '' },
  { label: 'Teeth Cleaning', weekly:   3, monthly:   83, yearly:  1000, note: 'Tatia' },
  { label: 'Boarding',       weekly:  60, monthly:  263, yearly:  3150, note: '21 days @ $150/day (travel)' },
  { label: 'Grooming',       weekly:  52, monthly:  226, yearly:  2711, note: 'Every 8 weeks, both dogs' },
];

const TOTAL_YEARLY = ITEMS.reduce((s, i) => s + i.yearly, 0); // 16389

const fmt  = v => `$${v.toLocaleString()}`;

export default function DogsPage() {
  return (
    <div style={styles.page}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Item</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Weekly</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Monthly</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Yearly</th>
            <th style={styles.th}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {ITEMS.map(item => (
            <tr key={item.label}>
              <td style={styles.td}>{item.label}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(item.weekly)}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(item.monthly)}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(item.yearly)}</td>
              <td style={{ ...styles.td, color: '#6b7280' }}>{item.note}</td>
            </tr>
          ))}
          <tr style={styles.totalRow}>
            <td style={styles.td}><strong>Total (2 dogs)</strong></td>
            <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(ITEMS.reduce((s,i) => s+i.weekly, 0))}</strong></td>
            <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(ITEMS.reduce((s,i) => s+i.monthly, 0))}</strong></td>
            <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(TOTAL_YEARLY)}</strong></td>
            <td style={styles.td} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  page: { padding: '24px 32px', fontFamily: 'sans-serif', maxWidth: 750 },
  table: { borderCollapse: 'collapse', width: '100%' },
  th: { fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb', padding: '6px 12px', textAlign: 'left' },
  td: { fontSize: 13, padding: '6px 12px', borderBottom: '1px solid #f3f4f6', color: '#111827' },
  totalRow: { background: '#f9fafb' },
};
