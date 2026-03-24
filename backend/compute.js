/**
 * Financial timeline computation engine.
 * Accepts params and events array. Events drive property state and death years.
 */

function computeTimeline(params, events = [], entities = [], loans = []) {
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

  // Extract death years from events (age-based or explicit year)
  const erikBirthYear = new Date(erikDOB).getFullYear();
  const debBirthYear  = new Date(debDOB).getFullYear();
  const erikDeathEvent = events.find(e => e.type === 'death' && e.name === 'Erik');
  const debDeathEvent  = events.find(e => e.type === 'death' && e.name === 'Deb');
  const erikDeathYear  = erikDeathEvent
    ? (erikDeathEvent.age != null ? erikBirthYear + erikDeathEvent.age : erikDeathEvent.year)
    : 2060;
  const debDeathYear   = debDeathEvent
    ? (debDeathEvent.age  != null ? debBirthYear  + debDeathEvent.age  : debDeathEvent.year)
    : 2060;
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
  // Each property: { name, value, loans: [{principal, rate, payment}], appreciationRate, expenseBase, yearBought, active }
  const initialBuys = events.filter(e => e.type === 're_buy' && e.year <= startYear);
  const properties = initialBuys.map(e => {
    const entity = entities.find(en => en.id === e.entity_id) ?? {};
    const services = entity.services_json ? JSON.parse(entity.services_json) : [];
    const expenseBase = services.reduce((s, i) => s + i.yearly, 0) + (entity.tax_yearly ?? 0) + (entity.insurance_yearly ?? 0);
    const propLoans = loans.filter(l => l.entity_id === e.entity_id).map(l => ({
      principal: l.current_balance,
      rate: l.rate,
      payment: l.monthly_payment,
    }));
    return {
      name: entity.name ?? e.name,
      entityId: e.entity_id,
      value: e.purchase_price,
      appreciationRate: entity.appreciation_rate,
      expenseBase,
      yearBought: e.year,
      active: true,
      loans: propLoans,
    };
  });

  let investmentBalance = investmentBalanceBase;
  let saleProceeds = 0;

  for (let year = startYear; year <= endOfGameYear + 2; year++) {
    saleProceeds = 0;
    const yrs     = year - startYear;
    const erikAge = year - new Date(erikDOB).getFullYear();
    const debAge  = year - new Date(debDOB).getFullYear();
    const alive   = year < endOfGameYear;
    const t       = yrs;

    // Reset monthsActive: active properties get full year, inactive get 0
    for (const prop of properties) {
      prop.monthsActive = prop.active ? 12 : 0;
    }

    // Snapshot pre-event RE value for chart interpolation
    const preEventREValue = properties.filter(p => p.active).reduce((sum, p) => sum + p.value, 0);

    // Add new properties from re_buy events scheduled for this year (future purchases)
    if (year > startYear) {
      const newBuys = events.filter(e => e.type === 're_buy' && e.year === year);
      for (const e of newBuys) {
        const entity = entities.find(en => en.id === e.entity_id) ?? {};
        const services = entity.services_json ? JSON.parse(entity.services_json) : [];
        const expenseBase = services.reduce((s, i) => s + i.yearly, 0) + (entity.tax_yearly ?? 0) + (entity.insurance_yearly ?? 0);
        const propLoans = loans.filter(l => l.entity_id === e.entity_id).map(l => ({
          principal: l.current_balance,
          rate: l.rate,
          payment: l.monthly_payment,
        }));
        const buyMonth = e.month || 1;
        const monthsOwned = 13 - buyMonth; // e.g. Aug(8) = 5 months
        properties.push({
          name: entity.name ?? e.name,
          entityId: e.entity_id,
          value: e.purchase_price,
          appreciationRate: entity.appreciation_rate,
          expenseBase,
          yearBought: e.year,
          active: true,
          loans: propLoans,
          monthsActive: monthsOwned,
        });
        // Subtract cash outlay (purchase price minus loan amounts)
        const loanTotal = propLoans.reduce((s, l) => s + l.principal, 0);
        saleProceeds -= (e.purchase_price - loanTotal);
      }
    }

    // Process re_sell events for this year
    const sells = events.filter(e => e.type === 're_sell' && e.year === year);
    for (const sell of sells) {
      const prop = properties.find(p => p.entityId === sell.entity_id && p.active);
      if (prop) {
        prop.active = false;
        const sellMonth = sell.month || 1;
        prop.monthsActive = sellMonth - 1; // e.g. Jun(6) = 5 months owned
        const salePrice = sell.sale_price != null ? sell.sale_price : prop.value;
        const sellingCostsPct = sell.selling_costs_pct != null ? sell.selling_costs_pct : 0;
        const totalPrincipal = prop.loans.reduce((s, l) => s + l.principal, 0);
        const proceeds = (salePrice - totalPrincipal) * (1 - sellingCostsPct);
        saleProceeds += proceeds;
      }
    }

    // Appreciate and amortize active properties
    for (const prop of properties) {
      if (!prop.active) continue;
      if (year > prop.yearBought) {
        prop.value = prop.value * (1 + prop.appreciationRate);
        for (const loan of prop.loans) {
          if (loan.principal > 0) {
            loan.principal = amortize(loan.rate, loan.payment, loan.principal);
          }
        }
      }
    }

    // Compute property-level values for Orcas and Portland (for row output)
    const orcasProp    = properties.find(p => p.name === 'Orcas'    && p.active);
    const portlandProp = properties.find(p => p.name === 'Portland' && p.active);

    const propPrincipal = (prop) => prop ? prop.loans.reduce((s, l) => s + l.principal, 0) : 0;

    const orcasValue      = orcasProp    ? orcasProp.value         : 0;
    const orcasPrincipal  = propPrincipal(orcasProp);
    const orcasEquity     = orcasValue - orcasPrincipal;

    const portlandValue     = portlandProp ? portlandProp.value      : 0;
    const portlandPrincipal = propPrincipal(portlandProp);
    const portlandEquity    = portlandValue - portlandPrincipal;

    const realEstate = properties
      .filter(p => p.active)
      .reduce((sum, p) => sum + (p.value - propPrincipal(p)), 0);

    const reValue = properties
      .filter(p => p.active)
      .reduce((sum, p) => sum + p.value, 0);

    // -- EXPENSES (prorated by monthsActive for buy/sell year) --
    const activePlusPartial = properties.filter(p => p.active || (p.monthsActive ?? 0) > 0);
    const loanPayments = alive
      ? activePlusPartial.reduce((sum, p) => {
          const months = p.monthsActive ?? 12;
          return sum + p.loans.filter(l => l.principal > 0).reduce((s, l) => s + l.payment * months, 0);
        }, 0)
      : 0;

    const health    = alive ? inf(healthBase,    healthcareInflation, t) : 0;
    const dogs      = alive ? inf(dogsBase,      generalInflation,    t) : 0;
    const cars      = alive ? inf(carsBase,      generalInflation,    t) : 0;
    const travel    = alive ? inf(travelBase,    generalInflation,    t) : 0;
    const living    = alive ? inf(livingBase,    generalInflation,    t) : 0;
    // Prorate allowance by month in death year
    const erikMonthsAlive = year < erikDeathYear ? 12
      : year === erikDeathYear && erikDeathEvent?.month ? erikDeathEvent.month - 1 : 0;
    const debMonthsAlive = year < debDeathYear ? 12
      : year === debDeathYear && debDeathEvent?.month ? debDeathEvent.month - 1 : 0;
    const allowancePerPerson = inf(allowancePerPersonPerMonth * 12, allowanceNetRate, t);
    const allowance = allowancePerPerson * (erikMonthsAlive / 12) + allowancePerPerson * (debMonthsAlive / 12);

    // RE property expenses — generic for all properties, prorated by monthsActive
    // Property tax computed from value × taxRate (grows with appreciation)
    const reCosts = alive
      ? activePlusPartial.reduce((sum, p) => {
          const months = p.monthsActive ?? 0;
          if (months === 0) return sum;
          const yearsSinceBought = Math.max(0, year - p.yearBought);
          return sum + inf(p.expenseBase, generalInflation, yearsSinceBought) * (months / 12);
        }, 0)
      : 0;

    // Legacy per-property expenses for row output (orcas/portland columns)
    const orcasExpProp = orcasProp || properties.find(p => p.name === 'Orcas' && !p.active && (p.monthsActive ?? 0) > 0);
    const portlandExpProp = portlandProp || properties.find(p => p.name === 'Portland' && !p.active && (p.monthsActive ?? 0) > 0);
    const orcas    = alive && orcasExpProp    ? inf(orcasExpProp.expenseBase, generalInflation, Math.max(0, year - orcasExpProp.yearBought)) * ((orcasExpProp.monthsActive ?? 0) / 12) : 0;
    const portland = alive && portlandExpProp ? inf(portlandExpProp.expenseBase, generalInflation, Math.max(0, year - portlandExpProp.yearBought)) * ((portlandExpProp.monthsActive ?? 0) / 12) : 0;
    const ltc      = 0;

    const totalExpenses = loanPayments + health + dogs + cars + travel + living + allowance + reCosts;

    // -- SOCIAL SECURITY --
    // In the start year, prorate by months remaining (13 - startMonth)
    const erikAlive = year < erikDeathYear || (year === erikDeathYear && erikMonthsAlive > 0);
    const debAlive  = year < debDeathYear  || (year === debDeathYear  && debMonthsAlive > 0);

    // Full annual SS amounts (with COLA) for each person
    const ssErikFull = ssErikEvent && year >= ssErikEvent.year
      ? inf(ssErikEvent.monthly_payment * 12, ssCoLA, year - ssErikEvent.year) : 0;
    const ssDebbieFull = ssDebbieEvent && year >= ssDebbieEvent.year
      ? inf(ssDebbieEvent.monthly_payment * 12, ssCoLA, year - ssDebbieEvent.year) : 0;

    // Erik's SS: only while alive, prorated in start/death year
    const ssErik = erikAlive && ssErikFull > 0
      ? (() => {
          if (year === ssErikEvent.year && ssErikEvent.month) return ssErikEvent.monthly_payment * (13 - ssErikEvent.month);
          if (year === erikDeathYear) return ssErikFull * (erikMonthsAlive / 12);
          return ssErikFull;
        })() : 0;

    // Deb's SS: survivor benefit — after Erik dies, gets max(her own, Erik's)
    const ssDebbie = debAlive && (ssDebbieFull > 0 || (!erikAlive && ssErikFull > 0))
      ? (() => {
          const ownBenefit = ssDebbieFull;
          const survivorBenefit = !erikAlive ? ssErikFull : 0;
          const effectiveFull = Math.max(ownBenefit, survivorBenefit);
          if (year === ssDebbieEvent?.year && ssDebbieEvent.month) return ssDebbieEvent.monthly_payment * (13 - ssDebbieEvent.month);
          // In Erik's death year: own benefit for months Erik alive, max(own, survivor) for remaining
          if (year === erikDeathYear && erikDeathEvent?.month) {
            const monthsBefore = erikDeathEvent.month - 1;
            const monthsAfter = 12 - monthsBefore;
            return ownBenefit * (monthsBefore / 12) + Math.max(ownBenefit, ssErikFull) * (monthsAfter / 12);
          }
          if (year === debDeathYear) return effectiveFull * (debMonthsAlive / 12);
          return effectiveFull;
        })() : 0;
    const ssSubtotal = ssErik + ssDebbie;
    const ssTax      = ssSubtotal * 0.85 * ssTaxRate;
    const ssNet      = ssSubtotal - ssTax;

    // -- DRAW --
    const grossDraw = totalExpenses - ssNet;
    const netDraw   = Math.max(0, grossDraw) / (1 - drawTaxRate);
    const drawTax   = netDraw - Math.max(0, grossDraw);

    // -- INVESTMENT BALANCE --
    if (t === 0) {
      investmentBalance = investmentBalanceBase + saleProceeds;
    } else {
      const prev = rows[t - 1];
      investmentBalance = Math.max(0, prev.investment_balance + prev.roi - prev.net_draw) + saleProceeds;
    }

    const roi          = investmentBalance * investmentROI;
    const investPlusRE = investmentBalance + realEstate;
    const effectiveNetDraw = investmentBalance === 0 ? 0 : netDraw;
    const drawRate     = investPlusRE > 0 ? effectiveNetDraw / investPlusRE : 0;
    const capitalSpend = Math.max(0, effectiveNetDraw - roi);

    rows.push({
      year, yrs, erik_age: erikAge, deb_age: debAge,
      loans: loanPayments, health, dogs, cars, travel, living, allowance, orcas, portland, ltc,
      total_expenses: totalExpenses,
      ss_erik: ssErik, ss_debbie: ssDebbie, ss_subtotal: ssSubtotal, ss_tax: ssTax, ss_net: ssNet,
      gross_draw: grossDraw, draw_tax: drawTax, net_draw: effectiveNetDraw,
      draw_rate: drawRate, capital_spend: capitalSpend,
      investment_balance: investmentBalance, roi, invest_plus_re: investPlusRE,
      real_estate: realEstate, re_value: reValue, re_costs: reCosts, pre_event_re_value: preEventREValue, ltc_monthly: 0, ltc_entrance: 0,
      orcas_value: orcasValue, orcas_principal: orcasPrincipal, orcas_equity: orcasEquity,
      portland_value: portlandValue, portland_principal: portlandPrincipal, portland_equity: portlandEquity,
    });
  }

  return rows;
}

module.exports = { computeTimeline };
