const ITEMS = [
  { label: 'Amazon Prime',  weekly:   3, monthly:   12, yearly:    139, note: 'Amazon Prime' },
  { label: 'Streaming',     weekly:  23, monthly:  100, yearly:  1200, note: 'TuneIn, Hulu, HBO, Apple, Netflix, Prime Video' },
  { label: 'Phones',        weekly:  32, monthly:  140, yearly:  1680, note: 'Two phones, Netflix, AppleTV (part of T-Mobile)' },
  { label: 'Entertainment', weekly:  69, monthly:  300, yearly:  3600, note: 'Does not include individual personal entertainment (see discretionary)' },
  { label: 'Food & Drink',  weekly: 414, monthly: 1800, yearly: 21600, note: 'Does not include individual personal foods (see discretionary)' },
  { label: 'Life Misc',     weekly:  69, monthly:  300, yearly:  3600, note: 'Unforeseen expenses, minor non-enumerated' },
  { label: 'House Misc',    weekly:  35, monthly:  150, yearly:  1800, note: 'Baseline domestic needs' },
];

const TOTAL = ITEMS.reduce((s, i) => s + i.yearly, 0);

const fmt = v => `$${v.toLocaleString()}`;

export default function LivingPage() {
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
  page: { padding: '24px 32px', fontFamily: 'sans-serif', maxWidth: 900 },
  table: { borderCollapse: 'collapse', width: '100%' },
  th: { fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb', padding: '6px 12px', textAlign: 'left' },
  td: { fontSize: 13, padding: '6px 12px', borderBottom: '1px solid #f3f4f6', color: '#111827' },
  totalRow: { background: '#f9fafb' },
};
