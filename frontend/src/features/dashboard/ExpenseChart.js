import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';


const CATEGORIES = [
  { key: 'health',    label: 'Health',    color: '#f97316' },
  { key: 'living',    label: 'General',   color: '#fb923c' },
  { key: 'allowance', label: 'Allowance', color: '#fbbf24' },
  { key: 'travel',    label: 'Travel',    color: '#a3e635' },
  { key: 'vehicles',  label: 'Vehicles',  color: '#facc15' },
  { key: 'pets',      label: 'Pets',      color: '#34d399' },
  { key: 'real_estate_costs',  label: 'RE Costs',  color: '#22d3ee' },
  { key: 'loans',     label: 'Loans',     color: '#60a5fa' },
];

export default function ExpenseChart({ rows, params }) {
  const data = rows.map(r => {
    const entry = { year: r.year };
    CATEGORIES.forEach(c => { entry[c.label] = Math.round((c.compute ? c.compute(r) : r[c.key]) / 1000); });
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
          <YAxis width={58} tick={{ fontSize: 10 }} tickFormatter={v => `$${v}K`} ticks={Array.from({ length: Math.floor(yMax / 100) + 1 }, (_, i) => i * 100)} domain={[0, yMax]} interval={0} />
          <CartesianGrid vertical={false} stroke="#e5e7eb" strokeWidth={1} />
          <Tooltip formatter={(v) => `$${v}K`} labelFormatter={l => { const erikAge = l - new Date(params?.erikDOB).getFullYear(); const debAge = l - new Date(params?.debDOB).getFullYear(); return `${l}  (Erik ${erikAge}, Deb ${debAge})`; }} wrapperStyle={{ marginTop: -100 }} itemSorter={(a) => { const idx = CATEGORIES.findIndex(c => c.label === a.dataKey); return -idx; }} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} payload={[...CATEGORIES].reverse().map(c => ({ value: c.label, type: 'square', color: c.color }))} />
          {CATEGORIES.map(c => (
            <Area key={c.key} type="linear" dataKey={c.label} stackId="1"
              stroke={c.color} fill={c.color} fillOpacity={0.75} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%' },
  title: { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 2, flexShrink: 0 },
};
