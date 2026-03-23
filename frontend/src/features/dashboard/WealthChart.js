import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DeathReferenceLine } from './DeathLines';

export default function WealthChart({ rows, params }) {
  const data = rows.map(r => ({
    year: r.year,
    'Real Estate': Math.round(r.real_estate / 1000),
    'Investments': Math.round(r.investment_balance / 1000),
  }));

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
          <XAxis dataKey="year" type="number" domain={[minYear, maxYear]} ticks={Array.from({length: maxYear - minYear + 1}, (_, i) => minYear + i)} tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={30} interval={0} />
          <YAxis tickFormatter={v => v % 2000 === 0 ? `$${(v/1000).toFixed(0)}M` : ''} tick={{ fontSize: 11 }} ticks={yTicks} domain={[0, yMax]} interval={0} />
          <CartesianGrid vertical={false} stroke="#e5e7eb" strokeWidth={1} />
          <Tooltip formatter={(v) => `$${(v/1000).toFixed(2)}M`} labelFormatter={l => { const erikAge = l - new Date(params?.erikDOB).getFullYear(); const debAge = l - new Date(params?.debDOB).getFullYear(); return `${l}  (Erik ${erikAge}, Deb ${debAge})`; }} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="Real Estate" stackId="1" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.7} />
          <Area type="monotone" dataKey="Investments" stackId="1" stroke="#16a34a" fill="#16a34a" fillOpacity={0.6} />
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
