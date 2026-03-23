/**
 * Financial timeline computation engine.
 * Pure forward projection from parameters — no events.
 * Events will be added in a future phase.
 */

function computeTimeline(params) {
  const {
    erikDOB,
    debDOB,
    erikDeathYear,
    debDeathYear,

    generalInflation,
    healthcareInflation,
    allowanceDeflation,
    realEstateAppreciation,
    investmentROI,
    ssCoLA,

    drawFedTaxRate,
    drawStateTaxRate,
    ssFedTaxRate,
    ssStateTaxRate,

    ssErikMonthly,
    ssErikStartYear,
    ssDebbieMonthly,
    ssDebbieStartYear,

    allowancePerPersonPerMonth,

    healthBase,
    dogsBase,
    carsBase,
    travelBase,
    livingBase,
    loansBase,
    orcasExpenseBase,
    portlandExpenseBase,

    orcasValueBase,
    orcasPrincipalBase,       // remaining mortgage balance in start year
    orcasMortgageRate,        // annual rate e.g. 0.03125
    orcasMonthlyPayment,      // monthly P&I e.g. 2186

    portlandValueBase,
    portlandPrincipalBase,
    portlandMortgageRate,
    portlandMonthlyPayment,

    investmentBalanceBase,
  } = params;

  // Amortize mortgage balance forward by 12 monthly payments
  // Mirrors spreadsheet: -MIN(0, FV(rate/12, 12, -payment, prevPrincipal))
  function amortize(annualRate, monthlyPayment, prevPrincipal) {
    const r = annualRate / 12;
    const factor = Math.pow(1 + r, 12);
    const fv = -(prevPrincipal * factor + (-monthlyPayment) * (factor - 1) / r);
    return -Math.min(0, fv);
  }

  const startYear = 2026;
  const endOfGameYear = Math.max(erikDeathYear, debDeathYear);
  const rows = [];
  const drawTaxRate = drawFedTaxRate + drawStateTaxRate;
  const ssTaxRate   = ssFedTaxRate   + ssStateTaxRate;
  const allowanceNetRate = generalInflation - allowanceDeflation;

  const inf = (base, rate, t) => base * Math.pow(1 + rate, t);

  for (let year = startYear; year <= endOfGameYear + 2; year++) {
    const yrs     = year - startYear;
    const erikAge = year - new Date(erikDOB).getFullYear();
    const debAge  = year - new Date(debDOB).getFullYear();
    const alive   = year < endOfGameYear;
    const t       = yrs;

    // -- EXPENSES --
    const loans     = alive ? loansBase : 0;
    const health    = alive ? inf(healthBase,    healthcareInflation,  t) : 0;
    const dogs      = alive ? inf(dogsBase,      generalInflation,     t) : 0;
    const cars      = alive ? inf(carsBase,      generalInflation,     t) : 0;
    const travel    = alive ? inf(travelBase,    generalInflation,     t) : 0;
    const living    = alive ? inf(livingBase,    generalInflation,     t) : 0;
    const allowance = alive ? inf(allowancePerPersonPerMonth * 2 * 12, allowanceNetRate, t) : 0;
    const orcas     = alive ? inf(orcasExpenseBase,    generalInflation, t) : 0;
    const portland  = alive ? inf(portlandExpenseBase, generalInflation, t) : 0;
    const ltc       = 0; // handled in future event phase

    const totalExpenses = loans + health + dogs + cars + travel + living + allowance + orcas + portland;

    // -- SOCIAL SECURITY --
    const ssErik   = alive && year >= ssErikStartYear
      ? inf(ssErikMonthly * 12, ssCoLA, year - ssErikStartYear) : 0;
    const ssDebbie = alive && year >= ssDebbieStartYear
      ? inf(ssDebbieMonthly * 12, ssCoLA, year - ssDebbieStartYear) : 0;
    const ssSubtotal = ssErik + ssDebbie;
    const ssTax      = ssSubtotal * 0.85 * ssTaxRate;  // only 85% of SS is taxable
    const ssNet      = ssSubtotal - ssTax;

    // -- DRAW --
    const grossDraw = totalExpenses - ssNet;
    const drawTax   = Math.max(0, grossDraw) * drawTaxRate;
    const netDraw   = grossDraw + drawTax;

    // -- PROPERTIES --
    const orcasValue     = inf(orcasValueBase, realEstateAppreciation, t);
    const orcasPrincipal = t === 0
      ? orcasPrincipalBase
      : amortize(orcasMortgageRate, orcasMonthlyPayment, rows[t - 1].orcas_principal);
    const orcasEquity    = orcasValue - orcasPrincipal;

    const portlandValue     = inf(portlandValueBase, realEstateAppreciation, t);
    const portlandPrincipal = t === 0
      ? portlandPrincipalBase
      : amortize(portlandMortgageRate, portlandMonthlyPayment, rows[t - 1].portland_principal);
    const portlandEquity    = portlandValue - portlandPrincipal;

    const realEstate = orcasEquity + portlandEquity;

    // -- INVESTMENT BALANCE --
    let investmentBalance;
    if (t === 0) {
      investmentBalance = investmentBalanceBase;
    } else {
      const prev = rows[t - 1];
      investmentBalance = Math.max(0, prev.investment_balance + prev.roi - prev.net_draw);
    }

    const roi          = investmentBalance * investmentROI;
    const investPlusRE = investmentBalance + realEstate;
    // If broke, no draw is possible beyond SS
    const effectiveNetDraw = investmentBalance === 0 ? 0 : netDraw;
    const drawRate     = investPlusRE > 0 ? effectiveNetDraw / investPlusRE : 0;
    const capitalSpend = Math.max(0, effectiveNetDraw - roi);

    rows.push({
      year, yrs, erik_age: erikAge, deb_age: debAge,
      loans, health, dogs, cars, travel, living, allowance, orcas, portland, ltc,
      total_expenses: totalExpenses,
      ss_erik: ssErik, ss_debbie: ssDebbie, ss_subtotal: ssSubtotal, ss_tax: ssTax, ss_net: ssNet,
      gross_draw: grossDraw, draw_tax: drawTax, net_draw: effectiveNetDraw,
      draw_rate: drawRate, capital_spend: capitalSpend,
      investment_balance: investmentBalance, roi, invest_plus_re: investPlusRE,
      real_estate: realEstate, ltc_monthly: 0, ltc_entrance: 0,
      orcas_value: orcasValue, orcas_principal: orcasPrincipal, orcas_equity: orcasEquity,
      portland_value: portlandValue, portland_principal: portlandPrincipal, portland_equity: portlandEquity,
    });
  }

  return rows;
}

module.exports = { computeTimeline };
