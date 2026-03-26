import { useState } from 'react';
import { useSelector } from 'react-redux';

const fmt = v => `$${Math.round(v).toLocaleString()}`;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function SSPanel({ entity, ssEvent, timelineRows, params }) {
  const startYear = ssEvent.year;
  const startMonth = ssEvent.month;
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
      <div style={styles.summaryRow}>
        <div style={styles.idCell}><div style={styles.summaryLabel}>Entity ID</div><div style={styles.idValue}>{entity.id}</div></div>
        <div style={styles.summaryCell}><div style={styles.summaryLabel}>Monthly Benefit</div><div style={styles.summaryValue}>{fmt(monthlyBase)}</div></div>
        <div style={styles.summaryCell}><div style={styles.summaryLabel}>Start</div><div style={styles.summaryValue}>{startMonth ? `${MONTHS[startMonth - 1]} ${startYear}` : startYear}</div></div>
        <div style={styles.summaryCell}><div style={styles.summaryLabel}>COLA</div><div style={styles.summaryValue}>{(socialSecurityCoLA * 100).toFixed(1)}%</div></div>
        <div style={styles.summaryCell}><div style={styles.summaryLabel}>Tax Rate</div><div style={styles.summaryValue}>{(socialSecurityTaxRate * 100).toFixed(1)}%</div></div>
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
  panel: { maxWidth: 600 },
  summaryRow: { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  summaryCell: { background: '#1e293b', borderRadius: 6, padding: '8px 12px', minWidth: 100 },
  idCell: { background: '#0f172a', borderRadius: 6, padding: '8px 12px', minWidth: 50, border: '1px dashed #475569' },
  summaryLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: 700, color: '#e2e8f0' },
  idValue: { fontSize: 14, fontWeight: 700, color: '#64748b', fontFamily: 'monospace' },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '16px 0 6px' },
  table: { borderCollapse: 'collapse', width: '100%' },
  stickyTh: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', borderBottom: '2px solid #334155', padding: '4px 8px', textAlign: 'left', position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 },
  td: { fontSize: 12, padding: '3px 8px', borderBottom: '1px solid #334155', color: '#e2e8f0' },
  scroll: { maxHeight: 400, overflowY: 'auto', border: '1px solid #334155', borderRadius: 4 },
};
