import { useState } from 'react';
import { useSelector } from 'react-redux';

const fmt  = v => `$${Math.round(v).toLocaleString()}`;
const fmtP = v => `${(v * 100).toFixed(3)}%`;

function buildAmortization(startYear, principal, annualRate, monthlyPayment) {
  const rows = [];
  let balance = principal;
  const r = annualRate / 12;
  const factor = Math.pow(1 + r, 12);
  for (let year = startYear; year <= 2060 && balance > 1; year++) {
    const closing = Math.max(0, balance * factor - monthlyPayment * (factor - 1) / r);
    const principalPaid = balance - closing;
    const interestPaid  = monthlyPayment * 12 - principalPaid;
    rows.push({ year, opening: balance, interest: Math.max(0, interestPaid), principal: principalPaid, closing });
    balance = closing;
  }
  return rows;
}

function LoanPanel({ loan, entity }) {
  const amort = buildAmortization(loan.start_year, loan.current_balance, loan.rate, loan.monthly_payment);

  return (
    <div style={styles.panel}>

      <div style={styles.summaryRow}>
        <div style={styles.summaryCell}><div style={styles.summaryLabel}>Current Balance</div><div style={styles.summaryValue}>{fmt(loan.current_balance)}</div></div>
        <div style={styles.summaryCell}><div style={styles.summaryLabel}>Rate</div><div style={styles.summaryValue}>{fmtP(loan.rate)}</div></div>
        <div style={styles.summaryCell}><div style={styles.summaryLabel}>Payment/Mo</div><div style={styles.summaryValue}>{fmt(loan.monthly_payment)}</div></div>
        <div style={styles.summaryCell}><div style={styles.summaryLabel}>Term</div><div style={styles.summaryValue}>{loan.term_years} yrs</div></div>
        <div style={styles.summaryCell}><div style={styles.summaryLabel}>Start</div><div style={styles.summaryValue}>{loan.start_year}</div></div>
      </div>

      <div style={styles.sectionLabel}>Amortization Schedule</div>
      <div style={styles.amortScroll}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Year</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Opening</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Interest</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Principal</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Closing</th>
            </tr>
          </thead>
          <tbody>
            {amort.map((r, i) => (
              <tr key={r.year} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                <td style={styles.td}>{r.year}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(r.opening)}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(r.interest)}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(r.principal)}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(r.closing)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LoansPage() {
  const loans    = useSelector(s => s.loans.items);
  const entities = useSelector(s => s.entities.items);

  const [activeId, setActiveId] = useState(null);
  const selected = loans.find(l => l.id === activeId) ?? loans[0];

  if (loans.length === 0) {
    return <div style={styles.page}><p style={{ color: '#6b7280', fontSize: 13 }}>No loans.</p></div>;
  }

  const selectedEntity = entities.find(e => e.id === selected?.entity_id);

  return (
    <div style={styles.page}>
      <div style={styles.subtabs}>
        {loans.map(loan => {
          const entity = entities.find(e => e.id === loan.entity_id);
          const label = entity ? (entity.street_address || entity.name) : loan.name;
          return (
            <button
              key={loan.id}
              onClick={() => setActiveId(loan.id)}
              style={{ ...styles.subtab, ...(loan.id === selected?.id ? styles.subtabActive : {}) }}
            >
              {label}
            </button>
          );
        })}
      </div>
      {selected && <LoanPanel loan={selected} entity={selectedEntity} />}
    </div>
  );
}

const styles = {
  page: { padding: '16px 24px', fontFamily: 'sans-serif', overflowY: 'auto', height: '100%', boxSizing: 'border-box' },
  subtabs: { display: 'flex', gap: 2, borderBottom: '1px solid #e5e7eb', marginBottom: 20 },
  subtab: { padding: '6px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderBottom: '2px solid transparent', background: 'none', cursor: 'pointer', color: '#6b7280', marginBottom: -1 },
  subtabActive: { color: '#111827', borderBottom: '2px solid #2563eb', fontWeight: 600 },
  panel: { maxWidth: 600 },
  summaryRow: { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  summaryCell: { background: '#f3f4f6', borderRadius: 6, padding: '8px 12px', minWidth: 100 },
  summaryLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: 700, color: '#111827' },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '16px 0 6px' },
  table: { borderCollapse: 'collapse', width: '100%' },
  th: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb', padding: '4px 8px', textAlign: 'left' },
  td: { fontSize: 12, padding: '3px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827' },
  amortScroll: { maxHeight: 300, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 4 },
};
