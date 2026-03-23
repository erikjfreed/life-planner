const DEFAULT_PARAMS = {
  erikDOB: '1956-12-27',
  debDOB: '1961-10-18',
  erikDeathYear: 2055,
  debDeathYear: 2055,

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
  healthScenarioPct: 0.45,
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

module.exports = DEFAULT_PARAMS;
