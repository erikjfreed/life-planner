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
        <div style={styles.idCell}><div style={styles.summaryLabel}>Loan ID</div><div style={styles.idValue}>{loan.id}</div></div>
        {loan.entity_id != null && <div style={styles.idCell}><div style={styles.summaryLabel}>Entity ID</div><div style={styles.idValue}>{loan.entity_id}</div></div>}
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
              <th style={styles.stickyTh}>Year</th>
              <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Opening</th>
              <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Interest</th>
              <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Principal</th>
              <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Closing</th>
            </tr>
          </thead>
          <tbody>
            {amort.map((r, i) => (
              <tr key={r.year} style={{ background: i % 2 === 0 ? '#1e293b' : '#0f172a' }}>
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
    return <div style={styles.page}><p style={{ color: '#94a3b8', fontSize: 13 }}>No loans.</p></div>;
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
  subtabs: { display: 'flex', gap: 6, marginBottom: 12 },
  subtab: { padding: '4px 14px', fontSize: 12, fontWeight: 500, border: 'none', borderLeft: '2px solid #334155', borderBottom: '2px solid #334155', borderRadius: '0 0 0 8px', background: 'none', cursor: 'pointer', color: '#94a3b8' },
  subtabActive: { color: '#e2e8f0', borderLeftColor: '#2563eb', borderBottomColor: '#2563eb', fontWeight: 600 },
  panel: { maxWidth: 600 },
  summaryRow: { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  summaryCell: { background: '#1e293b', borderRadius: 6, padding: '8px 12px', minWidth: 100 },
  idCell: { background: '#0f172a', borderRadius: 6, padding: '8px 12px', minWidth: 50, border: '1px dashed #475569' },
  summaryLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: 700, color: '#e2e8f0' },
  idValue: { fontSize: 14, fontWeight: 700, color: '#64748b', fontFamily: 'monospace' },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '16px 0 6px' },
  table: { borderCollapse: 'collapse', width: '100%' },
  th: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', borderBottom: '2px solid #334155', padding: '4px 8px', textAlign: 'left' },
  stickyTh: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', borderBottom: '2px solid #334155', padding: '4px 8px', textAlign: 'left', position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 },
  td: { fontSize: 12, padding: '3px 8px', borderBottom: '1px solid #334155', color: '#e2e8f0' },
  amortScroll: { maxHeight: 300, overflowY: 'auto', border: '1px solid #334155', borderRadius: 4 },
};
