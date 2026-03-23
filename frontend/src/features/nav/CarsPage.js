const ITEMS = [
  { label: 'Capital (purchase amortized)', yearly: 6000, note: 'Per car — $60K out the door / 10yr life; indirectly inflation adjusted' },
  { label: 'Insurance',                    yearly: 1200, note: 'Per car — less if registered in WA' },
  { label: 'License / Registration / Smog',yearly:  300, note: 'Per car — less if registered in WA' },
  { label: 'Maintenance / Repair',         yearly: 1500, note: 'Per car — indirectly inflation adjusted' },
];

const PER_CAR  = ITEMS.reduce((s, i) => s + i.yearly, 0); // 9000
const TOTAL    = PER_CAR * 2;                              // 18000

const fmt = v => `$${v.toLocaleString()}`;

export default function CarsPage() {
  return (
    <div style={styles.page}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Item</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Per Car / Yr</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Both Cars / Yr</th>
            <th style={styles.th}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {ITEMS.map(item => (
            <tr key={item.label}>
              <td style={styles.td}>{item.label}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(item.yearly)}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(item.yearly * 2)}</td>
              <td style={{ ...styles.td, color: '#6b7280' }}>{item.note}</td>
            </tr>
          ))}
          <tr style={styles.totalRow}>
            <td style={styles.td}><strong>Total (2 cars)</strong></td>
            <td style={{ ...styles.td, textAlign: 'right' }}><strong>{fmt(PER_CAR)}</strong></td>
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
