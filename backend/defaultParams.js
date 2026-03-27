const DEFAULT_PARAMS = {
  erikDOB: '1956-12-27',
  debDOB: '1961-10-18',

  generalInflation: 0.025,
  healthcareInflation: 0.06,
  allowanceDeflation: 0.01,
  realEstateAppreciation: 0.05,
  investmentROI: 0.06,
  socialSecurityCoLA: 0.025,

  drawFedTaxRate: 0.16,
  drawStateTaxRate: 0.00,
  socialSecurityFedTaxRate: 0.16,
  socialSecurityStateTaxRate: 0.00,

  allowancePerPersonPerMonth: 3000,

  healthBase: 21276,
  healthScenarioPct: 0.45,
  dogsBase: 16389,
  vehiclesBase: 18000,
  travelBase: 36000,
  livingBase: 33619,

  investmentBalanceBase: 3823105,

  travelDaysWithPets: 21,
  travelDaysWithoutPets: 14,
  boardingCostPerPetPerDay: 75,

  filingStatus: 'married_filing_jointly',
  stateOfResidence: 'WA',
};

module.exports = DEFAULT_PARAMS;
