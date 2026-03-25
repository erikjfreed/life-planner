import { useDispatch, useSelector } from 'react-redux';
import { updateParameters } from '../parameters/parametersSlice';

const MONTHLY_OPTIONS = Array.from({ length: 41 }, (_, i) => i * 500); // 0 to 20000

const TAX_OPTIONS = Array.from({ length: 41 }, (_, i) => i); // 0 to 40

const fmt = v => `$${Math.round(v).toLocaleString()}`;

function DisplayRow({ label, value, color }) {
  return (
    <div style={styles.row}>
      <div style={styles.label}>{label}</div>
      <div style={{ fontSize: 11, color: color || '#111827', textAlign: 'right', minWidth: 68 }}>{value}</div>
    </div>
  );
}

function TaxCell({ value, onChange }) {
  return (
    <select
      value={Math.round(value * 100)}
      onChange={e => onChange(parseFloat(e.target.value) / 100)}
      style={styles.input}
    >
      {TAX_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
    </select>
  );
}

function ParamRow({ label, value, onChange, type, min, max, step }) {
  if (type === 'monthly-dropdown') {
    return (
      <div style={styles.row}>
        <div style={styles.label}>{label}</div>
        <div style={styles.control}>
          <select
            value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            style={{ ...styles.input, width: 68 }}
          >
            {MONTHLY_OPTIONS.map(v => (
              <option key={v} value={v}>${v.toLocaleString()}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }
  if (type === 'slider') {
    const s = step || 0.1;
    const options = [];
    for (let v = min; v <= max + 1e-9; v = Math.round((v + s) * 1000) / 1000) {
      options.push(Math.round(v * 10) / 10);
    }
    const currentPct = Math.round(value * 1000) / 10; // e.g. 0.025 -> 2.5
    return (
      <div style={styles.row}>
        <div style={styles.label}>{label}</div>
        <div style={styles.control}>
          <select
            value={currentPct}
            onChange={e => onChange(parseFloat(e.target.value) / 100)}
            style={{ ...styles.input, width: 58 }}
          >
            {options.map(v => <option key={v} value={v}>{v.toFixed(1)}%</option>)}
          </select>
        </div>
      </div>
    );
  }
  return (
    <div style={styles.row}>
      <div style={styles.label}>{label}</div>
      <div style={styles.control}>
        <input
          type="number"
          value={value}
          step={type === 'year' ? 1 : 100}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={styles.input}
        />
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <fieldset style={styles.section}>
      <legend style={styles.sectionTitle}>{title}</legend>
      <div style={{ marginBottom: -3 }}>{children}</div>
    </fieldset>
  );
}

export default function ParametersPanel() {
  const dispatch = useDispatch();
  const params = useSelector(s => s.parameters.present.values);
  const rows   = useSelector(s => s.timeline.rows);

  if (!params || Object.keys(params).length === 0) return <p>Loading...</p>;

  const update = (key) => (value) => dispatch(updateParameters({ [key]: value }));

  const firstRow = rows[0];
  const lastRow  = rows[rows.length - 1];
  const totalCapSpend = rows.reduce((sum, r) => sum + (r.capital_spend ?? 0), 0);
  const yearsSpan = lastRow && firstRow ? lastRow.year - firstRow.year : 0;
  const endWealthPastDollars = lastRow && params.generalInflation
    ? lastRow.invest_plus_re / Math.pow(1 + params.generalInflation, yearsSpan)
    : 0;

  return (
    <div style={styles.panel}>
      <h2 style={styles.heading}>Parameters</h2>

      <Section title="Investments">
        <ParamRow label="Investment ROI"  value={params.investmentROI} onChange={update('investmentROI')} type="slider" min={0} max={15} step={0.1} />
        {firstRow && <>
          <DisplayRow label="Portfolio Balance" value={fmt(firstRow.investment_balance)} />
          <DisplayRow label="Start Wealth"      value={fmt(firstRow.invest_plus_re)} />
          <DisplayRow label="Capital Spend"     value={fmt(totalCapSpend)} color="#ef4444" />
          <DisplayRow label="End Wealth"        value={fmt(lastRow.invest_plus_re)} />
          <DisplayRow label="End Wealth (2026$)" value={fmt(endWealthPastDollars)} />
        </>}
      </Section>

      <Section title="Inflation">
        <ParamRow label="General"         value={params.generalInflation}       onChange={update('generalInflation')}       type="slider" min={0} max={10} step={0.1} />
        <ParamRow label="Real Estate"     value={params.realEstateAppreciation} onChange={update('realEstateAppreciation')} type="slider" min={0} max={10} step={0.1} />
        <ParamRow label="Healthcare"      value={params.healthcareInflation}    onChange={update('healthcareInflation')}    type="slider" min={0} max={15} step={0.1} />
        <ParamRow label="Social Security" value={params.socialSecurityCoLA}      onChange={update('socialSecurityCoLA')}      type="slider" min={0} max={5}  step={0.1} />
      </Section>

      <Section title="Taxes">
        <div style={styles.taxGrid}>
          <div />
          <div style={styles.taxHeader}>Federal</div>
          <div style={styles.taxHeader}>State</div>
          <div style={styles.taxLabel}>Draw</div>
          <TaxCell value={params.drawFedTaxRate}   onChange={update('drawFedTaxRate')} />
          <TaxCell value={params.drawStateTaxRate}  onChange={update('drawStateTaxRate')} />
          <div style={styles.taxLabel}>SS</div>
          <TaxCell value={params.socialSecurityFedTaxRate}      onChange={update('socialSecurityFedTaxRate')} />
          <TaxCell value={params.socialSecurityStateTaxRate}     onChange={update('socialSecurityStateTaxRate')} />
        </div>
      </Section>

      <Section title="Allowance">
        <ParamRow label="Per Person/Month ($)" value={params.allowancePerPersonPerMonth} onChange={update('allowancePerPersonPerMonth')} type="monthly-dropdown" />
        <ParamRow label="Deflation"            value={params.allowanceDeflation}     onChange={update('allowanceDeflation')}     type="slider" min={0} max={5} step={0.1} />
      </Section>

    </div>
  );
}

const styles = {
  panel: {
    width: 240,
    minWidth: 240,
    background: '#f9fafb',
    borderRight: '1px solid #e5e7eb',
    padding: '6px 8px',
    overflowY: 'hidden',
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  },
  heading: { margin: '0 0 8px 0', fontSize: 14, fontWeight: 700, color: '#111827', flexShrink: 0 },
  section: { marginBottom: 8, border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 8px 7px', minWidth: 0 },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 3px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  label: { fontSize: 11, color: '#374151', flex: 1, textAlign: 'right', paddingRight: 6 },
  control: { display: 'flex', alignItems: 'center', gap: 4 },
  value: { fontSize: 11, color: '#111827', minWidth: 32, textAlign: 'right' },
  input: { width: 50, fontSize: 11, padding: '1px 3px', border: '1px solid #d1d5db', borderRadius: 3, textAlign: 'right' },
  taxGrid: { display: 'grid', gridTemplateColumns: 'auto auto auto', gap: '2px 4px', alignItems: 'center', justifyContent: 'end' },
  taxHeader: { fontSize: 11, fontWeight: 600, color: '#6b7280', textAlign: 'center' },
  taxLabel: { fontSize: 11, color: '#374151', textAlign: 'right', paddingRight: 4 },
};
