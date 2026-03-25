import { useSelector } from 'react-redux';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function DeathPage() {
  const entities = useSelector(s => s.entities.items);
  const events   = useSelector(s => s.events.items);
  const params   = useSelector(s => s.parameters.present.values);

  const spouseEntities = entities.filter(e => e.type === 'spouse');
  const deathEvents = events.filter(e => e.type === 'death');

  if (spouseEntities.length === 0) {
    return <div style={styles.page}><p style={{ color: '#6b7280', fontSize: 13 }}>No spouse entities.</p></div>;
  }

  const erikDOB = params.erikDOB ?? null;
  const debDOB  = params.debDOB  ?? null;
  const erikBirthYear = erikDOB ? new Date(erikDOB).getFullYear() : null;
  const debBirthYear  = debDOB  ? new Date(debDOB).getFullYear()  : null;

  const rows = spouseEntities.map(entity => {
    const firstName = entity.name.split(' ')[0];
    const ev = deathEvents.find(e => e.entity_id === entity.id);
    const dob = firstName === 'Erik' ? erikDOB : firstName === 'Deborah' ? debDOB : null;
    const birthYear = firstName === 'Erik' ? erikBirthYear : firstName === 'Deborah' ? debBirthYear : null;
    const deathYear = ev ? (ev.age != null && birthYear ? birthYear + ev.age : ev.year) : null;
    const deathMonth = ev?.month;
    const age = ev?.age != null ? ev.age : (deathYear && birthYear ? deathYear - birthYear : null);
    const dobParsed = dob ? new Date(dob) : null;
    const dobFormatted = dobParsed ? `${dobParsed.getMonth() + 1}/${dobParsed.getDate()}/${dobParsed.getFullYear()}` : null;
    const deathDate = deathYear && dobParsed ? `${dobParsed.getMonth() + 1}/${dobParsed.getDate()}/${deathYear}` : null;
    return { entity, event: ev, dobFormatted, birthYear, deathYear, deathMonth, deathDate, age };
  });

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Spouses</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>First</th>
            <th style={styles.th}>Middle</th>
            <th style={styles.th}>Last</th>
            <th style={styles.th}>Born</th>
            <th style={styles.th}>Died</th>
            <th style={styles.th}>Lifespan</th>
            <th style={styles.th}>Years Remaining</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const yearsRemaining = r.deathYear ? r.deathYear - new Date().getFullYear() : null;
            return (
              <tr key={r.entity.id} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                <td style={styles.td}>{r.entity.id}</td>
                <td style={styles.td}>{r.entity.name.split(' ')[0] ?? '—'}</td>
                <td style={styles.td}>{r.entity.name.split(' ')[1] ?? '—'}</td>
                <td style={styles.td}>{r.entity.name.split(' ')[2] ?? '—'}</td>
                <td style={styles.td}>{r.dobFormatted ?? '—'}</td>
                <td style={styles.td}>{r.deathDate ?? '—'}</td>
                <td style={styles.td}>{r.age ?? '—'}</td>
                <td style={styles.td}>{yearsRemaining != null ? `${yearsRemaining} yrs` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  page: { padding: '16px 24px', fontFamily: 'sans-serif', overflowY: 'auto', height: '100%', boxSizing: 'border-box' },
  title: { margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#111827' },
  table: { borderCollapse: 'collapse', width: '100%', maxWidth: 700 },
  th: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb', padding: '4px 8px', textAlign: 'left' },
  td: { fontSize: 12, padding: '4px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827' },
};
