const { computeTimeline } = require('./compute');

const params = {
  erikDOB: '1956-12-27',
  debDOB: '1961-10-18',
  endOfGameYear: 2055,

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
  loansBase: 41052,
  orcasExpenseBase: 23094,
  portlandExpenseBase: 32093,

  orcasValueBase: 2000000,
  orcasPrincipalBase: 714419,
  orcasMortgageRate: 0.03125,
  orcasMonthlyPayment: 2186,

  portlandValueBase: 950000,
  portlandPrincipalBase: 449764,
  portlandMortgageRate: 0.0275,
  portlandMonthlyPayment: 1235,

  investmentBalanceBase: 3823105,
};

const rows = computeTimeline(params);

const expected = {
  2026: { total_expenses: 293523, ss_net: 0,     net_draw: 340487, investment_balance: 3823105, invest_plus_re: 5608922 },
  2027: { total_expenses: 299860, ss_net: 54065, net_draw: 285122, investment_balance: 3769351, invest_plus_re: 5709113 },
  2028: { total_expenses: 306389, ss_net: 55417, net_draw: 291127, investment_balance: 3766930, invest_plus_re: 5868207 },
  2032: { total_expenses: 334578, ss_net: 117072, net_draw: 252307, investment_balance: 3688524, invest_plus_re: 6519337 },
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
