const express = require('express');
const cors = require('cors');
const db = require('./database');
const { computeTimeline } = require('./compute');
const DEFAULT_PARAMS = require('./defaultParams');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Load parameters from DB, falling back to defaults
function loadParams() {
  const rows = db.prepare('SELECT key, value FROM parameters').all();
  const stored = Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)]));
  return { ...DEFAULT_PARAMS, ...stored };
}

// Load all events ordered by year
function loadEvents() {
  return db.prepare('SELECT * FROM events ORDER BY year').all();
}

// GET /api/parameters
app.get('/api/parameters', (req, res) => {
  res.json(loadParams());
});

// POST /api/parameters — update one or more parameters
app.post('/api/parameters', (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO parameters (key, value) VALUES (?, ?)');
  const upsertMany = db.transaction((updates) => {
    for (const [key, value] of Object.entries(updates)) {
      if (key in DEFAULT_PARAMS) {
        upsert.run(key, JSON.stringify(value));
      }
    }
  });
  upsertMany(req.body);
  res.json(loadParams());
});

// GET /api/timeline — compute from current parameters and events
app.get('/api/timeline', (req, res) => {
  const params = loadParams();
  const events = loadEvents();
  const rows = computeTimeline(params, events);
  res.json(rows);
});

// GET /api/events — return all events ordered by year
app.get('/api/events', (req, res) => {
  res.json(loadEvents());
});

// POST /api/events — insert a new event, return all events
app.post('/api/events', (req, res) => {
  const e = req.body;
  db.prepare(`
    INSERT INTO events (type, year, name, purchase_price, down_payment, principal_balance, mortgage_rate,
      term_years, monthly_payment, appreciation_rate, expense_base, tax_yearly, insurance_yearly,
      sale_price, selling_costs_pct, useful_life_years)
    VALUES (@type, @year, @name, @purchase_price, @down_payment, @principal_balance, @mortgage_rate,
      @term_years, @monthly_payment, @appreciation_rate, @expense_base, @tax_yearly, @insurance_yearly,
      @sale_price, @selling_costs_pct, @useful_life_years)
  `).run({
    type: e.type ?? null,
    year: e.year ?? null,
    name: e.name ?? null,
    purchase_price: e.purchase_price ?? null,
    down_payment: e.down_payment ?? null,
    principal_balance: e.principal_balance ?? null,
    mortgage_rate: e.mortgage_rate ?? null,
    term_years: e.term_years ?? null,
    monthly_payment: e.monthly_payment ?? null,
    appreciation_rate: e.appreciation_rate ?? null,
    expense_base: e.expense_base ?? null,
    tax_yearly: e.tax_yearly ?? null,
    insurance_yearly: e.insurance_yearly ?? null,
    sale_price: e.sale_price ?? null,
    selling_costs_pct: e.selling_costs_pct ?? null,
    useful_life_years: e.useful_life_years ?? null,
  });
  res.json(loadEvents());
});

// PUT /api/events/:id — update event by id, return all events
app.put('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const e = req.body;
  db.prepare(`
    UPDATE events SET
      type = @type, year = @year, name = @name, purchase_price = @purchase_price,
      down_payment = @down_payment, principal_balance = @principal_balance,
      mortgage_rate = @mortgage_rate, term_years = @term_years, monthly_payment = @monthly_payment,
      appreciation_rate = @appreciation_rate, expense_base = @expense_base,
      tax_yearly = @tax_yearly, insurance_yearly = @insurance_yearly,
      sale_price = @sale_price, selling_costs_pct = @selling_costs_pct,
      useful_life_years = @useful_life_years
    WHERE id = @id
  `).run({
    id: parseInt(id),
    type: e.type ?? null,
    year: e.year ?? null,
    name: e.name ?? null,
    purchase_price: e.purchase_price ?? null,
    down_payment: e.down_payment ?? null,
    principal_balance: e.principal_balance ?? null,
    mortgage_rate: e.mortgage_rate ?? null,
    term_years: e.term_years ?? null,
    monthly_payment: e.monthly_payment ?? null,
    appreciation_rate: e.appreciation_rate ?? null,
    expense_base: e.expense_base ?? null,
    tax_yearly: e.tax_yearly ?? null,
    insurance_yearly: e.insurance_yearly ?? null,
    sale_price: e.sale_price ?? null,
    selling_costs_pct: e.selling_costs_pct ?? null,
    useful_life_years: e.useful_life_years ?? null,
  });
  res.json(loadEvents());
});

// DELETE /api/events/:id — delete event by id, return all events
app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM events WHERE id = ?').run(parseInt(id));
  res.json(loadEvents());
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
