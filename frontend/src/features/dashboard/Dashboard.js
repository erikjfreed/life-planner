import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTimeline } from '../timeline/timelineSlice';
import { fetchParameters } from '../parameters/parametersSlice';
import { fetchEvents } from '../events/eventsSlice';
import ParametersPanel from './ParametersPanel';
import WealthChart from './WealthChart';
import IncomeChart from './IncomeChart';
import ExpenseChart from './ExpenseChart';
import { ChartEventLinesOverlay } from './ChartEventLines';

export default function Dashboard() {
  const dispatch = useDispatch();
  const { rows, status } = useSelector(s => s.timeline);
  const params = useSelector(s => s.parameters.present.values);
  const events = useSelector(s => s.events.items);

  useEffect(() => { dispatch(fetchParameters()); }, [dispatch]);
  useEffect(() => { dispatch(fetchEvents()); }, [dispatch]);
  useEffect(() => { if (status === 'idle') dispatch(fetchTimeline()); }, [status, dispatch]);

  const minYear = rows.length > 0 ? rows[0].year : 2026;
  const maxYear = rows.length > 0 ? rows[rows.length - 1].year : 2060;

  // Shared Y-axis max for income and expense charts ($K)
  const sharedYMax = rows.length > 0 ? Math.ceil(Math.max(
    ...rows.map(r => ((r.social_security_net || 0) + (r.roi || 0) + (r.capital_spend || 0)) / 1000),
    ...rows.map(r => ((r.draw_tax || 0) + (r.total_tax || 0) + (r.allowance || 0) + (r.real_estate_costs || 0) + (r.loans || 0) + (r.travel || 0) + (r.living || 0) + (r.health || 0) + (r.pets || 0) + (r.vehicles || 0)) / 1000)
  ) / 100) * 100 : 500;

  const deathEvents   = events.filter(e => e.type === 'spouse_death');
  const erikBirthYear = params?.erikDOB ? new Date(params.erikDOB).getFullYear() : null;
  const debBirthYear  = params?.debDOB  ? new Date(params.debDOB).getFullYear()  : null;
  const ssEvents      = events.filter(e => e.type === 'social_security_start');
  const reEvents      = events.filter(e => (e.type === 'real_estate_buy' || e.type === 'real_estate_sell') && !e.hidden);
  const vehicleEvents = events.filter(e => (e.type === 'vehicle_buy' || e.type === 'vehicle_sell') && !e.hidden);
  const entities      = useSelector(s => s.entities.items);

  return (
    <div style={styles.container}>
      <ParametersPanel />
      <div style={styles.right}>
        <div style={styles.charts}>
          {status === 'loading' && <p>Computing...</p>}
          {status === 'succeeded' && (
            <>
              <div style={styles.eventStrip} />
              <div style={styles.chartSlot}><WealthChart rows={rows} params={params} events={events} /></div>
              <div style={styles.chartSlot}><IncomeChart rows={rows} params={params} sharedYMax={sharedYMax} /></div>
              <div style={styles.chartSlot}><ExpenseChart rows={rows} params={params} sharedYMax={sharedYMax} /></div>
              <ChartEventLinesOverlay
                deathEvents={deathEvents}

                erikBirthYear={erikBirthYear}
                debBirthYear={debBirthYear}
                ssEvents={ssEvents}
                reEvents={reEvents}
                vehicleEvents={vehicleEvents}
                entities={entities}
                minYear={minYear}
                maxYear={maxYear}
                stripHeight={24}
              />
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
    borderBottom: '1px solid #334155',
    flexShrink: 0,
  },
  heading: { margin: 0, fontSize: 16, fontWeight: 700, color: '#e2e8f0' },
  charts: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '4px 12px',
    gap: 4,
    position: 'relative',
  },
  eventStrip: {
    height: 56,
    flexShrink: 0,
    borderBottom: '1px solid #334155',
    background: '#0f172a',
  },
  chartSlot: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
};
