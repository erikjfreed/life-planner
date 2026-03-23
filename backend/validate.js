const { computeTimeline } = require('./compute');

const params = {
  erikDOB: '1956-12-27',
  debDOB: '1961-10-18',

  generalInflation: 0.025,
  healthcareInflation: 0.06,
  allowanceDeflation: 0.01,
  realEstateAppreciation: 0.05,
  investmentROI: 0.075,
  ssCoLA: 0.025,

  drawFedTaxRate: 0.16,
  drawStateTaxRate: 0.00,
  ssFedTaxRate: 0.16,
  ssStateTaxRate: 0.00,

  ssErikMonthly: 5215,
  ssErikStartYear: 2027,
  ssDebbieMonthly: 5392,
  ssDebbieStartYear: 2032,

  allowancePerPersonPerMonth: 3000,

  healthBase: 21276,
  dogsBase: 16389,
  carsBase: 18000,
  travelBase: 36000,
  livingBase: 33619,

  investmentBalanceBase: 3823105,
};

const events = [
  {
    type: 're_buy', year: 2026, name: 'Orcas',
    purchase_price: 2000000, principal_balance: 449764, mortgage_rate: 0.03125,
    term_years: 30, monthly_payment: 2186, appreciation_rate: 0.05, expense_base: 23094,
    tax_yearly: null, insurance_yearly: null,
  },
  {
    type: 're_buy', year: 2026, name: 'Portland',
    purchase_price: 950000, principal_balance: 264655, mortgage_rate: 0.0275,
    term_years: 30, monthly_payment: 1235, appreciation_rate: 0.05, expense_base: 32093,
    tax_yearly: null, insurance_yearly: null,
  },
  { type: 'death', year: 2055, name: 'Erik' },
  { type: 'death', year: 2055, name: 'Deb' },
];

const rows = computeTimeline(params, events);

// real_estate 2026 = (2,000,000 - 449,764) + (950,000 - 264,655) = 1,550,236 + 685,345 = 2,235,581
// invest_plus_re 2026 = 3,823,105 + 2,235,581 = 6,058,686
// loans 2026 = (2186 * 12) + (1235 * 12) = 26,232 + 14,820 = 41,052
// total_expenses 2026 = 41,052 + 21,276 + 16,389 + 18,000 + 36,000 + 33,619 + 72,000 + 23,094 + 32,093 = 293,523
const expected = {
  2026: { total_expenses: 293523, ss_net: 0,     net_draw: 340487, investment_balance: 3823105, real_estate: 2235581, invest_plus_re: 6058686 },
  2027: { total_expenses: 299860, ss_net: 54065, net_draw: 285122, investment_balance: 3769351 },
  2028: { total_expenses: 306389, ss_net: 55417, net_draw: 291127, investment_balance: 3766930 },
  2032: { total_expenses: 334578, ss_net: 117072, net_draw: 252307, investment_balance: 3688524 },
};

let allPass = true;
for (const [year, exp] of Object.entries(expected)) {
  const row = rows.find(r => r.year === parseInt(year));
  console.log(`\n--- ${year} ---`);
  for (const [key, expVal] of Object.entries(exp)) {
    const actual = Math.round(row[key]);
    const diff = actual - expVal;
    const pass = Math.abs(diff) < 200;
    if (!pass) allPass = false;
    console.log(`  ${key}: expected=${expVal.toLocaleString()} actual=${actual.toLocaleString()} diff=${diff} ${pass ? '✓' : '✗'}`);
  }
}

console.log(`\n${allPass ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
