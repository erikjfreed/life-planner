import { useDispatch, useSelector } from 'react-redux';
import { updateParameters } from '../parameters/parametersSlice';

const MONTHLY_OPTIONS = Array.from({ length: 41 }, (_, i) => i * 500); // 0 to 20000
const LIFESPAN_OPTIONS = Array.from({ length: 36 }, (_, i) => 70 + i); // age 70 to 105

const TAX_OPTIONS = Array.from({ length: 41 }, (_, i) => i); // 0 to 40

function TaxRow({ label, value, onChange }) {
  return (
    <div style={styles.row}>
      <div style={styles.label}>{label}</div>
      <div style={styles.control}>
        <select
          value={Math.round(value * 100)}
          onChange={e => onChange(parseFloat(e.target.value) / 100)}
          style={styles.input}
        >
          {TAX_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
        </select>
      </div>
    </div>
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
            style={styles.input}
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
    return (
      <div style={styles.row}>
        <div style={styles.label}>{label}</div>
        <div style={styles.control}>
          <input
            type="range" min={min} max={max} step={step || 0.1}
            value={(value * 100).toFixed(1)}
            onChange={e => onChange(parseFloat(e.target.value) / 100)}
            style={{ width: 90 }}
          />
          <span style={styles.value}>{(value * 100).toFixed(1)}%</span>
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

function LifespanRow({ label, deathYear, birthYear, onChange }) {
  const age = deathYear - birthYear;
  return (
    <div style={styles.row}>
      <div style={styles.label}>{label}</div>
      <div style={styles.control}>
        <select value={age} onChange={e => onChange(birthYear + parseInt(e.target.value))} style={styles.input}>
          {LIFESPAN_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

export default function ParametersPanel() {
  const dispatch = useDispatch();
  const params = useSelector(s => s.parameters.values);

  if (!params || Object.keys(params).length === 0) return <p>Loading...</p>;

  const update = (key) => (value) => dispatch(updateParameters({ [key]: value }));

  return (
    <div style={styles.panel}>
      <h2 style={styles.heading}>Parameters</h2>

      <Section title="Economic">
        <ParamRow label="General Inflation"    value={params.generalInflation}       onChange={update('generalInflation')}       type="slider" min={0} max={10} step={0.1} />
        <ParamRow label="Investment ROI"       value={params.investmentROI}          onChange={update('investmentROI')}          type="slider" min={0} max={15} step={0.1} />
        <ParamRow label="RE Appreciation"      value={params.realEstateAppreciation} onChange={update('realEstateAppreciation')} type="slider" min={0} max={10} step={0.1} />
        <ParamRow label="SS COLA"              value={params.ssCoLA}                 onChange={update('ssCoLA')}                 type="slider" min={0} max={5}  step={0.1} />
      </Section>

      <Section title="Healthcare">
        <ParamRow label="HC Inflation"         value={params.healthcareInflation}    onChange={update('healthcareInflation')}    type="slider" min={0} max={15} step={0.1} />
      </Section>

      <Section title="Taxes">
        <TaxRow label="Draw Fed Tax"   value={params.drawFedTaxRate}   onChange={update('drawFedTaxRate')}   />
        <TaxRow label="Draw State Tax" value={params.drawStateTaxRate} onChange={update('drawStateTaxRate')} />
        <TaxRow label="SS Fed Tax"     value={params.ssFedTaxRate}     onChange={update('ssFedTaxRate')}     />
        <TaxRow label="SS State Tax"   value={params.ssStateTaxRate}   onChange={update('ssStateTaxRate')}   />
      </Section>

      <Section title="Social Security">
        <ParamRow label="Erik Monthly ($)"     value={params.ssErikMonthly}          onChange={update('ssErikMonthly')}          type="dollars" />
        <ParamRow label="Debbie Monthly ($)"   value={params.ssDebbieMonthly}        onChange={update('ssDebbieMonthly')}        type="dollars" />
        <ParamRow label="Erik Start Year"      value={params.ssErikStartYear}        onChange={update('ssErikStartYear')}        type="year" />
        <ParamRow label="Debbie Start Year"    value={params.ssDebbieStartYear}      onChange={update('ssDebbieStartYear')}      type="year" />
      </Section>

      <Section title="Allowance">
        <ParamRow label="Per Person/Month ($)" value={params.allowancePerPersonPerMonth} onChange={update('allowancePerPersonPerMonth')} type="monthly-dropdown" />
        <ParamRow label="Deflation"            value={params.allowanceDeflation}     onChange={update('allowanceDeflation')}     type="slider" min={0} max={5} step={0.1} />
      </Section>

      <Section title="Lifespan">
        <LifespanRow label="Erik Death" deathYear={params.erikDeathYear} birthYear={new Date(params.erikDOB).getFullYear()} onChange={update('erikDeathYear')} />
        <LifespanRow label="Deb Death"  deathYear={params.debDeathYear}  birthYear={new Date(params.debDOB).getFullYear()}  onChange={update('debDeathYear')}  />
      </Section>
    </div>
  );
}

const styles = {
  panel: {
    width: 260,
    minWidth: 260,
    background: '#f9fafb',
    borderRight: '1px solid #e5e7eb',
    padding: '16px 12px',
    overflowY: 'auto',
    height: '100vh',
    boxSizing: 'border-box',
  },
  heading: { margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: '#111827' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 12, color: '#374151', flex: 1 },
  control: { display: 'flex', alignItems: 'center', gap: 6 },
  value: { fontSize: 12, color: '#111827', minWidth: 36, textAlign: 'right' },
  input: { width: 70, fontSize: 12, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4 },
};
