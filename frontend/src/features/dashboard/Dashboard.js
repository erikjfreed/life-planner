import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTimeline } from '../timeline/timelineSlice';
import { fetchParameters } from '../parameters/parametersSlice';
import ParametersPanel from './ParametersPanel';
import WealthChart from './WealthChart';
import IncomeChart from './IncomeChart';
import ExpenseChart from './ExpenseChart';

export default function Dashboard() {
  const dispatch = useDispatch();
  const { rows, status } = useSelector(s => s.timeline);
  const params = useSelector(s => s.parameters.values);

  useEffect(() => { dispatch(fetchParameters()); }, [dispatch]);
  useEffect(() => { if (status === 'idle') dispatch(fetchTimeline()); }, [status, dispatch]);

  return (
    <div style={styles.container}>
      <ParametersPanel />
      <div style={styles.right}>
        <div style={styles.header}>
          <h1 style={styles.heading}>Life Planner</h1>
        </div>
        <div style={styles.charts}>
          {status === 'loading' && <p>Computing...</p>}
          {status === 'succeeded' && (
            <>
              <div style={styles.chartSlot}><WealthChart rows={rows} params={params} /></div>
              <div style={styles.chartSlot}><IncomeChart rows={rows} params={params} /></div>
              <div style={styles.chartSlot}><ExpenseChart rows={rows} params={params} /></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    fontFamily: 'sans-serif',
    boxSizing: 'border-box',
  },
  right: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  header: {
    padding: '8px 16px 4px',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
  },
  heading: { margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' },
  charts: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '4px 12px',
    gap: 4,
  },
  chartSlot: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
};
