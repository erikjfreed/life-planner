import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';


const CATEGORIES = [
  { key: 'allowance', label: 'Allowance', color: '#3b82f6' },
  { key: 'total_tax', label: 'Taxes',     color: '#dc2626' },
  { key: 'real_estate_costs',  label: 'Housing',  color: '#22c55e' },
  { key: 'loans',     label: 'Loans',     color: '#f97316' },
  { key: 'living',    label: 'General',   color: '#eab308' },
  { key: 'travel',    label: 'Travel',    color: '#8b5cf6' },
  { key: 'health',    label: 'Health',    color: '#06b6d4' },
  { key: 'pets',      label: 'Pets',      color: '#ec4899' },
  { key: 'vehicles',  label: 'Vehicles',  color: '#a3e635' },
  { key: 'cap_expense', label: 'Cap Expense', color: '#f43f5e' },
];

export default function ExpenseChart({ rows, params, sharedYMax }) {
  const data = rows.map(r => {
    const entry = { year: r.year };
    CATEGORIES.forEach(c => { entry[c.label] = Math.round((c.compute ? c.compute(r) : r[c.key]) / 1000); });
    return entry;
  });

  const minYear = data.length > 0 ? data[0].year : 2026;
  const maxYear = data.length > 0 ? data[data.length - 1].year : 2060;
  const maxVal = Math.max(...data.map(r => CATEGORIES.reduce((s, c) => s + (r[c.label] || 0), 0)));
  const yMax = sharedYMax || Math.ceil(maxVal / 100) * 100;
  const yTicks = Array.from({ length: yMax / 100 + 1 }, (_, i) => i * 100);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Annual Expense ($K) vs Year</div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 20, left: 10, bottom: 0 }}>
          <XAxis dataKey="year" type="number" domain={[minYear, maxYear]} ticks={Array.from({length: maxYear - minYear + 1}, (_, i) => minYear + i)} tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-45} textAnchor="end" height={30} interval={0} />
          <YAxis width={58} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `$${v}K`} ticks={Array.from({ length: Math.floor(yMax / 100) + 1 }, (_, i) => i * 100)} domain={[0, yMax]} interval={0} />
          <CartesianGrid vertical={false} stroke="#334155" strokeWidth={1} />
          <Tooltip wrapperStyle={{ marginTop: -100 }} content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const erikAge = label - new Date(params?.erikDOB).getFullYear();
            const debAge = label - new Date(params?.debDOB).getFullYear();
            const total = payload.reduce((s, p) => s + (p.value || 0), 0);
            return (
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, padding: '8px 12px', fontSize: 12 }}>
                <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 2 }}>{label} (Erik {erikAge}, Deb {debAge})</div>
                {[...payload].reverse().map(p => (
                  <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 6, justifyContent: 'space-between' }}>
                    <span>{p.dataKey}</span>
                    <span>${p.value}K ({total > 0 ? Math.round(p.value / total * 100) : 0}%)</span>
                  </div>
                ))}
                <div style={{ color: '#e2e8f0', fontWeight: 600, borderTop: '1px solid #334155', marginTop: 2, paddingTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total</span><span>${total}K</span>
                </div>
              </div>
            );
          }} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} payload={CATEGORIES.map(c => ({ value: c.label, type: 'square', color: c.color }))} />
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
  title: { fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 2, flexShrink: 0 },
};
