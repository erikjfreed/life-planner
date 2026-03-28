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
    pets REAL,
    vehicles REAL,
    travel REAL,
    living REAL,
    allowance REAL,
    orcas REAL,
    portland REAL,
    ltc REAL,
    total_expenses REAL,
    social_security_erik REAL,
    social_security_debbie REAL,
    social_security_subtotal REAL,
    social_security_tax REAL,
    social_security_net REAL,
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

db.exec('DROP TABLE IF EXISTS loans');
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
    tax_rate REAL,
    mortgage_rate REAL,
    term_years INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    date TEXT,
    age INTEGER,
    entity_id INTEGER REFERENCES entities(id),
    name TEXT,
    purchase_price REAL,
    down_payment REAL,
    principal_balance REAL,
    monthly_payment REAL,
    sale_price REAL,
    selling_costs_pct REAL,
    hidden INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER REFERENCES entities(id),
    name TEXT,
    rate REAL NOT NULL,
    term_years INTEGER,
    original_balance REAL,
    current_balance REAL,
    monthly_payment REAL,
    start_year INTEGER,
    start_month INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed entities and events if entities table is empty
const entityCount = db.prepare('SELECT COUNT(*) AS cnt FROM entities').get();
if (entityCount.cnt === 0) {
  const insertEntity = db.prepare(`
    INSERT INTO entities (type, name, street_address, appreciation_rate, services_json, tax_yearly, insurance_yearly, tax_rate, mortgage_rate, term_years)
    VALUES (@type, @name, @street_address, @appreciation_rate, @services_json, @tax_yearly, @insurance_yearly, @tax_rate, @mortgage_rate, @term_years)
  `);
  const insertEvent = db.prepare(`
    INSERT INTO events (type, date, age, entity_id, name, purchase_price, down_payment, principal_balance, monthly_payment, sale_price, selling_costs_pct, hidden)
    VALUES (@type, @date, @age, @entity_id, @name, @purchase_price, @down_payment, @principal_balance, @monthly_payment, @sale_price, @selling_costs_pct, @hidden)
  `);

  db.transaction(() => {
    const orcasResult = insertEntity.run({
      type: 'real_estate',
      name: 'Orcas',
      street_address: '184 Maria Lane, Eastsound, WA 98245',
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
      tax_rate: 0.006,
      mortgage_rate: 0.03125,
      term_years: 30,
    });
    const orcasId = orcasResult.lastInsertRowid;

    const portlandResult = insertEntity.run({
      type: 'real_estate',
      name: 'Portland',
      street_address: '4818 NE 35th Ave, Portland, OR 97211',
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
      tax_rate: 0.015,
      mortgage_rate: 0.0275,
      term_years: 30,
    });
    const portlandId = portlandResult.lastInsertRowid;

    insertEvent.run({ type: 'real_estate_buy',   date: '2026-01-01', age: null, entity_id: orcasId,    name: null, purchase_price: 2000000, down_payment: null, principal_balance: 449764, monthly_payment: 2186, sale_price: null, selling_costs_pct: null, hidden: 1 });
    insertEvent.run({ type: 'real_estate_buy',   date: '2026-01-01', age: null, entity_id: portlandId, name: null, purchase_price: 600000,  down_payment: null, principal_balance: 264655, monthly_payment: 1235, sale_price: null, selling_costs_pct: null, hidden: 1 });
    const erikSpouseResult = insertEntity.run({ type: 'spouse', name: 'Erik James Freed',    street_address: null, appreciation_rate: null, services_json: null, tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: null });
    const debSpouseResult  = insertEntity.run({ type: 'spouse', name: 'Deborah Sue Emery',  street_address: null, appreciation_rate: null, services_json: null, tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: null });

    insertEvent.run({ type: 'spouse_death',    date: '2041-12-27', age: 85, entity_id: erikSpouseResult.lastInsertRowid, name: 'Erik', purchase_price: null, down_payment: null, principal_balance: null, monthly_payment: null,  sale_price: null, selling_costs_pct: null, hidden: 0 });
    insertEvent.run({ type: 'spouse_death',    date: '2048-10-18', age: 87, entity_id: debSpouseResult.lastInsertRowid,  name: 'Deb',  purchase_price: null, down_payment: null, principal_balance: null, monthly_payment: null,  sale_price: null, selling_costs_pct: null, hidden: 0 });
    const ssErikResult = insertEntity.run({ type: 'social_security', name: 'Erik', street_address: null, appreciation_rate: null, services_json: null, tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: null });
    const ssDebResult  = insertEntity.run({ type: 'social_security', name: 'Deb',  street_address: null, appreciation_rate: null, services_json: null, tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: null });

    insertEvent.run({ type: 'social_security_start', date: '2026-12-27', age: null, entity_id: ssErikResult.lastInsertRowid, name: 'Erik', purchase_price: null, down_payment: null, principal_balance: null, monthly_payment: 5215, sale_price: null, selling_costs_pct: null, hidden: 0 });
    insertEvent.run({ type: 'social_security_start', date: '2031-10-18', age: null, entity_id: ssDebResult.lastInsertRowid,  name: 'Deb',  purchase_price: null, down_payment: null, principal_balance: null, monthly_payment: 5392, sale_price: null, selling_costs_pct: null, hidden: 0 });
    insertEvent.run({ type: 'real_estate_sell',  date: '2027-06-01', age: null, entity_id: orcasId,    name: null, purchase_price: null, down_payment: null, principal_balance: null, monthly_payment: null, sale_price: 2100000, selling_costs_pct: null, hidden: 0 });
    insertEvent.run({ type: 'real_estate_sell',  date: '2027-06-01', age: null, entity_id: portlandId, name: null, purchase_price: null, down_payment: null, principal_balance: null, monthly_payment: null, sale_price: 950000,  selling_costs_pct: null, hidden: 0 });

    const portlandServices = JSON.parse(portlandResult ? db.prepare('SELECT services_json FROM entities WHERE id = ?').get(portlandId).services_json : '[]');
    const dreamResult = insertEntity.run({ type: 'real_estate', name: 'San Rafael', street_address: '1820 Point San Pedro Rd, San Rafael, CA 94901', appreciation_rate: 0.05, services_json: JSON.stringify(portlandServices), tax_yearly: 31200, insurance_yearly: 1039, tax_rate: 0.013, mortgage_rate: null, term_years: null });
    const dreamId = dreamResult.lastInsertRowid;
    insertEvent.run({ type: 'real_estate_buy',   date: '2027-08-01',  age: null, entity_id: dreamId,    name: null, purchase_price: 2400000, down_payment: null, principal_balance: null, monthly_payment: null, sale_price: null, selling_costs_pct: null, hidden: 0 });

    const vehicleServices = JSON.stringify([
      { label: 'Insurance', monthly: 100, yearly: 1200 },
      { label: 'License / Registration / Smog', monthly: 25, yearly: 300 },
      { label: 'Maintenance / Repair', monthly: 125, yearly: 1500 },
    ]);
    const cx5Result = insertEntity.run({ type: 'vehicle', name: '2019 Mazda CX-5 Signature', street_address: 'Deb', appreciation_rate: -0.075, services_json: vehicleServices, tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: null });
    const ridgeResult = insertEntity.run({ type: 'vehicle', name: '2021 Honda Ridgeline RTL-E', street_address: 'Erik', appreciation_rate: -0.075, services_json: vehicleServices, tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: null });
    const erikNextResult = insertEntity.run({ type: 'vehicle', name: "Erik's Tradeup", street_address: 'Erik', appreciation_rate: -0.075, services_json: vehicleServices, tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: null });
    const debNextResult = insertEntity.run({ type: 'vehicle', name: "Deb's Tradeup", street_address: 'Deb', appreciation_rate: -0.075, services_json: vehicleServices, tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: null });
    insertEvent.run({ type: 'vehicle_buy', date: '2019-01-01', age: null, entity_id: cx5Result.lastInsertRowid,   name: null, purchase_price: 38000, down_payment: null, principal_balance: null, monthly_payment: null, sale_price: null, selling_costs_pct: null, hidden: 1 });
    insertEvent.run({ type: 'vehicle_buy', date: '2021-01-01', age: null, entity_id: ridgeResult.lastInsertRowid, name: null, purchase_price: 48000, down_payment: null, principal_balance: null, monthly_payment: null, sale_price: null, selling_costs_pct: null, hidden: 1 });

    // -- PETS --
    const petServicesShared = JSON.stringify([
      { label: 'Food',      monthly: 250, yearly: 3000 },
      { label: 'Insurance', monthly:  47, yearly:  564 },
      { label: 'Misc Health', monthly: 50, yearly:  600 },
      { label: 'Misc',      monthly:  50, yearly:  600 },
      { label: 'Boarding',  monthly: 131, yearly: 1575 },
      { label: 'Grooming',  monthly: 113, yearly: 1356 },
    ]);
    const petServicesTatia = JSON.stringify([
      { label: 'Food',      monthly: 250, yearly: 3000 },
      { label: 'Insurance', monthly:  47, yearly:  564 },
      { label: 'Misc Health', monthly: 50, yearly:  600 },
      { label: 'Misc',      monthly:  50, yearly:  600 },
      { label: 'Boarding',  monthly: 131, yearly: 1575 },
      { label: 'Grooming',  monthly: 113, yearly: 1356 },
      { label: 'Teeth Cleaning', monthly: 83, yearly: 1000 },
    ]);
    insertEntity.run({ type: 'pet', name: 'Winnie', street_address: '2021-02-02', appreciation_rate: 2021, services_json: petServicesShared, tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: 12.5 });
    insertEntity.run({ type: 'pet', name: 'Tatia',  street_address: '2022-02-02', appreciation_rate: 2022, services_json: petServicesTatia, tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: 12.5 });

    const insertLoan = db.prepare(`
      INSERT INTO loans (entity_id, name, rate, term_years, original_balance, current_balance, monthly_payment, start_year, start_month)
      VALUES (@entity_id, @name, @rate, @term_years, @original_balance, @current_balance, @monthly_payment, @start_year, @start_month)
    `);
    insertLoan.run({ entity_id: orcasId, name: 'Mortgage', rate: 0.03125, term_years: 30, original_balance: 449764, current_balance: 449764, monthly_payment: 2186, start_year: 2009, start_month: null });
    insertLoan.run({ entity_id: portlandId, name: 'Mortgage', rate: 0.0275, term_years: 30, original_balance: 264655, current_balance: 264655, monthly_payment: 1235, start_year: 2015, start_month: null });
  })();
}

module.exports = db;
