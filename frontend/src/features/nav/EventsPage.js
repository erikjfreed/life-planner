import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createEvent, updateEvent, deleteEvent } from '../events/eventsSlice';

function personAge(name, year, params) {
  const dob = name === 'Erik' ? params.erikDOB : name === 'Deb' ? params.debDOB : null;
  if (!dob || !year) return null;
  return year - new Date(dob).getFullYear();
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const EVENT_TYPES = ['re_buy', 're_sell', 'death', 'ss_start', 'car_buy', 'car_sell'];

const TYPE_LABELS = {
  re_buy:   'RE Buy',
  re_sell:  'RE Sell',
  death:    'Death',
  ss_start: 'SS Start',
  car_buy:  'Car Buy',
  car_sell: 'Car Sell',
};

// Columns relevant per event type
const ENTITY_TYPES = ['re_buy', 're_sell', 'car_buy', 'car_sell'];
const PERSON_TYPES = ['death', 'ss_start'];

function eventSummary(ev, entities, params) {
  const entity = entities.find(e => e.id === ev.entity_id);
  const rawName = entity ? (entity.street_address || entity.name) : ev.name || null;
  const name = ev.type === 'ss_start' && ev.name ? `${ev.name} starts SS`
    : ev.type === 'death' && ev.name ? `${ev.name} Passes`
    : (ev.type === 're_buy' || ev.type === 'car_buy') && rawName ? `Purchase ${rawName}`
    : (ev.type === 're_sell' || ev.type === 'car_sell') && rawName ? `Sale of ${rawName}` : rawName;
  const details = [];
  if (ev.type === 'death' && ev.age != null) details.push(`age ${ev.age}`);
  if (ev.type === 'ss_start' && ev.name && params) {
    const age = personAge(ev.name, ev.year, params);
    if (age != null) details.push(`age ${age}`);
    if (ev.month != null) details.push(MONTHS[ev.month - 1]);
  }
  if (ev.principal_balance != null) details.push(`bal $${Math.round(ev.principal_balance).toLocaleString()}`);
  return { name, details: details.join(' · ') };
}

const EMPTY_FORM = {
  type: 're_buy',
  year: new Date().getFullYear(),
  month: '',
  age: '',
  entity_id: '',
  name: '',
  purchase_price: '',
  principal_balance: '',
  monthly_payment: '',
  sale_price: '',
  selling_costs_pct: '',
};

function EventForm({ initial, entities, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isEntityEvent = ENTITY_TYPES.includes(form.type);
  const isPersonEvent = PERSON_TYPES.includes(form.type);

  const isDeathEvent = form.type === 'death';

  const handleSave = () => {
    const payload = {
      type: form.type,
      year: isDeathEvent ? null : parseInt(form.year),
      month: form.type === 'ss_start' ? (form.month !== '' ? parseInt(form.month) : null) : null,
      age:  isDeathEvent ? (form.age !== '' ? parseInt(form.age) : null) : null,
      entity_id: isEntityEvent ? (parseInt(form.entity_id) || null) : null,
      name: isPersonEvent ? form.name || null : null,
      purchase_price:    form.purchase_price    !== '' ? parseFloat(form.purchase_price)    : null,
      principal_balance: form.principal_balance !== '' ? parseFloat(form.principal_balance) : null,
      monthly_payment:   form.monthly_payment   !== '' ? parseFloat(form.monthly_payment)   : null,
      sale_price:        form.sale_price        !== '' ? parseFloat(form.sale_price)        : null,
      selling_costs_pct: form.selling_costs_pct !== '' ? parseFloat(form.selling_costs_pct) : null,
      down_payment: null,
    };
    onSave(payload);
  };

  return (
    <div style={styles.formBox}>
      <div style={styles.formRow}>
        <label style={styles.label}>Type</label>
        <select style={styles.input} value={form.type} onChange={e => set('type', e.target.value)}>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>

        {isDeathEvent ? (
          <>
            <label style={styles.label}>Age</label>
            <input style={{ ...styles.input, width: 60 }} type="number" value={form.age}
              onChange={e => set('age', e.target.value)} />
          </>
        ) : (
          <>
            <label style={styles.label}>Year</label>
            <input style={{ ...styles.input, width: 70 }} type="number" value={form.year}
              onChange={e => set('year', e.target.value)} />
          </>
        )}

        {isEntityEvent && (
          <>
            <label style={styles.label}>Entity</label>
            <select style={styles.input} value={form.entity_id} onChange={e => set('entity_id', e.target.value)}>
              <option value="">— select —</option>
              {entities.map(en => <option key={en.id} value={en.id}>{en.street_address || en.name}</option>)}
            </select>
          </>
        )}

        {isPersonEvent && (
          <>
            <label style={styles.label}>Person</label>
            <input style={{ ...styles.input, width: 80 }} value={form.name}
              onChange={e => set('name', e.target.value)} placeholder="Erik / Deb" />
          </>
        )}
      </div>

      <div style={styles.formRow}>
        {(form.type === 're_buy' || form.type === 'car_buy') && (
          <>
            <label style={styles.label}>Purchase Price</label>
            <input style={{ ...styles.input, width: 100 }} type="number" value={form.purchase_price}
              onChange={e => set('purchase_price', e.target.value)} />

            <label style={styles.label}>Principal Bal</label>
            <input style={{ ...styles.input, width: 100 }} type="number" value={form.principal_balance}
              onChange={e => set('principal_balance', e.target.value)} />

            <label style={styles.label}>Monthly Pmt</label>
            <input style={{ ...styles.input, width: 80 }} type="number" value={form.monthly_payment}
              onChange={e => set('monthly_payment', e.target.value)} />
          </>
        )}

        {(form.type === 're_sell' || form.type === 'car_sell') && (
          <>
            <label style={styles.label}>Sale Price</label>
            <input style={{ ...styles.input, width: 100 }} type="number" value={form.sale_price}
              onChange={e => set('sale_price', e.target.value)} />

            <label style={styles.label}>Selling Costs %</label>
            <input style={{ ...styles.input, width: 70 }} type="number" step="0.01" value={form.selling_costs_pct}
              onChange={e => set('selling_costs_pct', e.target.value)} placeholder="0.06" />
          </>
        )}

        {form.type === 'ss_start' && (
          <>
            <label style={styles.label}>Start Month</label>
            <select style={styles.input} value={form.month} onChange={e => set('month', e.target.value)}>
              <option value="">—</option>
              {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <label style={styles.label}>Monthly Pmt</label>
            <input style={{ ...styles.input, width: 80 }} type="number" value={form.monthly_payment}
              onChange={e => set('monthly_payment', e.target.value)} />
          </>
        )}
      </div>

      <div style={styles.formRow}>
        <button style={styles.saveBtn} onClick={handleSave}>Save</button>
        <button style={styles.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const dispatch = useDispatch();
  const events   = useSelector(s => s.events.items);
  const entities = useSelector(s => s.entities.items);
  const params   = useSelector(s => s.parameters.present.values);

  const [adding, setAdding]     = useState(false);
  const [editingId, setEditingId] = useState(null);

  const sorted = [...events].sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || (a.month ?? 1) - (b.month ?? 1) || a.type.localeCompare(b.type));

  const handleAdd = (payload) => {
    dispatch(createEvent(payload));
    setAdding(false);
  };

  const handleEdit = (payload) => {
    dispatch(updateEvent({ id: editingId, ...payload }));
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this event?')) dispatch(deleteEvent(id));
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>Events</h2>
        {!adding && <button style={styles.addBtn} onClick={() => setAdding(true)}>+ Add Event</button>}
      </div>

      {adding && (
        <EventForm entities={entities} onSave={handleAdd} onCancel={() => setAdding(false)} />
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Year</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Name</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Price</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Monthly</th>
            <th style={styles.th}>Details</th>
            <th style={{ ...styles.th, width: 80 }}></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(ev => (
            editingId === ev.id ? (
              <tr key={ev.id}>
                <td colSpan={7} style={styles.td}>
                  <EventForm
                    initial={{
                      type: ev.type,
                      year: ev.year ?? '',
                      month: ev.month ?? '',
                      age:  ev.age  ?? '',
                      entity_id: ev.entity_id ?? '',
                      name: ev.name ?? '',
                      purchase_price:    ev.purchase_price    ?? '',
                      principal_balance: ev.principal_balance ?? '',
                      monthly_payment:   ev.monthly_payment   ?? '',
                      sale_price:        ev.sale_price        ?? '',
                      selling_costs_pct: ev.selling_costs_pct ?? '',
                    }}
                    entities={entities}
                    onSave={handleEdit}
                    onCancel={() => setEditingId(null)}
                  />
                </td>
              </tr>
            ) : (
              <tr key={ev.id} style={{ background: ev.type === 'death' ? '#fef2f2' : undefined }}>
                <td style={styles.td}>{`${ev.month || 1}/1/${ev.year}`}</td>
                <td style={styles.td}>{TYPE_LABELS[ev.type] ?? ev.type}</td>
                <td style={{ ...styles.td, background: '#f3f4f6' }}>{eventSummary(ev, entities, params).name}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{(() => {
                  const amt = (ev.type === 're_buy' || ev.type === 'car_buy') && ev.purchase_price != null ? -ev.purchase_price
                    : (ev.type === 're_sell' || ev.type === 'car_sell') && ev.sale_price != null ? ev.sale_price
                    : null;
                  if (amt == null) return '—';
                  const color = amt >= 0 ? '#16a34a' : '#dc2626';
                  return <span style={{ color }}>{amt < 0 ? '-' : ''}${Math.abs(Math.round(amt)).toLocaleString()}</span>;
                })()}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{(() => {
                  if (ev.type === 'ss_start' && ev.monthly_payment != null) {
                    return <span style={{ color: '#16a34a' }}>${Math.round(ev.monthly_payment).toLocaleString()}</span>;
                  }
                  if ((ev.type === 're_buy' || ev.type === 'car_buy') && ev.entity_id) {
                    const entity = entities.find(e => e.id === ev.entity_id);
                    if (entity) {
                      const services = entity.services_json ? JSON.parse(entity.services_json) : [];
                      const monthly = services.reduce((s, i) => s + i.monthly, 0)
                        + (entity.insurance_yearly ?? 0) / 12
                        + (entity.tax_yearly ?? 0) / 12;
                      if (monthly > 0) return <span style={{ color: '#dc2626' }}>${Math.round(monthly).toLocaleString()}</span>;
                    }
                  }
                  return '—';
                })()}</td>
                <td style={styles.td}>{eventSummary(ev, entities, params).details}</td>
                <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                  <button style={styles.editBtn} onClick={() => setEditingId(ev.id)}>Edit</button>
                  <button style={styles.delBtn}  onClick={() => handleDelete(ev.id)}>Del</button>
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  page:  { padding: '16px 24px', fontFamily: 'sans-serif', overflowY: 'auto', height: '100%', boxSizing: 'border-box' },
  header:{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 },
  title: { margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' },
  addBtn:{ padding: '4px 12px', fontSize: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  table: { borderCollapse: 'collapse', width: '100%', maxWidth: 800 },
  th:    { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb', padding: '4px 8px', textAlign: 'left' },
  td:    { fontSize: 12, padding: '4px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827' },
  editBtn:{ marginRight: 4, padding: '2px 8px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 3, background: '#f9fafb', cursor: 'pointer' },
  delBtn: { padding: '2px 8px', fontSize: 11, border: '1px solid #fca5a5', borderRadius: 3, background: '#fff', color: '#dc2626', cursor: 'pointer' },
  formBox:{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '12px 16px', marginBottom: 16, maxWidth: 800 },
  formRow:{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  label:  { fontSize: 11, fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' },
  input:  { fontSize: 12, padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: 3 },
  saveBtn:  { padding: '4px 14px', fontSize: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  cancelBtn:{ padding: '4px 14px', fontSize: 12, background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', marginLeft: 4 },
  nameBadge: { background: '#f3f4f6', padding: '1px 6px', borderRadius: 3, fontSize: 11, color: '#374151' },
};
