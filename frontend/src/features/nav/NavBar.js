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
    background: '#16213e',
    padding: '10px 12px 0',
    flexShrink: 0,
    gap: 6,
  },
  tab: {
    padding: '4px 14px',
    fontSize: 12,
    fontWeight: 500,
    border: 'none',
    borderLeft: '2px solid #334155',
    borderBottom: '2px solid #334155',
    borderRadius: '0 0 0 8px',
    background: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
  },
  active: {
    color: '#e2e8f0',
    borderLeftColor: '#2563eb',
    borderBottomColor: '#2563eb',
    fontWeight: 600,
  },
  spacer: { flex: 1 },
  undoBtn: {
    padding: '4px 10px',
    fontSize: 12,
    border: '1px solid #475569',
    borderRadius: 4,
    background: '#1e293b',
    cursor: 'pointer',
    color: '#cbd5e1',
    marginLeft: 4,
  },
};
