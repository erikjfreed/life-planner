import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DeathReferenceLine } from './DeathLines';

const CATEGORIES = [
  { key: 'health',    label: 'Health',    color: '#f97316' },
  { key: 'living',   label: 'Living',    color: '#fb923c' },
  { key: 'allowance',label: 'Allowance', color: '#fbbf24' },
  { key: 'travel',   label: 'Travel',    color: '#a3e635' },
  { key: 'cars',     label: 'Cars',      color: '#facc15' },
  { key: 'dogs',     label: 'Dogs',      color: '#34d399' },
  { key: 'orcas',    label: 'Orcas',     color: '#22d3ee' },
  { key: 'portland', label: 'Portland',  color: '#818cf8' },
  { key: 'loans',    label: 'Loans',     color: '#60a5fa' },
];

export default function ExpenseChart({ rows, params }) {
  const data = rows.map(r => {
    const entry = { age: r.erik_age };
    CATEGORIES.forEach(c => { entry[c.label] = Math.round(r[c.key] / 1000); });
    return entry;
  });

  const erikBirthYear = params?.erikDOB ? new Date(params.erikDOB).getFullYear() : null;
  const erikDeathAge = erikBirthYear ? params.erikDeathYear - erikBirthYear : null;
  const debDeathAge  = erikBirthYear ? params.debDeathYear  - erikBirthYear : null;
  const minAge = data.length > 0 ? data[0].age : 70;
  const maxAge = Math.max(data.length > 0 ? data[data.length - 1].age : 99, erikDeathAge || 0, debDeathAge || 0);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Annual Expense ($K) vs Age</div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 20, left: 10, bottom: 0 }}>
          <XAxis dataKey="age" type="number" domain={[minAge, maxAge]} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}K`} />
          <Tooltip formatter={(v) => `$${v}K`} labelFormatter={l => `Age ${l}`} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          {CATEGORIES.map(c => (
            <Area key={c.key} type="monotone" dataKey={c.label} stackId="1"
              stroke={c.color} fill={c.color} fillOpacity={0.75} />
          ))}
          {erikDeathAge && <DeathReferenceLine x={erikDeathAge} name="Erik" color="#ef4444" />}
          {debDeathAge  && <DeathReferenceLine x={debDeathAge}  name="Deb"  color="#8b5cf6" />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%' },
  title: { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 2, flexShrink: 0 },
};
