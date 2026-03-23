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
            style={styles.input}
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
    <fieldset style={styles.section}>
      <legend style={styles.sectionTitle}>{title}</legend>
      <div style={{ marginBottom: -3 }}>{children}</div>
    </fieldset>
  );
}

export default function ParametersPanel() {
  const dispatch = useDispatch();
  const params = useSelector(s => s.parameters.present.values);

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
  input: { width: 68, fontSize: 11, padding: '1px 3px', border: '1px solid #d1d5db', borderRadius: 3 },
};
