import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DeathReferenceLine } from './DeathLines';

export default function IncomeChart({ rows, params }) {
  const data = rows.map(r => ({
    year: r.year,
    'SS': Math.round(r.ss_net / 1000),
    'ROI': Math.round(r.roi / 1000),
    'Cap Spend': Math.round(r.capital_spend / 1000),
  }));

  const minYear = data.length > 0 ? data[0].year : 2026;
  const maxYear = data.length > 0 ? data[data.length - 1].year : 2060;
  const maxVal = Math.max(...data.map(r => (r['SS'] || 0) + (r['ROI'] || 0) + (r['Cap Spend'] || 0)));
  const yMax = Math.ceil(maxVal / 100) * 100;
  const yTicks = Array.from({ length: yMax / 100 + 1 }, (_, i) => i * 100);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Annual Income ($K) vs Year</div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 20, left: 10, bottom: 0 }}>
          <XAxis dataKey="year" type="number" domain={[minYear, maxYear]} ticks={Array.from({length: maxYear - minYear + 1}, (_, i) => minYear + i)} tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={30} interval={0} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v % 200 === 0 ? `$${v}K` : ''} ticks={yTicks} domain={[0, yMax]} interval={0} />
          <CartesianGrid vertical={false} stroke="#e5e7eb" strokeWidth={1} />
          <Tooltip formatter={(v) => `$${v}K`} labelFormatter={l => { const erikAge = l - new Date(params?.erikDOB).getFullYear(); const debAge = l - new Date(params?.debDOB).getFullYear(); return `${l}  (Erik ${erikAge}, Deb ${debAge})`; }} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="SS"        stackId="1" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} />
          <Area type="monotone" dataKey="ROI"       stackId="1" stroke="#86efac" fill="#86efac" fillOpacity={0.7} />
          <Area type="monotone" dataKey="Cap Spend" stackId="1" stroke="#dc2626" fill="#dc2626" fillOpacity={0.7} />
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
