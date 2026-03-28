import { useSelector } from 'react-redux';

function personAge(name, year, params) {
  const dob = name === 'Erik' ? params.erikDOB : name === 'Deb' ? params.debDOB : null;
  if (!dob || !year) return null;
  return year - new Date(dob).getFullYear();
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TYPE_LABELS = {
  real_estate_buy:          'real_estate_buy',
  real_estate_sell:         'real_estate_sell',
  spouse_death:             'spouse_death',
  social_security_start:    'social_security_start',
  vehicle_buy:              'vehicle_buy',
  vehicle_sell:             'vehicle_sell',
  vehicle_tradeup:         'vehicle_tradeup',
};

function eventSummary(ev, entities, params) {
  const entity = entities.find(e => e.id === ev.entity_id);
  const isVehicle = ev.type === 'vehicle_buy' || ev.type === 'vehicle_sell';
  const rawName = entity ? (isVehicle ? entity.name : (entity.street_address ? entity.street_address.split(',')[0] : entity.name)) : ev.name || null;
  const name = ev.type === 'social_security_start' && ev.name ? `${ev.name} starts Social Security`
    : (ev.type === 'spouse_death' || ev.type === 'pet_death') && (ev.name || rawName) ? `RIP ${ev.name || rawName}`
    : (ev.type === 'real_estate_buy' || ev.type === 'vehicle_buy') && rawName ? `Purchase ${rawName}`
    : (ev.type === 'real_estate_sell' || ev.type === 'vehicle_sell') && rawName ? `Sale of ${rawName}` : rawName;
  const details = [];
  if ((ev.type === 'spouse_death' || ev.type === 'pet_death') && ev.age != null) details.push(`age ${ev.age}`);
  if (ev.type === 'social_security_start' && ev.name && params) {
    const evYear = ev.date ? parseInt(ev.date.split('-')[0]) : null;
    const evMonth = ev.date ? parseInt(ev.date.split('-')[1]) : null;
    const age = personAge(ev.name, evYear, params);
    if (age != null) details.push(`age ${age}`);
    if (evMonth != null) details.push(MONTHS[evMonth - 1]);
  }
  if (ev.principal_balance != null) details.push(`bal $${Math.round(ev.principal_balance).toLocaleString()}`);
  return { name, details: details.join(' · ') };
}


export default function EventsPage() {
  const events   = useSelector(s => s.events.items);
  const entities = useSelector(s => s.entities.items);
  const params   = useSelector(s => s.parameters.present.values);


  const sorted = [...events].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.type.localeCompare(b.type));


  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>Events</h2>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.thId}>ID</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Name</th>
            <th style={styles.thId}>Ent</th>
            <th style={styles.th}>Ent Type</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Price</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Monthly</th>
            <th style={styles.th}>Details</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((ev, idx) => (
              <tr key={ev.id} style={{ background: idx % 2 === 0 ? '#1e293b' : '#0f172a' }}>
                <td style={styles.tdId}>{ev.id}</td>
                <td style={styles.td}>{TYPE_LABELS[ev.type] ?? ev.type}</td>
                <td style={styles.td}>{ev.date ? `${parseInt(ev.date.split('-')[1])}/${parseInt(ev.date.split('-')[2])}/${parseInt(ev.date.split('-')[0])}` : '—'}</td>
                <td style={styles.td}>{eventSummary(ev, entities, params).name}</td>
                <td style={styles.tdId}>{ev.entity_id ?? '—'}</td>
                <td style={styles.td}>{ev.entity_id ? (entities.find(e => e.id === ev.entity_id)?.type ?? '—') : '—'}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{(() => {
                  const amt = (ev.type === 'real_estate_buy' || ev.type === 'vehicle_buy') && ev.purchase_price != null ? -ev.purchase_price
                    : (ev.type === 'real_estate_sell' || ev.type === 'vehicle_sell') && ev.sale_price != null ? ev.sale_price
                    : null;
                  if (amt == null) return '—';
                  const color = amt >= 0 ? '#16a34a' : '#dc2626';
                  return <span style={{ color }}>{amt < 0 ? '-' : ''}${Math.abs(Math.round(amt)).toLocaleString()}</span>;
                })()}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{(() => {
                  if (ev.type === 'social_security_start' && ev.monthly_payment != null) {
                    return <span style={{ color: '#16a34a' }}>${Math.round(ev.monthly_payment).toLocaleString()}</span>;
                  }
                  if ((ev.type === 'real_estate_buy' || ev.type === 'vehicle_buy') && ev.entity_id) {
                    const entity = entities.find(e => e.id === ev.entity_id);
                    if (entity) {
                      const services = entity.services_json ? JSON.parse(entity.services_json) : [];
                      const monthly = services.reduce((s, i) => s + i.monthly, 0)
                        + (entity.insurance_yearly ?? 0) / 12
                        + (entity.tax_yearly ?? 0) / 12;
                      if (monthly > 0) return <span style={{ color: '#dc2626' }}>${Math.round(monthly).toLocaleString()}</span>;
                    }
                  }
                  return '—';
                })()}</td>
                <td style={styles.td}>{eventSummary(ev, entities, params).details}</td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  page:  { padding: '16px 24px', fontFamily: 'sans-serif', overflowY: 'auto', height: '100%', boxSizing: 'border-box' },
  header:{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 },
  title: { margin: 0, fontSize: 16, fontWeight: 700, color: '#e2e8f0' },
  table: { borderCollapse: 'collapse', width: 'auto' },
  th:    { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', borderBottom: '2px solid #334155', padding: '4px 6px', textAlign: 'left' },
  thId:  { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', borderBottom: '2px solid #334155', padding: '4px 6px', textAlign: 'center' },
  td:    { fontSize: 12, padding: '3px 6px', borderBottom: '1px solid #334155', color: '#e2e8f0' },
  tdId:  { fontSize: 12, padding: '3px 6px', borderBottom: '1px solid #334155', color: '#e2e8f0', textAlign: 'center' },
};
