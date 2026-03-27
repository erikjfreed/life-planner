require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const { computeTimeline } = require('./compute');
const { buildTaxData } = require('./taxHelpers');
const { computeTaxes } = require('./taxBrackets');
const DEFAULT_PARAMS = require('./defaultParams');

const app = express();

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
  const loans = loadLoans();
  const rows = computeTimeline(params, events, entities, loans);
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
    INSERT INTO events (type, year, month, age, entity_id, name, purchase_price, down_payment, principal_balance,
      monthly_payment, sale_price, selling_costs_pct, hidden)
    VALUES (@type, @year, @month, @age, @entity_id, @name, @purchase_price, @down_payment, @principal_balance,
      @monthly_payment, @sale_price, @selling_costs_pct, @hidden)
  `).run({
    type: e.type ?? null,
    year: e.year ?? null,
    month: e.month ?? null,
    age: e.age ?? null,
    entity_id: e.entity_id ?? null,
    name: e.name ?? null,
    purchase_price: e.purchase_price ?? null,
    down_payment: e.down_payment ?? null,
    principal_balance: e.principal_balance ?? null,
    monthly_payment: e.monthly_payment ?? null,
    sale_price: e.sale_price ?? null,
    selling_costs_pct: e.selling_costs_pct ?? null,
    hidden: e.hidden ?? 0,
  });
  res.json(loadEvents());
});

// PUT /api/events/:id — update event by id, return all events
app.put('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const e = req.body;
  db.prepare(`
    UPDATE events SET
      type = @type, year = @year, month = @month, age = @age, entity_id = @entity_id, name = @name,
      purchase_price = @purchase_price, down_payment = @down_payment,
      principal_balance = @principal_balance, monthly_payment = @monthly_payment,
      sale_price = @sale_price, selling_costs_pct = @selling_costs_pct, hidden = @hidden
    WHERE id = @id
  `).run({
    id: parseInt(id),
    type: e.type ?? null,
    year: e.year ?? null,
    month: e.month ?? null,
    age: e.age ?? null,
    entity_id: e.entity_id ?? null,
    name: e.name ?? null,
    purchase_price: e.purchase_price ?? null,
    down_payment: e.down_payment ?? null,
    principal_balance: e.principal_balance ?? null,
    monthly_payment: e.monthly_payment ?? null,
    sale_price: e.sale_price ?? null,
    selling_costs_pct: e.selling_costs_pct ?? null,
    hidden: e.hidden ?? 0,
  });
  res.json(loadEvents());
});

// DELETE /api/events/:id — delete event by id, return all events
app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM events WHERE id = ?').run(parseInt(id));
  res.json(loadEvents());
});

// POST /api/vehicle-tradeup — create sell event for old vehicle + buy event for next vehicle
app.post('/api/vehicle-tradeup', (req, res) => {
  const { sell_entity_id, buy_entity_id, year, purchase_price } = req.body;
  const sellEntity = db.prepare('SELECT * FROM entities WHERE id = ?').get(sell_entity_id);
  const buyEvent = db.prepare('SELECT * FROM events WHERE type = ? AND entity_id = ?').get('vehicle_buy', sell_entity_id);

  // Compute depreciated sale price
  const depRate = sellEntity?.appreciation_rate ?? -0.075;
  const buyYear = buyEvent?.year ?? year;
  const salePrice = Math.round((buyEvent?.purchase_price ?? 0) * Math.pow(1 + depRate, year - buyYear) / 1000) * 1000;

  // Remove any existing sell/buy events for these entities
  db.prepare('DELETE FROM events WHERE type = ? AND entity_id = ?').run('vehicle_sell', sell_entity_id);
  db.prepare('DELETE FROM events WHERE type = ? AND entity_id = ?').run('vehicle_buy', buy_entity_id);

  // Create sell event
  db.prepare(`INSERT INTO events (type, year, month, entity_id, sale_price, hidden) VALUES (?, ?, 1, ?, ?, 0)`)
    .run('vehicle_sell', year, sell_entity_id, salePrice);

  // Create buy event for next vehicle
  db.prepare(`INSERT INTO events (type, year, month, entity_id, purchase_price, hidden) VALUES (?, ?, 1, ?, ?, 0)`)
    .run('vehicle_buy', year, buy_entity_id, purchase_price || 50000);

  res.json(loadEvents());
});

// DELETE /api/vehicle-tradeup — remove sell event for old vehicle + buy event for next vehicle
app.delete('/api/vehicle-tradeup', (req, res) => {
  const { sell_entity_id, buy_entity_id } = req.body;
  db.prepare('DELETE FROM events WHERE type = ? AND entity_id = ?').run('vehicle_sell', sell_entity_id);
  db.prepare('DELETE FROM events WHERE type = ? AND entity_id = ?').run('vehicle_buy', buy_entity_id);
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
    INSERT INTO entities (type, name, street_address, appreciation_rate, services_json, tax_yearly, insurance_yearly, tax_rate, mortgage_rate, term_years)
    VALUES (@type, @name, @street_address, @appreciation_rate, @services_json, @tax_yearly, @insurance_yearly, @tax_rate, @mortgage_rate, @term_years)
  `).run({
    type: en.type ?? null,
    name: en.name ?? null,
    street_address: en.street_address ?? null,
    appreciation_rate: en.appreciation_rate ?? null,
    services_json: en.services_json ?? null,
    tax_yearly: en.tax_yearly ?? null,
    insurance_yearly: en.insurance_yearly ?? null,
    tax_rate: en.tax_rate ?? null,
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
      type = @type, name = @name, street_address = @street_address,
      appreciation_rate = @appreciation_rate, services_json = @services_json,
      tax_yearly = @tax_yearly, insurance_yearly = @insurance_yearly, tax_rate = @tax_rate,
      mortgage_rate = @mortgage_rate, term_years = @term_years
    WHERE id = @id
  `).run({
    id: parseInt(id),
    type: en.type ?? null,
    name: en.name ?? null,
    street_address: en.street_address ?? null,
    appreciation_rate: en.appreciation_rate ?? null,
    services_json: en.services_json ?? null,
    tax_yearly: en.tax_yearly ?? null,
    insurance_yearly: en.insurance_yearly ?? null,
    tax_rate: en.tax_rate ?? null,
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

// --- LOANS ---
function loadLoans() {
  return db.prepare('SELECT * FROM loans ORDER BY start_year').all();
}

app.get('/api/loans', (req, res) => res.json(loadLoans()));

app.post('/api/loans', (req, res) => {
  const l = req.body;
  db.prepare(`
    INSERT INTO loans (entity_id, name, rate, term_years, original_balance, current_balance, monthly_payment, start_year, start_month)
    VALUES (@entity_id, @name, @rate, @term_years, @original_balance, @current_balance, @monthly_payment, @start_year, @start_month)
  `).run({
    entity_id: l.entity_id ?? null, name: l.name ?? null, rate: l.rate ?? 0,
    term_years: l.term_years ?? null, original_balance: l.original_balance ?? null,
    current_balance: l.current_balance ?? null, monthly_payment: l.monthly_payment ?? null,
    start_year: l.start_year ?? null, start_month: l.start_month ?? null,
  });
  res.json(loadLoans());
});

app.put('/api/loans/:id', (req, res) => {
  const { id } = req.params;
  const l = req.body;
  db.prepare(`
    UPDATE loans SET entity_id = @entity_id, name = @name, rate = @rate, term_years = @term_years,
      original_balance = @original_balance, current_balance = @current_balance,
      monthly_payment = @monthly_payment, start_year = @start_year, start_month = @start_month
    WHERE id = @id
  `).run({
    id: parseInt(id), entity_id: l.entity_id ?? null, name: l.name ?? null, rate: l.rate ?? 0,
    term_years: l.term_years ?? null, original_balance: l.original_balance ?? null,
    current_balance: l.current_balance ?? null, monthly_payment: l.monthly_payment ?? null,
    start_year: l.start_year ?? null, start_month: l.start_month ?? null,
  });
  res.json(loadLoans());
});

app.delete('/api/loans/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM loans WHERE id = ?').run(parseInt(id));
  res.json(loadLoans());
});

// --- TAX ---
app.get('/api/tax-data', (req, res) => {
  const params = loadParams();
  const events = loadEvents();
  const entities = loadEntities();
  const loans = loadLoans();
  const timelineRows = computeTimeline(params, events, entities, loans);
  res.json(buildTaxData(timelineRows, entities, events, loans, params));
});

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getRowEvent(year, events, entities, params) {
  const labels = [];
  let type = null;
  const erikDeath = events.find(e => e.type === 'spouse_death' && e.name === 'Erik');
  const debDeath = events.find(e => e.type === 'spouse_death' && e.name === 'Deb');
  const erikBirthYear = params.erikDOB ? new Date(params.erikDOB).getFullYear() : null;
  const debBirthYear = params.debDOB ? new Date(params.debDOB).getFullYear() : null;

  if (erikDeath) {
    const dy = erikDeath.age != null && erikBirthYear ? erikBirthYear + erikDeath.age : erikDeath.year;
    if (dy === year) { labels.push(`RIP Erik ${erikBirthYear ? dy - erikBirthYear : ''}`); type = 'spouse_death'; }
  }
  if (debDeath) {
    const dy = debDeath.age != null && debBirthYear ? debBirthYear + debDeath.age : debDeath.year;
    if (dy === year) { labels.push(`RIP Deb ${debBirthYear ? dy - debBirthYear : ''}`); type = 'spouse_death'; }
  }
  const eogYear = erikDeath && debDeath ? Math.max(
    erikDeath.age != null && erikBirthYear ? erikBirthYear + erikDeath.age : erikDeath.year,
    debDeath.age != null && debBirthYear ? debBirthYear + debDeath.age : debDeath.year
  ) + 2 : null;
  if (eogYear && year === eogYear) { labels.push('EndGame'); type = type || 'eog'; }

  events.filter(e => e.type === 'social_security_start' && e.year === year).forEach(e => {
    labels.push(`SS ${e.name}${e.month ? ' ' + MONTHS[e.month - 1] : ''}`);
    type = type || 'ss';
  });
  entities.filter(e => e.type === 'pet' && e.appreciation_rate && e.term_years).forEach(e => {
    if (Math.round(e.appreciation_rate + e.term_years) === year) {
      labels.push(`RIP ${e.name} ${e.term_years}`);
      type = type || 'pet_death';
    }
  });
  events.filter(e => e.type === 'real_estate_buy' && e.year === year && !e.hidden).forEach(e => {
    const en = entities.find(x => x.id === e.entity_id);
    labels.push(`Buy ${en?.street_address ? en.street_address.split(',')[0] : (en?.name || '?')}`);
    type = type || 'real_estate_buy';
  });
  events.filter(e => e.type === 'real_estate_sell' && e.year === year && !e.hidden).forEach(e => {
    const en = entities.find(x => x.id === e.entity_id);
    labels.push(`Sell ${en?.street_address ? en.street_address.split(',')[0] : (en?.name || '?')}`);
    type = type || 'real_estate_sell';
  });
  events.filter(e => e.type === 'vehicle_buy' && e.year === year && !e.hidden).forEach(e => {
    const en = entities.find(x => x.id === e.entity_id);
    labels.push(`Buy ${en?.name || '?'}`);
    type = type || 'vehicle_buy';
  });
  events.filter(e => e.type === 'vehicle_sell' && e.year === year).forEach(e => {
    const en = entities.find(x => x.id === e.entity_id);
    labels.push(`Sell ${en?.name || '?'}`);
    type = type || 'vehicle_sell';
  });
  if (labels.length === 0) return null;
  return { label: labels.join(', '), type };
}

app.get('/api/tax-computed', (req, res) => {
  const params = loadParams();
  const events = loadEvents();
  const entities = loadEntities();
  const loans = loadLoans();
  const timelineRows = computeTimeline(params, events, entities, loans);
  const taxRows = buildTaxData(timelineRows, entities, events, loans, params);

  const MAX_ITERATIONS = 10;
  const TOLERANCE = 1;

  const results = taxRows.map(d => {
    let grossDraw = d.gross_draw;
    const totalExpenses = d.total_expenses || grossDraw;
    const ssIncome = d.ss_income;
    let result = null;
    let iterations = 0;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      iterations = i + 1;
      result = computeTaxes({ ...d, gross_draw: grossDraw });
      const drawTaxRate = result.draw_fed_rate + result.draw_state_rate;
      const ssTax = ssIncome * (result.ss_fed_rate + result.ss_state_rate);
      const ssNet = ssIncome - ssTax;
      const expensesAfterSS = Math.max(0, totalExpenses - ssNet);
      const newGrossDraw = drawTaxRate < 1 ? expensesAfterSS / (1 - drawTaxRate) : expensesAfterSS;
      const change = Math.abs(newGrossDraw - grossDraw);
      grossDraw = newGrossDraw;
      if (change < TOLERANCE) break;
    }

    result = computeTaxes({ ...d, gross_draw: grossDraw });
    const event = getRowEvent(d.year, events, entities, params);
    return { ...d, estimate: { ...result, gross_draw_solved: Math.round(grossDraw), iterations }, event };
  });

  res.json(results);
});

app.post('/api/tax-estimate', (req, res) => {
  const d = req.body;
  const MAX_ITERATIONS = 10;
  const TOLERANCE = 1; // converge when draw changes by less than $1

  try {
    let grossDraw = d.gross_draw;
    const totalExpenses = d.total_expenses || grossDraw;
    const ssIncome = d.ss_income;
    let result = null;
    let iterations = 0;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      iterations = i + 1;
      result = computeTaxes({ ...d, gross_draw: grossDraw });

      const drawTaxRate = result.draw_fed_rate + result.draw_state_rate;
      const ssTax = ssIncome * (result.ss_fed_rate + result.ss_state_rate);
      const ssNet = ssIncome - ssTax;

      const expensesAfterSS = Math.max(0, totalExpenses - ssNet);
      const newGrossDraw = drawTaxRate < 1 ? expensesAfterSS / (1 - drawTaxRate) : expensesAfterSS;

      const change = Math.abs(newGrossDraw - grossDraw);
      grossDraw = newGrossDraw;

      if (change < TOLERANCE) break;
    }

    // Final computation with solved draw
    result = computeTaxes({ ...d, gross_draw: grossDraw });

    res.json({
      ...result,
      gross_draw_solved: Math.round(grossDraw),
      iterations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve React build in production
const buildPath = path.join(__dirname, '..', 'frontend', 'build');
app.use(express.static(buildPath));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
