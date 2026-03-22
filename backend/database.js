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
  )
`);

module.exports = db;
