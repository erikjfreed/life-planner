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

// Load all entities ordered by name
function loadEntities() {
  return db.prepare('SELECT * FROM entities ORDER BY name').all();
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
  const entities = loadEntities();
  const rows = computeTimeline(params, events, entities);
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
    INSERT INTO events (type, year, entity_id, name, purchase_price, down_payment, principal_balance,
      monthly_payment, sale_price, selling_costs_pct)
    VALUES (@type, @year, @entity_id, @name, @purchase_price, @down_payment, @principal_balance,
      @monthly_payment, @sale_price, @selling_costs_pct)
  `).run({
    type: e.type ?? null,
    year: e.year ?? null,
    entity_id: e.entity_id ?? null,
    name: e.name ?? null,
    purchase_price: e.purchase_price ?? null,
    down_payment: e.down_payment ?? null,
    principal_balance: e.principal_balance ?? null,
    monthly_payment: e.monthly_payment ?? null,
    sale_price: e.sale_price ?? null,
    selling_costs_pct: e.selling_costs_pct ?? null,
  });
  res.json(loadEvents());
});

// PUT /api/events/:id — update event by id, return all events
app.put('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const e = req.body;
  db.prepare(`
    UPDATE events SET
      type = @type, year = @year, entity_id = @entity_id, name = @name,
      purchase_price = @purchase_price, down_payment = @down_payment,
      principal_balance = @principal_balance, monthly_payment = @monthly_payment,
      sale_price = @sale_price, selling_costs_pct = @selling_costs_pct
    WHERE id = @id
  `).run({
    id: parseInt(id),
    type: e.type ?? null,
    year: e.year ?? null,
    entity_id: e.entity_id ?? null,
    name: e.name ?? null,
    purchase_price: e.purchase_price ?? null,
    down_payment: e.down_payment ?? null,
    principal_balance: e.principal_balance ?? null,
    monthly_payment: e.monthly_payment ?? null,
    sale_price: e.sale_price ?? null,
    selling_costs_pct: e.selling_costs_pct ?? null,
  });
  res.json(loadEvents());
});

// DELETE /api/events/:id — delete event by id, return all events
app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM events WHERE id = ?').run(parseInt(id));
  res.json(loadEvents());
});

// GET /api/entities — return all entities ordered by name
app.get('/api/entities', (req, res) => {
  res.json(loadEntities());
});

// POST /api/entities — insert a new entity, return all entities
app.post('/api/entities', (req, res) => {
  const en = req.body;
  db.prepare(`
    INSERT INTO entities (type, name, appreciation_rate, services_json, tax_yearly, insurance_yearly, mortgage_rate, term_years)
    VALUES (@type, @name, @appreciation_rate, @services_json, @tax_yearly, @insurance_yearly, @mortgage_rate, @term_years)
  `).run({
    type: en.type ?? null,
    name: en.name ?? null,
    appreciation_rate: en.appreciation_rate ?? null,
    services_json: en.services_json ?? null,
    tax_yearly: en.tax_yearly ?? null,
    insurance_yearly: en.insurance_yearly ?? null,
    mortgage_rate: en.mortgage_rate ?? null,
    term_years: en.term_years ?? null,
  });
  res.json(loadEntities());
});

// PUT /api/entities/:id — update entity by id, return all entities
app.put('/api/entities/:id', (req, res) => {
  const { id } = req.params;
  const en = req.body;
  db.prepare(`
    UPDATE entities SET
      type = @type, name = @name, appreciation_rate = @appreciation_rate,
      services_json = @services_json, tax_yearly = @tax_yearly, insurance_yearly = @insurance_yearly,
      mortgage_rate = @mortgage_rate, term_years = @term_years
    WHERE id = @id
  `).run({
    id: parseInt(id),
    type: en.type ?? null,
    name: en.name ?? null,
    appreciation_rate: en.appreciation_rate ?? null,
    services_json: en.services_json ?? null,
    tax_yearly: en.tax_yearly ?? null,
    insurance_yearly: en.insurance_yearly ?? null,
    mortgage_rate: en.mortgage_rate ?? null,
    term_years: en.term_years ?? null,
  });
  res.json(loadEntities());
});

// DELETE /api/entities/:id — delete entity by id, return all entities
app.delete('/api/entities/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM entities WHERE id = ?').run(parseInt(id));
  res.json(loadEntities());
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
