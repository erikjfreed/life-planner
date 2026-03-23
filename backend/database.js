const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'life-planner.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS parameters (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS timeline (
    year INTEGER PRIMARY KEY,
    yrs INTEGER,
    erik_age INTEGER,
    deb_age INTEGER,
    loans REAL,
    health REAL,
    dogs REAL,
    cars REAL,
    travel REAL,
    living REAL,
    allowance REAL,
    orcas REAL,
    portland REAL,
    ltc REAL,
    total_expenses REAL,
    ss_erik REAL,
    ss_debbie REAL,
    ss_subtotal REAL,
    ss_tax REAL,
    ss_net REAL,
    gross_draw REAL,
    draw_tax REAL,
    net_draw REAL,
    draw_rate REAL,
    capital_spend REAL,
    investment_balance REAL,
    roi REAL,
    invest_plus_re REAL,
    real_estate REAL,
    ltc_monthly REAL,
    ltc_entrance REAL,
    orcas_value REAL,
    orcas_principal REAL,
    orcas_equity REAL,
    portland_value REAL,
    portland_principal REAL,
    portland_equity REAL
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    year INTEGER NOT NULL,
    name TEXT,
    purchase_price REAL,
    down_payment REAL,
    principal_balance REAL,
    mortgage_rate REAL,
    term_years INTEGER,
    monthly_payment REAL,
    appreciation_rate REAL,
    expense_base REAL,
    tax_yearly REAL,
    insurance_yearly REAL,
    sale_price REAL,
    selling_costs_pct REAL,
    useful_life_years INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Seed initial events if the events table is empty
const eventCount = db.prepare('SELECT COUNT(*) AS cnt FROM events').get();
if (eventCount.cnt === 0) {
  const insertEvent = db.prepare(`
    INSERT INTO events (type, year, name, purchase_price, principal_balance, mortgage_rate, term_years, monthly_payment, appreciation_rate, expense_base, tax_yearly, insurance_yearly)
    VALUES (@type, @year, @name, @purchase_price, @principal_balance, @mortgage_rate, @term_years, @monthly_payment, @appreciation_rate, @expense_base, @tax_yearly, @insurance_yearly)
  `);
  const insertDeath = db.prepare('INSERT INTO events (type, year, name) VALUES (@type, @year, @name)');
  const seedAll = db.transaction(() => {
    insertEvent.run({
      type: 're_buy', year: 2026, name: 'Orcas',
      purchase_price: 2000000, principal_balance: 449764, mortgage_rate: 0.03125,
      term_years: 30, monthly_payment: 2186, appreciation_rate: 0.05, expense_base: 23094,
      tax_yearly: null, insurance_yearly: null,
    });
    insertEvent.run({
      type: 're_buy', year: 2026, name: 'Portland',
      purchase_price: 950000, principal_balance: 264655, mortgage_rate: 0.0275,
      term_years: 30, monthly_payment: 1235, appreciation_rate: 0.05, expense_base: 32093,
      tax_yearly: null, insurance_yearly: null,
    });
    insertDeath.run({ type: 'death', year: 2055, name: 'Erik' });
    insertDeath.run({ type: 'death', year: 2055, name: 'Deb' });
  });
  seedAll();
}

module.exports = db;
