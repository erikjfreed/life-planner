import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DeathReferenceLine } from './DeathLines';

export default function WealthChart({ rows, params }) {
  const data = rows.map(r => ({
    age: r.erik_age,
    'Real Estate': Math.round(r.real_estate / 1000),
    'Investments': Math.round(r.investment_balance / 1000),
  }));

  const erikBirthYear = params?.erikDOB ? new Date(params.erikDOB).getFullYear() : null;
  const erikDeathAge = erikBirthYear ? params.erikDeathYear - erikBirthYear : null;
  const debDeathAge  = erikBirthYear ? params.debDeathYear  - erikBirthYear : null;
  const minAge = data.length > 0 ? data[0].age : 70;
  const maxAge = Math.max(data.length > 0 ? data[data.length - 1].age : 99, erikDeathAge || 0, debDeathAge || 0);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Wealth ($M) vs Age</div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 20, left: 10, bottom: 0 }}>
          <XAxis dataKey="age" type="number" domain={[minAge, maxAge]} tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => `$${(v/1000).toFixed(2)}M`} labelFormatter={l => `Age ${l}`} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="Real Estate" stackId="1" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.7} />
          <Area type="monotone" dataKey="Investments" stackId="1" stroke="#16a34a" fill="#16a34a" fillOpacity={0.6} />
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
