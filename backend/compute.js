/**
 * Financial timeline computation engine.
 * Accepts params and events array. Events drive property state and death years.
 */

const { computeTaxes } = require('./taxBrackets');

function computeTimeline(params, events = [], entities = [], loans = []) {
  const {
    erikDOB,
    debDOB,

    generalInflation,
    healthcareInflation,
    allowanceDeflation,
    investmentROI,
    socialSecurityCoLA,


    allowancePerPersonPerMonth,

    healthBase,
    travelBase,
    livingBase,

    investmentBalanceBase,
  } = params;

  function amortize(annualRate, monthlyPayment, prevPrincipal) {
    const r = annualRate / 12;
    const factor = Math.pow(1 + r, 12);
    const fv = -(prevPrincipal * factor + (-monthlyPayment) * (factor - 1) / r);
    return -Math.min(0, fv);
  }

  const startYear = 2026;

  const erikBirthYear = new Date(erikDOB).getFullYear();
  const debBirthYear  = new Date(debDOB).getFullYear();
  const erikDeathEvent = events.find(e => e.type === 'spouse_death' && e.name === 'Erik');
  const debDeathEvent  = events.find(e => e.type === 'spouse_death' && e.name === 'Deb');
  const erikDeathYear  = erikDeathEvent
    ? (erikDeathEvent.age != null ? erikBirthYear + erikDeathEvent.age : erikDeathEvent.year)
    : 2060;
  const debDeathYear   = debDeathEvent
    ? (debDeathEvent.age  != null ? debBirthYear  + debDeathEvent.age  : debDeathEvent.year)
    : 2060;
  const endOfGameYear  = Math.max(erikDeathYear, debDeathYear);

  const socialSecurityErikEvent   = events.find(e => e.type === 'social_security_start' && e.name === 'Erik');
  const socialSecurityDebbieEvent = events.find(e => e.type === 'social_security_start' && e.name === 'Deb');

  const STATE_MAP = { 'Orcas': 'WA', 'Portland': 'WA' };

  const rows = [];
  const allowanceNetRate = generalInflation - allowanceDeflation;

  const inf = (base, rate, t) => base * Math.pow(1 + rate, t);

  const initialBuys = events.filter(e => e.type === 'real_estate_buy' && e.year <= startYear);
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

    for (const prop of properties) {
      prop.monthsActive = prop.active ? 12 : 0;
    }

    const preEventRealEstateValue = properties.filter(p => p.active).reduce((sum, p) => sum + p.value, 0);

    if (year > startYear) {
      const newBuys = events.filter(e => e.type === 'real_estate_buy' && e.year === year);
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
        const monthsOwned = 13 - buyMonth;
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
        const loanTotal = propLoans.reduce((s, l) => s + l.principal, 0);
        saleProceeds -= (e.purchase_price - loanTotal);
      }
    }

    const sells = events.filter(e => e.type === 'real_estate_sell' && e.year === year);
    for (const sell of sells) {
      const prop = properties.find(p => p.entityId === sell.entity_id && p.active);
      if (prop) {
        prop.active = false;
        const sellMonth = sell.month || 1;
        prop.monthsActive = sellMonth - 1;
        const salePrice = sell.sale_price != null ? sell.sale_price : prop.value;
        const sellingCostsPct = sell.selling_costs_pct != null ? sell.selling_costs_pct : 0;
        const totalPrincipal = prop.loans.reduce((s, l) => s + l.principal, 0);
        const proceeds = (salePrice - totalPrincipal) * (1 - sellingCostsPct);
        saleProceeds += proceeds;
      }
    }

    // Vehicle buy/sell cash flows
    events.filter(e => e.type === 'vehicle_sell' && e.year === year).forEach(e => {
      saleProceeds += (e.sale_price ?? 0);
    });
    events.filter(e => e.type === 'vehicle_buy' && e.year === year && !e.hidden).forEach(e => {
      saleProceeds -= (e.purchase_price ?? 0);
    });

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

    const realEstateValue = properties
      .filter(p => p.active)
      .reduce((sum, p) => sum + p.value, 0);

    // -- EXPENSES --
    const activePlusPartial = properties.filter(p => p.active || (p.monthsActive ?? 0) > 0);
    const loanPayments = alive
      ? activePlusPartial.reduce((sum, p) => {
          const months = p.monthsActive ?? 12;
          return sum + p.loans.filter(l => l.principal > 0).reduce((s, l) => s + l.payment * months, 0);
        }, 0)
      : 0;

    const erikAliveForExpenses = year < erikDeathYear || (year === erikDeathYear && (erikDeathEvent?.month ? erikDeathEvent.month - 1 : 0) > 0);
    const debAliveForExpenses = year < debDeathYear || (year === debDeathYear && (debDeathEvent?.month ? debDeathEvent.month - 1 : 0) > 0);
    const peopleAlive = (erikAliveForExpenses ? 1 : 0) + (debAliveForExpenses ? 1 : 0);
    const health    = alive ? inf(healthBase, healthcareInflation, t) * (peopleAlive / 2) : 0;
    const pets      = alive ? (() => {
      let total = 0;
      for (const entity of entities.filter(e => e.type === 'pet')) {
        const birthYear = entity.appreciation_rate;
        const lifespan = entity.term_years;
        if (birthYear && lifespan && year >= Math.round(birthYear + lifespan)) continue;
        const services = entity.services_json ? JSON.parse(entity.services_json) : [];
        total += inf(services.reduce((s, i) => s + i.yearly, 0), generalInflation, t);
      }
      return total;
    })() : 0;
    // Vehicle costs from active vehicle entities
    const vehicles  = alive ? (() => {
      let total = 0;
      for (const entity of entities.filter(e => e.type === 'vehicle')) {
        const bought = events.some(e => e.type === 'vehicle_buy' && e.entity_id === entity.id && e.year <= year);
        const sold = events.some(e => e.type === 'vehicle_sell' && e.entity_id === entity.id && e.year <= year);
        if (bought && !sold) {
          const services = entity.services_json ? JSON.parse(entity.services_json) : [];
          const buyEvent = events.find(e => e.type === 'vehicle_buy' && e.entity_id === entity.id);
          const yearsSinceBuy = Math.max(0, year - (buyEvent?.year || startYear));
          total += inf(services.reduce((s, i) => s + i.yearly, 0), generalInflation, yearsSinceBuy);
        }
      }
      return total * (peopleAlive / 2);
    })() : 0;
    const travel    = alive ? inf(travelBase,    generalInflation,    t) * (peopleAlive / 2) : 0;
    const living    = alive ? inf(livingBase,    generalInflation,    t) : 0;
    const erikMonthsAlive = year < erikDeathYear ? 12
      : year === erikDeathYear && erikDeathEvent?.month ? erikDeathEvent.month - 1 : 0;
    const debMonthsAlive = year < debDeathYear ? 12
      : year === debDeathYear && debDeathEvent?.month ? debDeathEvent.month - 1 : 0;
    const allowancePerPerson = inf(allowancePerPersonPerMonth * 12, allowanceNetRate, t);
    const allowance = allowancePerPerson * (erikMonthsAlive / 12) + allowancePerPerson * (debMonthsAlive / 12);

    const realEstateCosts = alive
      ? activePlusPartial.reduce((sum, p) => {
          const months = p.monthsActive ?? 0;
          if (months === 0) return sum;
          const yearsSinceBought = Math.max(0, year - p.yearBought);
          return sum + inf(p.expenseBase, generalInflation, yearsSinceBought) * (months / 12);
        }, 0)
      : 0;

    const orcasExpProp = orcasProp || properties.find(p => p.name === 'Orcas' && !p.active && (p.monthsActive ?? 0) > 0);
    const portlandExpProp = portlandProp || properties.find(p => p.name === 'Portland' && !p.active && (p.monthsActive ?? 0) > 0);
    const orcas    = alive && orcasExpProp    ? inf(orcasExpProp.expenseBase, generalInflation, Math.max(0, year - orcasExpProp.yearBought)) * ((orcasExpProp.monthsActive ?? 0) / 12) : 0;
    const portland = alive && portlandExpProp ? inf(portlandExpProp.expenseBase, generalInflation, Math.max(0, year - portlandExpProp.yearBought)) * ((portlandExpProp.monthsActive ?? 0) / 12) : 0;
    const ltc      = 0;

    const totalExpenses = loanPayments + health + pets + vehicles + travel + living + allowance + realEstateCosts;

    // -- SOCIAL SECURITY --
    const erikAlive = year < erikDeathYear || (year === erikDeathYear && erikMonthsAlive > 0);
    const debAlive  = year < debDeathYear  || (year === debDeathYear  && debMonthsAlive > 0);

    const socialSecurityErikFull = socialSecurityErikEvent && year >= socialSecurityErikEvent.year
      ? inf(socialSecurityErikEvent.monthly_payment * 12, socialSecurityCoLA, year - socialSecurityErikEvent.year) : 0;
    const socialSecurityDebbieFull = socialSecurityDebbieEvent && year >= socialSecurityDebbieEvent.year
      ? inf(socialSecurityDebbieEvent.monthly_payment * 12, socialSecurityCoLA, year - socialSecurityDebbieEvent.year) : 0;

    const socialSecurityErik = erikAlive && socialSecurityErikFull > 0
      ? (() => {
          if (year === socialSecurityErikEvent.year && socialSecurityErikEvent.month) return socialSecurityErikEvent.monthly_payment * (13 - socialSecurityErikEvent.month);
          if (year === erikDeathYear) return socialSecurityErikFull * (erikMonthsAlive / 12);
          return socialSecurityErikFull;
        })() : 0;

    const socialSecurityDebbie = debAlive && (socialSecurityDebbieFull > 0 || (!erikAlive && socialSecurityErikFull > 0))
      ? (() => {
          const ownBenefit = socialSecurityDebbieFull;
          const survivorBenefit = !erikAlive ? socialSecurityErikFull : 0;
          const effectiveFull = Math.max(ownBenefit, survivorBenefit);
          if (year === socialSecurityDebbieEvent?.year && socialSecurityDebbieEvent.month) return socialSecurityDebbieEvent.monthly_payment * (13 - socialSecurityDebbieEvent.month);
          if (year === erikDeathYear && erikDeathEvent?.month) {
            const monthsBefore = erikDeathEvent.month - 1;
            const monthsAfter = 12 - monthsBefore;
            return ownBenefit * (monthsBefore / 12) + Math.max(ownBenefit, socialSecurityErikFull) * (monthsAfter / 12);
          }
          if (year === debDeathYear) return effectiveFull * (debMonthsAlive / 12);
          return effectiveFull;
        })() : 0;
    const socialSecuritySubtotal = socialSecurityErik + socialSecurityDebbie;

    // -- Compute mortgage interest for this year --
    let mortgageInterest = 0;
    for (const prop of activePlusPartial) {
      if ((prop.monthsActive ?? 0) === 0) continue;
      for (const loan of prop.loans) {
        if (loan.principal <= 0) continue;
        // Walk 12 months to get interest (using pre-amortization principal for this year)
        let bal = loan.principal;
        const mr = loan.rate / 12;
        for (let m = 0; m < (prop.monthsActive ?? 12); m++) {
          mortgageInterest += bal * mr;
          bal = Math.max(0, bal - (loan.payment - bal * mr));
        }
      }
    }

    // -- Property taxes for active RE entities --
    let propertyTaxes = 0;
    for (const prop of activePlusPartial) {
      if ((prop.monthsActive ?? 0) === 0) continue;
      const entity = entities.find(en => en.name === prop.name && en.type === 'real_estate');
      if (entity && entity.tax_yearly) {
        propertyTaxes += inf(entity.tax_yearly, generalInflation, Math.max(0, year - prop.yearBought)) * ((prop.monthsActive ?? 12) / 12);
      }
    }

    // -- Determine state and filing status --
    const activeREStates = new Set();
    for (const prop of properties) {
      if (prop.active) activeREStates.add(STATE_MAP[prop.name] || 'CA');
    }
    const taxState = activeREStates.has('WA') ? 'WA' : activeREStates.size > 0 ? [...activeREStates][0] : (params.stateOfResidence || 'WA');
    const bothAlive = erikAlive && debAlive;
    const filingStatus = bothAlive ? (params.filingStatus || 'married_filing_jointly') : 'single';

    // -- TAX: iterative solver using bracket math --
    // Equation: grossDraw + SS_gross = totalExpenses + totalTax
    // So: grossDraw = totalExpenses + totalTax - SS_gross
    // Where totalTax depends on grossDraw (circular)
    let grossDraw = Math.max(0, totalExpenses - socialSecuritySubtotal);
    let taxResult = null;
    for (let iter = 0; iter < 10; iter++) {
      taxResult = computeTaxes({
        year, filing_status: filingStatus, state: taxState,
        erik_age: erikAge, deb_age: debAge,
        gross_draw: grossDraw, ss_income: socialSecuritySubtotal,
        mortgage_interest: mortgageInterest, property_taxes: propertyTaxes,
        inflation_rate: generalInflation,
      });
      const newGrossDraw = Math.max(0, totalExpenses + taxResult.total_tax - socialSecuritySubtotal);
      if (Math.abs(newGrossDraw - grossDraw) < 1) { grossDraw = newGrossDraw; break; }
      grossDraw = newGrossDraw;
    }
    // Final tax computation with solved draw
    taxResult = computeTaxes({
      year, filing_status: filingStatus, state: taxState,
      erik_age: erikAge, deb_age: debAge,
      gross_draw: grossDraw, ss_income: socialSecuritySubtotal,
      mortgage_interest: mortgageInterest, property_taxes: propertyTaxes,
      inflation_rate: generalInflation,
    });

    const socialSecurityTax = socialSecuritySubtotal * (taxResult.ss_fed_rate + taxResult.ss_state_rate);
    const socialSecurityNet = socialSecuritySubtotal;
    const drawTax = grossDraw * (taxResult.draw_fed_rate + taxResult.draw_state_rate);
    const netDraw = grossDraw + drawTax;

    // -- INVESTMENT BALANCE --
    if (t === 0) {
      investmentBalance = investmentBalanceBase + saleProceeds;
    } else {
      const prev = rows[t - 1];
      investmentBalance = Math.max(0, prev.investment_balance + prev.roi - prev.net_draw) + saleProceeds;
    }

    const roi          = investmentBalance * investmentROI;
    const investPlusRealEstate = investmentBalance + realEstate;
    const effectiveNetDraw = investmentBalance === 0 ? 0 : netDraw;
    const drawRate     = investPlusRealEstate > 0 ? effectiveNetDraw / investPlusRealEstate : 0;
    const capitalSpend = Math.max(0, effectiveNetDraw - roi);

    rows.push({
      year, yrs, erik_age: erikAge, deb_age: debAge,
      loans: loanPayments, health, pets, vehicles, travel, living, allowance, orcas, portland, ltc,
      total_expenses: totalExpenses,
      social_security_erik: socialSecurityErik, social_security_debbie: socialSecurityDebbie,
      social_security_subtotal: socialSecuritySubtotal, social_security_tax: socialSecurityTax, social_security_net: socialSecurityNet,
      gross_draw: grossDraw, draw_tax: drawTax, net_draw: effectiveNetDraw,
      draw_fed_rate: taxResult.draw_fed_rate, draw_state_rate: taxResult.draw_state_rate,
      ss_fed_rate: taxResult.ss_fed_rate, ss_state_rate: taxResult.ss_state_rate,
      fed_tax: taxResult.fed_tax, state_tax: taxResult.state_tax, total_tax: taxResult.total_tax,
      mortgage_interest: Math.round(mortgageInterest), property_taxes_actual: Math.round(propertyTaxes),
      tax_state: taxState, filing_status: filingStatus,
      draw_rate: drawRate, capital_spend: capitalSpend,
      investment_balance: investmentBalance, roi, invest_plus_re: investPlusRealEstate,
      real_estate: realEstate, real_estate_value: realEstateValue, real_estate_costs: realEstateCosts,
      pre_event_real_estate_value: preEventRealEstateValue, ltc_monthly: 0, ltc_entrance: 0,
      orcas_value: orcasValue, orcas_principal: orcasPrincipal, orcas_equity: orcasEquity,
      portland_value: portlandValue, portland_principal: portlandPrincipal, portland_equity: portlandEquity,
    });
  }

  return rows;
}

module.exports = { computeTimeline };
