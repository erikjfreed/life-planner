import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DeathReferenceLine } from './DeathLines';

export default function IncomeChart({ rows, params }) {
  const data = rows.map(r => ({
    age: r.erik_age,
    'SS': Math.round(r.ss_net / 1000),
    'ROI': Math.round(r.roi / 1000),
    'Cap Spend': Math.round(r.capital_spend / 1000),
  }));

  const erikBirthYear = params?.erikDOB ? new Date(params.erikDOB).getFullYear() : null;
  const erikDeathAge = erikBirthYear ? params.erikDeathYear - erikBirthYear : null;
  const debDeathAge  = erikBirthYear ? params.debDeathYear  - erikBirthYear : null;
  const minAge = data.length > 0 ? data[0].age : 70;
  const maxAge = Math.max(data.length > 0 ? data[data.length - 1].age : 99, erikDeathAge || 0, debDeathAge || 0);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Annual Income ($K) vs Age</div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 20, left: 10, bottom: 0 }}>
          <XAxis dataKey="age" type="number" domain={[minAge, maxAge]} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}K`} />
          <Tooltip formatter={(v) => `$${v}K`} labelFormatter={l => `Age ${l}`} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="SS"        stackId="1" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} />
          <Area type="monotone" dataKey="ROI"       stackId="1" stroke="#86efac" fill="#86efac" fillOpacity={0.7} />
          <Area type="monotone" dataKey="Cap Spend" stackId="1" stroke="#dc2626" fill="#dc2626" fillOpacity={0.7} />
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
