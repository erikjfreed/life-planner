import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
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
    const entry = { year: r.year };
    CATEGORIES.forEach(c => { entry[c.label] = Math.round(r[c.key] / 1000); });
    return entry;
  });

  const minYear = data.length > 0 ? data[0].year : 2026;
  const maxYear = data.length > 0 ? data[data.length - 1].year : 2060;
  const maxVal = Math.max(...data.map(r => CATEGORIES.reduce((s, c) => s + (r[c.label] || 0), 0)));
  const yMax = Math.ceil(maxVal / 100) * 100;
  const yTicks = Array.from({ length: yMax / 100 + 1 }, (_, i) => i * 100);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Annual Expense ($K) vs Year</div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 20, left: 10, bottom: 0 }}>
          <XAxis dataKey="year" type="number" domain={[minYear, maxYear]} ticks={Array.from({length: maxYear - minYear + 1}, (_, i) => minYear + i)} tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={30} interval={0} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v % 200 === 0 ? `$${v}K` : ''} ticks={yTicks} domain={[0, yMax]} interval={0} />
          <CartesianGrid vertical={false} stroke="#e5e7eb" strokeWidth={1} />
          <Tooltip formatter={(v) => `$${v}K`} labelFormatter={l => { const erikAge = l - new Date(params?.erikDOB).getFullYear(); const debAge = l - new Date(params?.debDOB).getFullYear(); return `${l}  (Erik ${erikAge}, Deb ${debAge})`; }} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          {CATEGORIES.map(c => (
            <Area key={c.key} type="monotone" dataKey={c.label} stackId="1"
              stroke={c.color} fill={c.color} fillOpacity={0.75} />
          ))}
          {params?.erikDeathYear && <DeathReferenceLine x={params.erikDeathYear} name="Erik" age={params.erikDeathYear - new Date(params.erikDOB).getFullYear()} color="#ef4444" />}
          {params?.debDeathYear && <DeathReferenceLine x={params.debDeathYear} name="Deb" age={params.debDeathYear - new Date(params.debDOB).getFullYear()} color="#8b5cf6" />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%' },
  title: { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 2, flexShrink: 0 },
};
