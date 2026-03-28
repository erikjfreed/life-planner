import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateParameters } from '../parameters/parametersSlice';

const fmt = v => `$${Math.round(v).toLocaleString()}`;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function SSPanel({ entity, ssEvent, timelineRows, params }) {
  const startYear = ssEvent.date ? parseInt(ssEvent.date.split('-')[0]) : null;
  const startMonth = ssEvent.date ? parseInt(ssEvent.date.split('-')[1]) : null;
  const monthlyBase = ssEvent.monthly_payment;
  const socialSecurityCoLA = params.socialSecurityCoLA ?? 0;
  const socialSecurityFedTaxRate = params.socialSecurityFedTaxRate ?? 0;
  const socialSecurityStateTaxRate = params.socialSecurityStateTaxRate ?? 0;
  const socialSecurityTaxRate = socialSecurityFedTaxRate + socialSecurityStateTaxRate;

  // Build yearly schedule from timeline rows
  const schedule = timelineRows
    .filter(r => r.year >= startYear)
    .map(r => {
      const yearsFromStart = r.year - startYear;
      const annualFull = monthlyBase * 12 * Math.pow(1 + socialSecurityCoLA, yearsFromStart);
      const monthly = monthlyBase * Math.pow(1 + socialSecurityCoLA, yearsFromStart);
      // Prorate first year
      let annual = annualFull;
      if (r.year === startYear && startMonth) {
        annual = monthlyBase * (13 - startMonth);
      }
      const tax = annual * 0.85 * socialSecurityTaxRate;
      const net = annual - tax;
      return { year: r.year, monthly: Math.round(monthly), annual: Math.round(annual), tax: Math.round(tax), net: Math.round(net) };
    });

  return (
    <div style={styles.panel}>
      <div style={{ display: 'inline-grid', gridTemplateColumns: 'auto auto 20px auto auto 20px auto auto 20px auto auto', gap: '6px 4px', alignItems: 'center', marginBottom: 12 }}>
        <span style={styles.label}>ID</span>
        <span style={styles.val}>{entity.id}</span>
        <span />
        <span style={styles.label}>Monthly Benefit</span>
        <span style={styles.val}>{fmt(monthlyBase)}</span>
        <span />
        <span style={styles.label}>Start</span>
        <span style={styles.val}>{(() => {
          const dob = entity.name === 'Erik' ? params.erikDOB : entity.name === 'Deb' ? params.debDOB : null;
          if (dob) {
            const d = new Date(dob);
            return `${d.getMonth() + 1}/${d.getDate()}/${startYear}`;
          }
          return startMonth ? `${startMonth}/1/${startYear}` : startYear;
        })()}</span>
        <span />
        <span style={styles.label}>Starts In</span>
        <span style={styles.val}>{(() => {
          const now = new Date();
          const dob = entity.name === 'Erik' ? params.erikDOB : entity.name === 'Deb' ? params.debDOB : null;
          const startDate = dob ? new Date(new Date(dob).getFullYear(), new Date(dob).getMonth(), new Date(dob).getDate()) : new Date(startYear, (startMonth || 1) - 1, 1);
          startDate.setFullYear(startYear);
          const diffMs = startDate - now;
          if (diffMs <= 0) return 'Collecting';
          const months = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44));
          const yrs = Math.floor(months / 12);
          const mos = months % 12;
          return yrs > 0 ? `${yrs}y ${mos}m` : `${mos}m`;
        })()}</span>
      </div>

      <div style={styles.sectionLabel}>Annual Schedule</div>
      <div style={styles.scroll}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.stickyTh}>Year</th>
              <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Monthly</th>
              <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Annual</th>
              <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Tax</th>
              <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Net</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((r, i) => (
              <tr key={r.year} style={{ background: i % 2 === 0 ? '#1e293b' : '#0f172a' }}>
                <td style={styles.td}>{r.year}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(r.monthly)}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(r.annual)}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(r.tax)}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(r.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SocialSecurityPage() {
  const dispatch = useDispatch();
  const entities = useSelector(s => s.entities.items);
  const events   = useSelector(s => s.events.items);
  const params   = useSelector(s => s.parameters.present.values);
  const timeline = useSelector(s => s.timeline?.rows ?? []);

  const ssEntities = entities.filter(e => e.type === 'social_security');

  const [activeId, setActiveId] = useState(null);
  const selected = ssEntities.find(e => e.id === activeId) ?? ssEntities[0];

  if (ssEntities.length === 0) {
    return <div style={styles.page}><p style={{ color: '#94a3b8', fontSize: 13 }}>No Social Security entities.</p></div>;
  }

  const ssEvent = events.find(ev => ev.type === 'social_security_start' && ev.entity_id === selected?.id);

  return (
    <div style={styles.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
        <span style={styles.label}>COLA</span>
        <select
          value={Math.round((params.socialSecurityCoLA ?? 0.025) * 1000)}
          onChange={e => dispatch(updateParameters({ socialSecurityCoLA: parseInt(e.target.value) / 1000 }))}
          style={styles.select}
        >
          {Array.from({ length: 51 }, (_, i) => i).map(v => (
            <option key={v} value={v}>{(v / 10).toFixed(1)}%</option>
          ))}
        </select>
      </div>
      <div style={styles.subtabs}>
        {ssEntities.map(entity => (
          <button
            key={entity.id}
            onClick={() => setActiveId(entity.id)}
            style={{ ...styles.subtab, ...(entity.id === selected?.id ? styles.subtabActive : {}) }}
          >
            {entity.name}
          </button>
        ))}
      </div>
      {selected && ssEvent && <SSPanel entity={selected} ssEvent={ssEvent} timelineRows={timeline} params={params} />}
    </div>
  );
}

const styles = {
  page: { padding: '16px 24px', fontFamily: 'sans-serif', overflowY: 'auto', height: '100%', boxSizing: 'border-box' },
  subtabs: { display: 'flex', gap: 6, marginBottom: 12 },
  subtab: { padding: '4px 14px', fontSize: 12, fontWeight: 500, border: 'none', borderLeft: '2px solid #334155', borderBottom: '2px solid #334155', borderRadius: '0 0 0 8px', background: 'none', cursor: 'pointer', color: '#94a3b8' },
  subtabActive: { color: '#e2e8f0', borderLeftColor: '#2563eb', borderBottomColor: '#2563eb', fontWeight: 600 },
  panel: { maxWidth: 600, border: '1px solid #334155', borderRadius: 6, padding: '12px 16px' },
  grid: { display: 'inline-grid', gridTemplateColumns: 'auto auto 20px auto auto', gap: '6px 4px', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 12, color: '#94a3b8', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap', background: '#334155', padding: '2px 6px', borderRadius: 2 },
  val: { fontSize: 12, color: '#e2e8f0' },
  select: { fontSize: 12, border: '1px solid #475569', borderRadius: 3, padding: '0 2px', background: '#1e293b', color: '#e2e8f0' },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '16px 0 6px' },
  table: { borderCollapse: 'collapse', width: '100%' },
  stickyTh: { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', borderBottom: '2px solid #334155', padding: '4px 8px', textAlign: 'left', position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 },
  td: { fontSize: 12, padding: '3px 8px', borderBottom: '1px solid #334155', color: '#e2e8f0' },
  scroll: { maxHeight: 400, overflowY: 'auto', border: '1px solid #334155', borderRadius: 4 },
};
