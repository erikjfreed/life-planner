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
`);

db.exec('DROP TABLE IF EXISTS events');
db.exec('DROP TABLE IF EXISTS entities');

db.exec(`
  CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    street_address TEXT,
    appreciation_rate REAL,
    services_json TEXT,
    tax_yearly REAL,
    insurance_yearly REAL,
    mortgage_rate REAL,
    term_years INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    year INTEGER,
    month INTEGER,
    age INTEGER,
    entity_id INTEGER REFERENCES entities(id),
    name TEXT,
    purchase_price REAL,
    down_payment REAL,
    principal_balance REAL,
    monthly_payment REAL,
    sale_price REAL,
    selling_costs_pct REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed entities and events if entities table is empty
const entityCount = db.prepare('SELECT COUNT(*) AS cnt FROM entities').get();
if (entityCount.cnt === 0) {
  const insertEntity = db.prepare(`
    INSERT INTO entities (type, name, street_address, appreciation_rate, services_json, tax_yearly, insurance_yearly, mortgage_rate, term_years)
    VALUES (@type, @name, @street_address, @appreciation_rate, @services_json, @tax_yearly, @insurance_yearly, @mortgage_rate, @term_years)
  `);
  const insertEvent = db.prepare(`
    INSERT INTO events (type, year, month, age, entity_id, name, purchase_price, down_payment, principal_balance, monthly_payment, sale_price, selling_costs_pct)
    VALUES (@type, @year, @month, @age, @entity_id, @name, @purchase_price, @down_payment, @principal_balance, @monthly_payment, @sale_price, @selling_costs_pct)
  `);

  db.transaction(() => {
    const orcasResult = insertEntity.run({
      type: 'real_estate',
      name: 'Orcas',
      street_address: '184 Maria Lane',
      appreciation_rate: 0.05,
      services_json: JSON.stringify([
        { label: 'Internet (Starlink)', monthly: 120, yearly: 1440 },
        { label: 'HOA (SHWSOA)',        monthly: 225, yearly: 2700 },
        { label: 'Electricity',         monthly: 200, yearly: 2400 },
        { label: 'Water',               monthly:  21, yearly:  250 },
        { label: 'Cleaning',            monthly:  83, yearly: 1000 },
        { label: 'Septic',              monthly:  21, yearly:  250 },
        { label: 'Pest Control',        monthly:  50, yearly:  600 },
        { label: 'Landscape',           monthly:  83, yearly: 1000 },
        { label: 'Propane',             monthly:  33, yearly:  400 },
      ]),
      tax_yearly: 12038,
      insurance_yearly: 1016,
      mortgage_rate: 0.03125,
      term_years: 30,
    });
    const orcasId = orcasResult.lastInsertRowid;

    const portlandResult = insertEntity.run({
      type: 'real_estate',
      name: 'Portland',
      street_address: '4848 NE 35th Ave',
      appreciation_rate: 0.05,
      services_json: JSON.stringify([
        { label: 'Internet (CenturyLink)', monthly:  65, yearly:  780 },
        { label: 'Garbage',                monthly:  87, yearly: 1044 },
        { label: 'Cleaning',               monthly: 500, yearly: 6000 },
        { label: 'Sewage',                 monthly:  30, yearly:  360 },
        { label: 'Electricity',            monthly: 200, yearly: 2400 },
        { label: 'Water',                  monthly:  38, yearly:  456 },
        { label: 'Gas',                    monthly:  38, yearly:  456 },
        { label: 'Gardening',              monthly: 383, yearly: 4590 },
      ]),
      tax_yearly: 14968,
      insurance_yearly: 1039,
      mortgage_rate: 0.0275,
      term_years: 30,
    });
    const portlandId = portlandResult.lastInsertRowid;

    insertEvent.run({ type: 're_buy',   year: 2026, month: null, age: null, entity_id: orcasId,    name: null, purchase_price: 2000000, down_payment: null, principal_balance: 449764, monthly_payment: 2186, sale_price: null, selling_costs_pct: null });
    insertEvent.run({ type: 're_buy',   year: 2026, month: null, age: null, entity_id: portlandId, name: null, purchase_price: 950000,  down_payment: null, principal_balance: 264655, monthly_payment: 1235, sale_price: null, selling_costs_pct: null });
    insertEvent.run({ type: 'death',    year: 2041, month: null, age: 85, entity_id: null, name: 'Erik', purchase_price: null, down_payment: null, principal_balance: null, monthly_payment: null,  sale_price: null, selling_costs_pct: null });
    insertEvent.run({ type: 'death',    year: 2048, month: null, age: 87, entity_id: null, name: 'Deb',  purchase_price: null, down_payment: null, principal_balance: null, monthly_payment: null,  sale_price: null, selling_costs_pct: null });
    insertEvent.run({ type: 'ss_start', year: 2026, month: 12, age: null, entity_id: null, name: 'Erik', purchase_price: null, down_payment: null, principal_balance: null, monthly_payment: 5215, sale_price: null, selling_costs_pct: null });
    insertEvent.run({ type: 'ss_start', year: 2031, month: 10, age: null, entity_id: null, name: 'Deb',  purchase_price: null, down_payment: null, principal_balance: null, monthly_payment: 5392, sale_price: null, selling_costs_pct: null });

    const cx5Result = insertEntity.run({ type: 'vehicle', name: '2019 Mazda CX-5 Signature', street_address: null, appreciation_rate: -0.15, services_json: null, tax_yearly: null, insurance_yearly: null, mortgage_rate: null, term_years: null });
    const ridgeResult = insertEntity.run({ type: 'vehicle', name: '2021 Honda Ridgeline RTL-E', street_address: null, appreciation_rate: -0.15, services_json: null, tax_yearly: null, insurance_yearly: null, mortgage_rate: null, term_years: null });
    insertEvent.run({ type: 'car_buy', year: 2019, month: null, age: null, entity_id: cx5Result.lastInsertRowid,   name: null, purchase_price: null, down_payment: null, principal_balance: null, monthly_payment: null, sale_price: null, selling_costs_pct: null });
    insertEvent.run({ type: 'car_buy', year: 2021, month: null, age: null, entity_id: ridgeResult.lastInsertRowid, name: null, purchase_price: null, down_payment: null, principal_balance: null, monthly_payment: null, sale_price: null, selling_costs_pct: null });
  })();
}

module.exports = db;
