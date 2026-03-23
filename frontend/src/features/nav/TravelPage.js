const ITEMS = [
  { label: 'Travel', weekly: 690, monthly: 3000, yearly: 36000, note: 'Does not include individual personal travel (see discretionary)' },
];

const TOTAL = ITEMS.reduce((s, i) => s + i.yearly, 0);

const fmt = v => `$${v.toLocaleString()}`;

export default function TravelPage() {
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
            <td style={styles.td}><strong>Total</strong></td>
            <td style={{ ...styles.td, textAlign: 'right' }} />
            <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(ITEMS.reduce((s,i) => s+i.monthly, 0))}</strong></td>
            <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(TOTAL)}</strong></td>
            <td style={styles.td} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  page: { padding: '24px 32px', fontFamily: 'sans-serif', maxWidth: 800 },
  table: { borderCollapse: 'collapse', width: '100%' },
  th: { fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb', padding: '6px 12px', textAlign: 'left' },
  td: { fontSize: 13, padding: '6px 12px', borderBottom: '1px solid #f3f4f6', color: '#111827' },
  totalRow: { background: '#f9fafb' },
};
