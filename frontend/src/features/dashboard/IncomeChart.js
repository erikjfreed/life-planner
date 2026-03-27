import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';


export default function IncomeChart({ rows, params, sharedYMax }) {
  const data = rows.map(r => ({
    year: r.year,
    'SS': Math.round(r.social_security_subtotal / 1000),
    'IRA Draw': Math.round(r.gross_draw / 1000),
  }));

  const minYear = data.length > 0 ? data[0].year : 2026;
  const maxYear = data.length > 0 ? data[data.length - 1].year : 2060;
  const maxVal = Math.max(...data.map(r => (r['SS'] || 0) + (r['IRA Draw'] || 0)));
  const yMax = sharedYMax || Math.ceil(maxVal / 100) * 100;
  const yTicks = Array.from({ length: yMax / 100 + 1 }, (_, i) => i * 100);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Annual Income ($K) vs Year</div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 20, left: 10, bottom: 0 }}>
          <XAxis dataKey="year" type="number" domain={[minYear, maxYear]} ticks={Array.from({length: maxYear - minYear + 1}, (_, i) => minYear + i)} tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-45} textAnchor="end" height={30} interval={0} />
          <YAxis width={52} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v}K`} ticks={Array.from({ length: Math.floor(yMax / 100) + 1 }, (_, i) => i * 100)} domain={[0, yMax]} interval={0} />
          <CartesianGrid vertical={false} stroke="#334155" strokeWidth={1} />
          <Tooltip content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const erikAge = label - new Date(params?.erikDOB).getFullYear();
            const debAge = label - new Date(params?.debDOB).getFullYear();
            const total = payload.reduce((s, p) => s + (p.value || 0), 0);
            return (
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, padding: '8px 12px', fontSize: 15 }}>
                <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 2 }}>{label} (Erik {erikAge}, Deb {debAge})</div>
                {payload.map(p => (
                  <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                    <span>{p.dataKey}</span>
                    <span>${p.value}K {total > 0 ? `(${Math.round(p.value / total * 100)}%)` : ''}</span>
                  </div>
                ))}
                <div style={{ color: '#e2e8f0', fontWeight: 600, borderTop: '1px solid #334155', marginTop: 2, paddingTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total</span><span>${total}K</span>
                </div>
              </div>
            );
          }} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Area type="linear" dataKey="IRA Draw"  stackId="1" stroke="#16a34a" fill="#16a34a" fillOpacity={0.6} />
          <Area type="linear" dataKey="SS"        stackId="1" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%' },
  title: { fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 2, flexShrink: 0 },
};
