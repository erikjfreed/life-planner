import { useDispatch, useSelector } from 'react-redux';
import { ActionCreators } from 'redux-undo';

const TABS = [
  { id: 'dashboard',   label: 'Dashboard' },
  { id: 'living',      label: 'Living' },
  { id: 'travel',      label: 'Travel' },
  { id: 'health',      label: 'Health' },
  { id: 'pets',        label: 'Pets' },
  { id: 'vehicles',    label: 'Vehicles' },
  { id: 'real-estate', label: 'Real Estate' },
  { id: 'loans',       label: 'Loans' },
  { id: 'ss',          label: 'Social Security' },
  { id: 'spouses',     label: 'Spouses' },
  { id: 'tax',          label: 'Tax' },
  { id: 'events',      label: 'Events' },
  { id: 'timeline',    label: 'Timeline' },
];

export { TABS };

export default function NavBar({ active, onSelect }) {
  const dispatch = useDispatch();
  const canUndo = useSelector(s => s.parameters.past.length > 0);
  const canRedo = useSelector(s => s.parameters.future.length > 0);

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
      <div style={styles.spacer} />
      <button
        onClick={() => dispatch(ActionCreators.undo())}
        disabled={!canUndo}
        style={{ ...styles.undoBtn, opacity: canUndo ? 1 : 0.35 }}
        title="Undo"
      >
        ↩ Undo
      </button>
      <button
        onClick={() => dispatch(ActionCreators.redo())}
        disabled={!canRedo}
        style={{ ...styles.undoBtn, opacity: canRedo ? 1 : 0.35 }}
        title="Redo"
      >
        Redo ↪
      </button>
    </div>
  );
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
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
  spacer: { flex: 1 },
  undoBtn: {
    padding: '4px 10px',
    fontSize: 12,
    border: '1px solid #d1d5db',
    borderRadius: 4,
    background: '#f9fafb',
    cursor: 'pointer',
    color: '#374151',
    marginLeft: 4,
  },
};
