import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';


export default function WealthChart({ rows, params, events }) {
  const reEvents = (events ?? []).filter(e => e.type === 'real_estate_buy' || e.type === 'real_estate_sell');
  const data = [];
  for (const r of rows) {
    // Check if this year has RE events
    const yearEvents = reEvents.filter(e => e.year === r.year);
    if (yearEvents.length > 0 && r.pre_event_real_estate_value !== r.real_estate_value) {
      const earliestMonth = Math.min(...yearEvents.map(e => e.month || 1));
      // Pre-event point
      data.push({
        year: r.year + (earliestMonth - 1) / 12 - 0.01,
        'Real Estate': Math.round(r.pre_event_real_estate_value / 1000),
        'Investments': Math.round(r.investment_balance / 1000),
      });
      // Post-event point
      data.push({
        year: r.year + (earliestMonth - 1) / 12,
        'Real Estate': Math.round(r.real_estate_value / 1000),
        'Investments': Math.round(r.investment_balance / 1000),
      });
    } else {
      data.push({
        year: r.year,
        'Real Estate': Math.round(r.real_estate_value / 1000),
        'Investments': Math.round(r.investment_balance / 1000),
      });
    }
  }

  const minYear = data.length > 0 ? data[0].year : 2026;
  const maxYear = data.length > 0 ? data[data.length - 1].year : 2060;
  const maxWealth = Math.max(...data.map(r => (r['Real Estate'] || 0) + (r['Investments'] || 0)));
  const yMax = Math.ceil(maxWealth / 1000) * 1000;
  const yTicks = Array.from({ length: yMax / 1000 + 1 }, (_, i) => i * 1000);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Wealth ($M) vs Year</div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 20, left: 10, bottom: 0 }}>
          <XAxis dataKey="year" type="number" domain={[minYear, maxYear]} ticks={Array.from({length: maxYear - minYear + 1}, (_, i) => minYear + i)} tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-45} textAnchor="end" height={30} interval={0} />
          <YAxis width={52} tickFormatter={v => v % 2000 === 0 ? `$${(v/1000).toFixed(0)}M` : ''} tick={{ fontSize: 11, fill: '#94a3b8' }} ticks={yTicks} domain={[0, yMax]} interval={0} />
          <CartesianGrid vertical={false} stroke="#334155" strokeWidth={1} />
          <Tooltip content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const erikAge = Math.round(label) - new Date(params?.erikDOB).getFullYear();
            const debAge = Math.round(label) - new Date(params?.debDOB).getFullYear();
            const total = payload.reduce((s, p) => s + (p.value || 0), 0);
            return (
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, padding: '8px 12px', fontSize: 12 }}>
                <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 2 }}>{Math.round(label)} (Erik {erikAge}, Deb {debAge})</div>
                {payload.map(p => (
                  <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                    <span>{p.dataKey}</span>
                    <span>${(p.value/1000).toFixed(2)}M ({total > 0 ? Math.round(p.value / total * 100) : 0}%)</span>
                  </div>
                ))}
                <div style={{ color: '#e2e8f0', fontWeight: 600, borderTop: '1px solid #334155', marginTop: 2, paddingTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total</span><span>${(total/1000).toFixed(2)}M</span>
                </div>
              </div>
            );
          }} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Area type="linear" dataKey="Real Estate" stackId="1" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.7} />
          <Area type="linear" dataKey="Investments" stackId="1" stroke="#16a34a" fill="#16a34a" fillOpacity={0.6} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%' },
  title: { fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 2, flexShrink: 0 },
};
