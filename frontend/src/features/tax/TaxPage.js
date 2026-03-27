import { useState, useEffect } from 'react';

const fmt = v => v == null ? '—' : `$${Math.round(v).toLocaleString()}`;
const pct = v => v == null ? '—' : `${(v * 100).toFixed(1)}%`;

const FILING_LABELS = {
  married_filing_jointly: 'MFJ',
  single: 'Single',
  head_of_household: 'HoH',
};

export default function TaxPage() {
  const [taxData, setTaxData] = useState([]);
  const [estimates, setEstimates] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/lifeplanner/api/tax-computed')
      .then(r => r.json())
      .then(data => {
        setTaxData(data.map(r => ({ ...r, estimate: undefined, ...r })));
        const results = {};
        for (const row of data) {
          if (row.estimate) results[row.year] = row.estimate;
        }
        setEstimates(results);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.page}><p>Loading...</p></div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>Tax Estimates</h2>
      </div>

      <div style={styles.scroll}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th colSpan={5} style={{ border: 'none' }}></th>
              <th style={styles.groupTh} colSpan={2}>Deductions</th>
              <th style={{ border: 'none', width: 6 }}></th>
              <th style={styles.groupTh} colSpan={4}>Social Security</th>
              <th style={{ border: 'none', width: 6 }}></th>
              <th style={styles.groupTh} colSpan={4}>Draw (IRA)</th>
              <th style={{ border: 'none', width: 6 }}></th>
              <th style={styles.groupTh} colSpan={3}>Result</th>
              <th style={{ border: 'none', width: 6 }}></th>
              <th style={styles.groupTh}>Events</th>
            </tr>
            <tr>
              <th style={styles.th}>Year</th>
              <th style={styles.th}>Erik</th>
              <th style={styles.th}>Deb</th>
              <th style={styles.th}>Filing</th>
              <th style={styles.th}>State</th>
              <th style={{ ...styles.th, ...styles.bl, textAlign: 'right' }}>Mtg Interest</th>
              <th style={{ ...styles.th, ...styles.br, textAlign: 'right' }}>Prop Tax</th>
              <th style={styles.gap}></th>
              <th style={{ ...styles.th, ...styles.bl, textAlign: 'right' }}>Income</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Fed</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>State</th>
              <th style={{ ...styles.th, ...styles.br, textAlign: 'right' }}>Tax</th>
              <th style={styles.gap}></th>
              <th style={{ ...styles.th, ...styles.bl, textAlign: 'right' }}>Income</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Fed</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>State</th>
              <th style={{ ...styles.th, ...styles.br, textAlign: 'right' }}>Tax</th>
              <th style={styles.gap}></th>
              <th style={{ ...styles.th, ...styles.bl, textAlign: 'right' }}>Total Tax</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Effective</th>
              <th style={{ ...styles.th, ...styles.br, textAlign: 'center' }}>Cycles</th>
              <th style={styles.gap}></th>
              <th style={{ ...styles.th, ...styles.bl, ...styles.br }}></th>
            </tr>
          </thead>
          <tbody>
            {taxData.map((row, i) => {
              const est = estimates[row.year];
              const ev = row.event;
              const last = i === taxData.length - 1;
              const b = last ? styles.bb : {};
              const isDeath = ev?.type === 'spouse_death';
              const isPetDeath = ev?.type === 'pet_death';
              const isEog = ev?.type === 'eog';
              const isSS = ev?.type === 'ss';
              const isSell = ev?.type === 'real_estate_sell';
              const isBuy = ev?.type === 'real_estate_buy';
              const eventColor = isDeath ? '#ef4444' : isPetDeath ? '#f97316' : isEog ? '#16a34a' : isSS ? '#2563eb' : isSell ? '#16a34a' : isBuy ? '#7c3aed' : undefined;
              return (
                <tr key={row.year} style={{ background: i % 2 === 0 ? '#1e293b' : '#0f172a' }} title={est?.explanation || ''}>
                  <td style={styles.td}>{row.year}</td>
                  <td style={styles.td}>{row.erik_age}</td>
                  <td style={styles.td}>{row.deb_age}</td>
                  <td style={styles.td}>{FILING_LABELS[row.filing_status] || row.filing_status}</td>
                  <td style={styles.td}>{row.state}</td>
                  <td style={{ ...styles.td, ...styles.bl, ...b, textAlign: 'right' }}>{fmt(row.mortgage_interest)}</td>
                  <td style={{ ...styles.td, ...styles.br, ...b, textAlign: 'right' }}>{fmt(row.property_taxes)}</td>
                  <td style={styles.gap}></td>
                  <td style={{ ...styles.td, ...styles.bl, ...b, textAlign: 'right' }}>{fmt(row.ss_income)}</td>
                  <td style={{ ...styles.td, ...b, textAlign: 'right' }}>
                    {est?.loading ? '...' : est?.ss_fed_rate != null ? pct(est.ss_fed_rate) : '—'}
                  </td>
                  <td style={{ ...styles.td, ...b, textAlign: 'right' }}>
                    {est?.loading ? '...' : est?.ss_state_rate != null ? pct(est.ss_state_rate) : '—'}
                  </td>
                  <td style={{ ...styles.td, ...styles.br, ...b, textAlign: 'right' }}>
                    {est?.ss_fed_rate != null ? fmt(row.ss_income * ((est.ss_fed_rate || 0) + (est.ss_state_rate || 0))) : '—'}
                  </td>
                  <td style={styles.gap}></td>
                  <td style={{ ...styles.td, ...styles.bl, ...b, textAlign: 'right' }}>
                    {est?.gross_draw_solved != null ? fmt(est.gross_draw_solved) : fmt(row.gross_draw)}
                  </td>
                  <td style={{ ...styles.td, ...b, textAlign: 'right' }}>
                    {est?.loading ? '...' : est?.draw_fed_rate != null ? pct(est.draw_fed_rate) : '—'}
                  </td>
                  <td style={{ ...styles.td, ...b, textAlign: 'right' }}>
                    {est?.loading ? '...' : est?.draw_state_rate != null ? pct(est.draw_state_rate) : '—'}
                  </td>
                  <td style={{ ...styles.td, ...styles.br, ...b, textAlign: 'right' }}>
                    {est?.draw_fed_rate != null ? fmt((est.gross_draw_solved || row.gross_draw) * (est.draw_fed_rate + (est.draw_state_rate || 0))) : '—'}
                  </td>
                  <td style={styles.gap}></td>
                  <td style={{ ...styles.td, ...styles.bl, ...b, textAlign: 'right', fontWeight: 600 }}>
                    {est?.draw_fed_rate != null ? fmt(
                      (est.gross_draw_solved || row.gross_draw) * (est.draw_fed_rate + (est.draw_state_rate || 0)) +
                      row.ss_income * ((est.ss_fed_rate || 0) + (est.ss_state_rate || 0))
                    ) : '—'}
                  </td>
                  <td style={{ ...styles.td, ...b, textAlign: 'right' }}>
                    {est?.total_tax != null ? (() => {
                      const totalIncome = (est.gross_draw_solved || row.gross_draw) + row.ss_income;
                      return totalIncome > 0 ? pct(est.total_tax / totalIncome) : '—';
                    })() : '—'}
                  </td>
                  <td style={{ ...styles.td, ...styles.br, ...b, textAlign: 'center' }}>
                    {est?.iterations != null ? est.iterations : '—'}
                  </td>
                  <td style={styles.gap}></td>
                  <td style={{ ...styles.td, ...styles.bl, ...styles.br, ...b, color: eventColor, fontWeight: ev ? 600 : undefined, whiteSpace: 'nowrap' }}>
                    {ev?.label || ''}
                  </td>
                    </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '16px 24px', fontFamily: 'sans-serif', overflowY: 'auto', height: '100%', boxSizing: 'border-box' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 },
  title: { margin: 0, fontSize: 16, fontWeight: 700, color: '#e2e8f0' },
  scroll: { overflowX: 'auto' },
  table: { borderCollapse: 'collapse', width: 'auto' },
  th: { fontSize: 12, fontWeight: 600, color: '#cbd5e1', background: '#334155', borderBottom: '2px solid #475569', padding: '3px 6px', textAlign: 'left' },
  groupTh: { fontSize: 12, fontWeight: 700, color: '#e2e8f0', background: '#334155', textAlign: 'center', padding: '3px 6px', border: '1px solid #475569' },
  gap: { width: 6, padding: 0, border: 'none' },
  td: { fontSize: 12, padding: '3px 6px', borderBottom: '1px solid #334155', color: '#e2e8f0' },
  bl: { borderLeft: '1px solid #475569' },
  br: { borderRight: '1px solid #475569' },
  bb: { borderBottom: '1px solid #475569' },
  calcBtn: { padding: '2px 8px', fontSize: 12, border: '1px solid #475569', borderRadius: 3, background: '#1e293b', cursor: 'pointer', color: '#e2e8f0' },
};
