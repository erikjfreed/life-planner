const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'health',    label: 'Health' },
  { id: 'dogs',      label: 'Dogs' },
  { id: 'cars',      label: 'Cars' },
  { id: 'travel',    label: 'Travel' },
  { id: 'living',    label: 'Living' },
  { id: 'loans',     label: 'Loans' },
  { id: 'orcas',     label: 'Orcas' },
  { id: 'portland',  label: 'Portland' },
];

export { TABS };

export default function NavBar({ active, onSelect }) {
  return (
    <div style={styles.bar}>
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          style={{ ...styles.tab, ...(active === t.id ? styles.active : {}) }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

const styles = {
  bar: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    background: '#fff',
    padding: '0 12px',
    flexShrink: 0,
    gap: 2,
  },
  tab: {
    padding: '10px 14px 6px',
    fontSize: 13,
    fontWeight: 500,
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    marginBottom: -1,
  },
  active: {
    color: '#111827',
    borderBottom: '2px solid #2563eb',
    fontWeight: 600,
  },
};
