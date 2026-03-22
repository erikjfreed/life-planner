const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const db = require('./database');

const CSV_PATH = path.join(__dirname, '..', 'timeline.csv');

function parseMoney(val) {
  if (!val || val.trim() === '' || val.trim() === '$0' || val.trim() === '$-') return 0;
  return parseFloat(val.replace(/[$,\s"]/g, '')) || 0;
}

function parseRate(val) {
  if (!val || val.trim() === '' || val.trim() === '0%') return 0;
  return parseFloat(val.replace(/[%\s"]/g, '')) / 100 || 0;
}

const content = fs.readFileSync(CSV_PATH, 'utf8');
const records = parse(content, {
  skip_empty_lines: true,
  from_line: 3, // skip the two header rows
});

const insert = db.prepare(`
  INSERT OR REPLACE INTO timeline VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?
  )
`);

const insertMany = db.transaction((rows) => {
  for (const r of rows) {
    insert.run(
      parseInt(r[0]),   // year
      parseInt(r[1]),   // yrs
      parseInt(r[2]),   // erik_age
      parseInt(r[3]),   // deb_age
      parseMoney(r[4]), // loans
      parseMoney(r[5]), // health
      parseMoney(r[6]), // dogs
      parseMoney(r[7]), // cars
      parseMoney(r[8]), // travel
      parseMoney(r[9]), // living
      parseMoney(r[10]),// allowance
      parseMoney(r[11]),// orcas
      parseMoney(r[12]),// portland
      parseMoney(r[13]),// ltc
      parseMoney(r[14]),// total_expenses
      parseMoney(r[15]),// ss_erik
      parseMoney(r[16]),// ss_debbie
      parseMoney(r[17]),// ss_subtotal
      parseMoney(r[18]),// ss_tax
      parseMoney(r[19]),// ss_net
      parseMoney(r[20]),// gross_draw
      parseMoney(r[21]),// draw_tax
      parseMoney(r[22]),// net_draw
      parseRate(r[23]), // draw_rate
      parseMoney(r[24]),// capital_spend
      parseMoney(r[25]),// investment_balance
      parseMoney(r[26]),// roi
      parseMoney(r[27]),// invest_plus_re
      parseMoney(r[28]),// real_estate
      parseMoney(r[29]),// ltc_monthly
      parseMoney(r[30]),// ltc_entrance
      parseMoney(r[31]),// orcas_value
      parseMoney(r[32]),// orcas_principal
      parseMoney(r[33]),// orcas_equity
      parseMoney(r[34]),// portland_value
      parseMoney(r[35]),// portland_principal
      parseMoney(r[36]) // portland_equity
    );
  }
});

insertMany(records);
console.log(`Seeded ${records.length} timeline rows.`);
