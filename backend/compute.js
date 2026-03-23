/**
 * Financial timeline computation engine.
 * Accepts params and events array. Events drive property state and death years.
 */

function computeTimeline(params, events = []) {
  const {
    erikDOB,
    debDOB,

    generalInflation,
    healthcareInflation,
    allowanceDeflation,
    investmentROI,
    ssCoLA,

    drawFedTaxRate,
    drawStateTaxRate,
    ssFedTaxRate,
    ssStateTaxRate,

    allowancePerPersonPerMonth,

    healthBase,
    dogsBase,
    carsBase,
    travelBase,
    livingBase,

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

  // Extract death years from events
  const erikDeathEvent = events.find(e => e.type === 'death' && e.name === 'Erik');
  const debDeathEvent  = events.find(e => e.type === 'death' && e.name === 'Deb');
  const erikDeathYear  = erikDeathEvent ? erikDeathEvent.year : 2060;
  const debDeathYear   = debDeathEvent  ? debDeathEvent.year  : 2060;
  const endOfGameYear  = Math.max(erikDeathYear, debDeathYear);

  // SS events
  const ssErikEvent   = events.find(e => e.type === 'ss_start' && e.name === 'Erik');
  const ssDebbieEvent = events.find(e => e.type === 'ss_start' && e.name === 'Deb');

  const rows = [];
  const drawTaxRate = drawFedTaxRate + drawStateTaxRate;
  const ssTaxRate   = ssFedTaxRate   + ssStateTaxRate;
  const allowanceNetRate = generalInflation - allowanceDeflation;

  const inf = (base, rate, t) => base * Math.pow(1 + rate, t);

  // Build initial property state from re_buy events with year <= startYear
  // Each property: { name, value, principal, rate, payment, appreciationRate, expenseBase, yearBought, active }
  const initialBuys = events.filter(e => e.type === 're_buy' && e.year <= startYear);
  const properties = initialBuys.map(e => ({
    name: e.name,
    value: e.purchase_price,
    principal: e.principal_balance,
    rate: e.mortgage_rate,
    payment: e.monthly_payment,
    appreciationRate: e.appreciation_rate,
    expenseBase: e.expense_base,
    yearBought: e.year,
    active: true,
  }));

  let investmentBalance = investmentBalanceBase;

  for (let year = startYear; year <= endOfGameYear + 2; year++) {
    const yrs     = year - startYear;
    const erikAge = year - new Date(erikDOB).getFullYear();
    const debAge  = year - new Date(debDOB).getFullYear();
    const alive   = year < endOfGameYear;
    const t       = yrs;

    // Add new properties from re_buy events scheduled for this year (future purchases)
    if (year > startYear) {
      const newBuys = events.filter(e => e.type === 're_buy' && e.year === year);
      for (const e of newBuys) {
        properties.push({
          name: e.name,
          value: e.purchase_price,
          principal: e.principal_balance,
          rate: e.mortgage_rate,
          payment: e.monthly_payment,
          appreciationRate: e.appreciation_rate,
          expenseBase: e.expense_base,
          yearBought: e.year,
          active: true,
        });
      }
    }

    // Process re_sell events for this year
    const sells = events.filter(e => e.type === 're_sell' && e.year === year);
    for (const sell of sells) {
      const prop = properties.find(p => p.name === sell.name && p.active);
      if (prop) {
        prop.active = false;
        const salePrice = sell.sale_price != null ? sell.sale_price : prop.value;
        const sellingCostsPct = sell.selling_costs_pct != null ? sell.selling_costs_pct : 0;
        const proceeds = (salePrice - prop.principal) * (1 - sellingCostsPct);
        investmentBalance += proceeds;
      }
    }

    // Appreciate and amortize active properties
    for (const prop of properties) {
      if (!prop.active) continue;
      if (year > prop.yearBought) {
        prop.value = prop.value * (1 + prop.appreciationRate);
        if (prop.principal > 0) {
          prop.principal = amortize(prop.rate, prop.payment, prop.principal);
        }
      }
    }

    // Compute property-level values for Orcas and Portland (for row output)
    const orcasProp    = properties.find(p => p.name === 'Orcas'    && p.active);
    const portlandProp = properties.find(p => p.name === 'Portland' && p.active);

    const orcasValue      = orcasProp    ? orcasProp.value     : 0;
    const orcasPrincipal  = orcasProp    ? orcasProp.principal : 0;
    const orcasEquity     = orcasValue - orcasPrincipal;

    const portlandValue     = portlandProp ? portlandProp.value     : 0;
    const portlandPrincipal = portlandProp ? portlandProp.principal : 0;
    const portlandEquity    = portlandValue - portlandPrincipal;

    const realEstate = properties
      .filter(p => p.active)
      .reduce((sum, p) => sum + (p.value - p.principal), 0);

    // -- EXPENSES --
    const loans = alive
      ? properties.filter(p => p.active && p.principal > 0).reduce((sum, p) => sum + p.payment * 12, 0)
      : 0;

    const health    = alive ? inf(healthBase,    healthcareInflation, t) : 0;
    const dogs      = alive ? inf(dogsBase,      generalInflation,    t) : 0;
    const cars      = alive ? inf(carsBase,      generalInflation,    t) : 0;
    const travel    = alive ? inf(travelBase,    generalInflation,    t) : 0;
    const living    = alive ? inf(livingBase,    generalInflation,    t) : 0;
    const allowance = alive ? inf(allowancePerPersonPerMonth * 2 * 12, allowanceNetRate, t) : 0;

    const orcas    = alive && orcasProp    ? inf(orcasProp.expenseBase,    generalInflation, t) : 0;
    const portland = alive && portlandProp ? inf(portlandProp.expenseBase, generalInflation, t) : 0;
    const ltc      = 0; // handled in future event phase

    const totalExpenses = loans + health + dogs + cars + travel + living + allowance + orcas + portland;

    // -- SOCIAL SECURITY --
    const ssErik   = alive && ssErikEvent   && year >= ssErikEvent.year
      ? inf(ssErikEvent.monthly_payment   * 12, ssCoLA, year - ssErikEvent.year)   : 0;
    const ssDebbie = alive && ssDebbieEvent && year >= ssDebbieEvent.year
      ? inf(ssDebbieEvent.monthly_payment * 12, ssCoLA, year - ssDebbieEvent.year) : 0;
    const ssSubtotal = ssErik + ssDebbie;
    const ssTax      = ssSubtotal * 0.85 * ssTaxRate;
    const ssNet      = ssSubtotal - ssTax;

    // -- DRAW --
    const grossDraw = totalExpenses - ssNet;
    const drawTax   = Math.max(0, grossDraw) * drawTaxRate;
    const netDraw   = grossDraw + drawTax;

    // -- INVESTMENT BALANCE --
    if (t === 0) {
      investmentBalance = investmentBalanceBase;
    } else {
      const prev = rows[t - 1];
      investmentBalance = Math.max(0, prev.investment_balance + prev.roi - prev.net_draw);
    }

    const roi          = investmentBalance * investmentROI;
    const investPlusRE = investmentBalance + realEstate;
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
