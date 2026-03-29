/**
 * Financial timeline computation engine — MONTHLY granularity.
 * Primary loop is monthly. Tax computed annually, applied monthly.
 * Returns monthly rows. Use aggregateToAnnual() for yearly timeline.
 */
const { eventYear, eventMonth } = require('./dateUtils');
const { computeTaxes } = require('./taxBrackets');

function computeTimeline(params, events = [], entities = [], loans = []) {
  const {
    erikDOB, debDOB,
    generalInflation, healthcareInflation, allowanceDeflation,
    investmentROI, socialSecurityCoLA,
    allowancePerPersonPerMonth,
    healthBase, travelBase, livingBase,
    investmentBalanceBase,
  } = params;

  const startYear = 2026;
  const erikBirthYear = new Date(erikDOB).getFullYear();
  const debBirthYear  = new Date(debDOB).getFullYear();

  // Death events
  const erikDeathEvent = events.find(e => e.type === 'spouse_death' && e.name === 'Erik');
  const debDeathEvent  = events.find(e => e.type === 'spouse_death' && e.name === 'Deb');
  const erikDeathYear  = erikDeathEvent ? (erikDeathEvent.age != null ? erikBirthYear + erikDeathEvent.age : eventYear(erikDeathEvent)) : 2060;
  const erikDeathMonth = erikDeathEvent ? (eventMonth(erikDeathEvent) || 12) : 12;
  const debDeathYear   = debDeathEvent ? (debDeathEvent.age != null ? debBirthYear + debDeathEvent.age : eventYear(debDeathEvent)) : 2060;
  const debDeathMonth  = debDeathEvent ? (eventMonth(debDeathEvent) || 12) : 12;
  const endOfGameYear  = Math.max(erikDeathYear, debDeathYear);

  // SS events
  const ssErikEvent   = events.find(e => e.type === 'social_security_start' && e.name === 'Erik');
  const ssDebbieEvent = events.find(e => e.type === 'social_security_start' && e.name === 'Deb');
  const ssErikStartYear = ssErikEvent ? eventYear(ssErikEvent) : 9999;
  const ssErikStartMonth = ssErikEvent ? eventMonth(ssErikEvent) : 1;
  const ssErikMonthlyBase = ssErikEvent?.monthly_payment ?? 0;
  const ssDebStartYear = ssDebbieEvent ? eventYear(ssDebbieEvent) : 9999;
  const ssDebStartMonth = ssDebbieEvent ? eventMonth(ssDebbieEvent) : 1;
  const ssDebMonthlyBase = ssDebbieEvent?.monthly_payment ?? 0;

  const STATE_MAP = { 'Orcas': 'WA', 'Portland': 'WA' };
  const inf = (base, rate, t) => base * Math.pow(1 + rate, t);
  const allowanceNetRate = generalInflation - allowanceDeflation;

  // Initialize properties from initial buy events
  const properties = events.filter(e => e.type === 'real_estate_buy' && eventYear(e) <= startYear).map(e => {
    const entity = entities.find(en => en.id === e.entity_id) ?? {};
    const services = entity.services_json ? JSON.parse(entity.services_json) : [];
    const expenseBase = services.reduce((s, i) => s + i.yearly, 0) + (entity.tax_yearly ?? 0) + (entity.insurance_yearly ?? 0);
    const propLoans = loans.filter(l => l.entity_id === e.entity_id).map(l => ({
      principal: l.current_balance, rate: l.rate, payment: l.monthly_payment,
    }));
    return { name: entity.name ?? e.name, entityId: e.entity_id, value: e.purchase_price,
      appreciationRate: entity.appreciation_rate, expenseBase, yearBought: eventYear(e),
      active: true, loans: propLoans };
  });

  const rows = [];
  let investmentBalance = investmentBalanceBase;

  for (let year = startYear; year <= endOfGameYear + 2; year++) {
    const t = year - startYear;
    const erikAge = year - erikBirthYear;
    const debAge  = year - debBirthYear;

    // --- ANNUAL: RE buy/sell, appreciation, tax computation ---

    // RE buys this year
    if (year > startYear) {
      for (const e of events.filter(ev => ev.type === 'real_estate_buy' && eventYear(ev) === year)) {
        const entity = entities.find(en => en.id === e.entity_id) ?? {};
        const services = entity.services_json ? JSON.parse(entity.services_json) : [];
        const expenseBase = services.reduce((s, i) => s + i.yearly, 0) + (entity.tax_yearly ?? 0) + (entity.insurance_yearly ?? 0);
        const propLoans = loans.filter(l => l.entity_id === e.entity_id).map(l => ({
          principal: l.current_balance, rate: l.rate, payment: l.monthly_payment,
        }));
        properties.push({ name: entity.name ?? e.name, entityId: e.entity_id, value: e.purchase_price,
          appreciationRate: entity.appreciation_rate, expenseBase, yearBought: year,
          buyMonth: eventMonth(e) || 1, active: true, loans: propLoans });
      }
    }

    // RE sells this year (mark inactive, record sell month)
    for (const sell of events.filter(ev => ev.type === 'real_estate_sell' && eventYear(ev) === year)) {
      const prop = properties.find(p => p.entityId === sell.entity_id && p.active);
      if (prop) {
        prop.active = false;
        prop.sellYear = eventYear(sell);
        prop.sellMonth = eventMonth(sell) || 1;
        prop.sellDate = sell.date;
        prop.salePrice = sell.sale_price ?? prop.value;
        prop.sellingCostsPct = sell.selling_costs_pct ?? 0;
      }
    }

    // Appreciate and amortize (annually, at start of year for year > buyYear)
    for (const prop of properties) {
      if (!prop.active) continue;
      if (year > prop.yearBought) {
        prop.value *= (1 + prop.appreciationRate);
        for (const loan of prop.loans) {
          if (loan.principal > 0) {
            const r = loan.rate / 12;
            const factor = Math.pow(1 + r, 12);
            loan.principal = Math.max(0, -(prop.value * 0 + loan.principal * factor + (-loan.payment) * (factor - 1) / r));
            // Simplified: just amortize
            let bal = loan.principal;
            // Re-derive from proper amortization
          }
        }
      }
    }
    // Proper amortization: walk monthly for each loan
    for (const prop of properties) {
      if (!prop.active && !(prop.sellMonth && year === prop.yearBought)) continue;
      for (const loan of prop.loans) {
        if (loan.principal > 0 && year > prop.yearBought) {
          const r = loan.rate / 12;
          const factor = Math.pow(1 + r, 12);
          const fv = -(loan.principal * factor + (-loan.payment) * (factor - 1) / r);
          loan.principal = -Math.min(0, fv);
        }
      }
    }

    // Compute annual totals for tax calculation
    // We need to sum up what 12 months of expenses will be
    let annualExpenses = 0;
    let annualSS = 0;
    let annualMortgageInterest = 0;
    let annualPropertyTaxes = 0;
    let annualCapExpense = 0;

    // Pre-compute for the tax solver
    for (let m = 1; m <= 12; m++) {
      const erikAlive = year < erikDeathYear || (year === erikDeathYear && m < erikDeathMonth);
      const debAlive = year < debDeathYear || (year === debDeathYear && m < debDeathMonth);
      const peopleAlive = (erikAlive ? 1 : 0) + (debAlive ? 1 : 0);
      const alive = peopleAlive > 0;
      const tFrac = t + (m - 1) / 12;  // fractional years for monthly inflation
      // Health: annual premium (steps once a year). Others: monthly inflation.
      const mHealth = alive ? inf(healthBase, healthcareInflation, t) / 12 * (peopleAlive / 2) : 0;
      const mTravel = alive ? inf(travelBase, generalInflation, tFrac) / 12 * (peopleAlive / 2) : 0;
      const mLiving = alive ? inf(livingBase, generalInflation, tFrac) / 12 : 0;
      const mAllowance = alive ? inf(allowancePerPersonPerMonth, allowanceNetRate, tFrac) * peopleAlive : 0;

      // Pets
      let mPets = 0;
      if (alive) {
        for (const entity of entities.filter(e => e.type === 'pet')) {
          const birthYear = entity.appreciation_rate;
          const lifespan = entity.term_years;
          if (birthYear && lifespan && year >= Math.round(birthYear + lifespan)) continue;
          const services = entity.services_json ? JSON.parse(entity.services_json) : [];
          mPets += inf(services.reduce((s, i) => s + i.yearly, 0), generalInflation, tFrac) / 12;
        }
      }

      // Vehicles
      let mVehicles = 0;
      if (alive) {
        for (const entity of entities.filter(e => e.type === 'vehicle')) {
          const bought = events.some(e => e.type === 'vehicle_buy' && e.entity_id === entity.id && (eventYear(e) < year || (eventYear(e) === year && (eventMonth(e) || 1) <= m)));
          const tradedIn = events.some(e => e.type === 'vehicle_tradeup' && e.entity_id === entity.id && (eventYear(e) < year || (eventYear(e) === year && (eventMonth(e) || 1) <= m)));
          const tradedAway = events.some(e => e.type === 'vehicle_tradeup' && e.down_payment === entity.id && (eventYear(e) < year || (eventYear(e) === year && (eventMonth(e) || 1) <= m)));
          const sold = events.some(e => e.type === 'vehicle_sell' && e.entity_id === entity.id && (eventYear(e) < year || (eventYear(e) === year && (eventMonth(e) || 1) <= m)));
          if ((bought || tradedIn) && !tradedAway && !sold) {
            const services = entity.services_json ? JSON.parse(entity.services_json) : [];
            const buyEvt = events.find(e => e.type === 'vehicle_buy' && e.entity_id === entity.id) || events.find(e => e.type === 'vehicle_tradeup' && e.entity_id === entity.id);
            const tSinceBuy = Math.max(0, t + (m - 1) / 12 - Math.max(0, (eventYear(buyEvt) || startYear) - startYear));
            mVehicles += inf(services.reduce((s, i) => s + i.yearly, 0), generalInflation, tSinceBuy) / 12 * (peopleAlive / 2);
          }
        }
      }

      // Loans
      let mLoans = 0;
      if (alive) {
        for (const prop of properties) {
          const propActive = prop.active || (prop.sellYear === year && prop.sellMonth && m < prop.sellMonth);
          if (!propActive) continue;
          for (const loan of prop.loans) {
            if (loan.principal > 0) mLoans += loan.payment;
          }
        }
      }

      // RE costs
      let mRECosts = 0;
      if (alive) {
        for (const prop of properties) {
          const boughtThisYear = prop.yearBought === year;
          const buyMonth = prop.buyMonth || 1;
          const propActive = prop.active ? (boughtThisYear ? m >= buyMonth : true) : (prop.sellYear === year && prop.sellMonth ? m < prop.sellMonth : false);
          if (propActive) {
            const tSinceBought = Math.max(0, t + (m - 1) / 12 - Math.max(0, prop.yearBought - startYear));
            mRECosts += inf(prop.expenseBase, generalInflation, tSinceBought) / 12;
          }
        }
      }

      // SS
      let mSSErik = 0, mSSDeb = 0;
      const erikSSMonthly = (year > ssErikStartYear || (year === ssErikStartYear && m >= ssErikStartMonth))
        ? ssErikMonthlyBase * Math.pow(1 + socialSecurityCoLA, year - ssErikStartYear) : 0;
      const debSSMonthly = (year > ssDebStartYear || (year === ssDebStartYear && m >= ssDebStartMonth))
        ? ssDebMonthlyBase * Math.pow(1 + socialSecurityCoLA, year - ssDebStartYear) : 0;
      if (erikAlive) mSSErik = erikSSMonthly;
      if (debAlive) mSSDeb = debSSMonthly;
      if (!erikAlive && debAlive) mSSDeb = Math.max(debSSMonthly, erikSSMonthly);

      annualExpenses += mHealth + mTravel + mLiving + mAllowance + mPets + mVehicles + mLoans + mRECosts;
      annualSS += mSSErik + mSSDeb;
    }

    // Vehicle tradeup cap expense
    events.filter(e => e.type === 'vehicle_tradeup' && eventYear(e) === year).forEach(e => {
      annualCapExpense += (e.purchase_price ?? 0) - (e.sale_price ?? 0);
    });

    // RE net cost for cap expense
    let reNetCost = 0;
    for (const prop of properties) {
      if (prop.yearBought === year && year > startYear) {
        const loanTotal = prop.loans.reduce((s, l) => s + l.principal, 0);
        reNetCost += prop.value - loanTotal; // purchase outlay
      }
      if (prop.sellYear === year && !prop.active) {
        // Sold this year
        const totalPrincipal = prop.loans.reduce((s, l) => s + l.principal, 0);
        const proceeds = ((prop.salePrice ?? 0) - totalPrincipal) * (1 - (prop.sellingCostsPct ?? 0));
        reNetCost -= proceeds;
      }
    }
    annualCapExpense += Math.max(0, reNetCost);
    annualExpenses += annualCapExpense;

    // Mortgage interest and property taxes for tax calc
    for (const prop of properties) {
      if (prop.active || prop.sellMonth) {
        for (const loan of prop.loans) {
          if (loan.principal > 0) {
            let bal = loan.principal;
            const mr = loan.rate / 12;
            for (let m2 = 0; m2 < 12; m2++) {
              annualMortgageInterest += bal * mr;
              bal = Math.max(0, bal - (loan.payment - bal * mr));
            }
          }
        }
        const entity = entities.find(en => en.name === prop.name && en.type === 'real_estate');
        if (entity?.tax_yearly) {
          annualPropertyTaxes += inf(entity.tax_yearly, generalInflation, Math.max(0, year - prop.yearBought));
        }
      }
    }

    // State and filing status
    const activeREStates = new Set();
    for (const prop of properties) {
      if (prop.active) activeREStates.add(STATE_MAP[prop.name] || 'CA');
    }
    const taxState = activeREStates.has('WA') ? 'WA' : activeREStates.size > 0 ? [...activeREStates][0] : (params.stateOfResidence || 'WA');
    const anyAlive = year <= endOfGameYear;
    const bothAliveEndOfYear = (year < erikDeathYear) && (year < debDeathYear);
    const filingStatus = bothAliveEndOfYear ? (params.filingStatus || 'married_filing_jointly') : 'single';

    // Tax solver (annual)
    let grossDraw = Math.max(0, annualExpenses - annualSS);
    let taxResult = null;
    for (let iter = 0; iter < 10; iter++) {
      taxResult = computeTaxes({
        year, filing_status: filingStatus, state: taxState,
        erik_age: erikAge, deb_age: debAge,
        gross_draw: grossDraw, ss_income: annualSS,
        mortgage_interest: annualMortgageInterest, property_taxes: annualPropertyTaxes,
        inflation_rate: generalInflation,
      });
      const newGrossDraw = Math.max(0, annualExpenses + taxResult.total_tax - annualSS);
      if (Math.abs(newGrossDraw - grossDraw) < 1) { grossDraw = newGrossDraw; break; }
      grossDraw = newGrossDraw;
    }
    taxResult = computeTaxes({
      year, filing_status: filingStatus, state: taxState,
      erik_age: erikAge, deb_age: debAge,
      gross_draw: grossDraw, ss_income: annualSS,
      mortgage_interest: annualMortgageInterest, property_taxes: annualPropertyTaxes,
      inflation_rate: generalInflation,
    });

    // Count alive months to distribute tax only to alive months
    let aliveMonthCount = 0;
    for (let mc = 1; mc <= 12; mc++) {
      const eA = year < erikDeathYear || (year === erikDeathYear && mc < erikDeathMonth);
      const dA = year < debDeathYear || (year === debDeathYear && mc < debDeathMonth);
      if (eA || dA) aliveMonthCount++;
    }
    // Tax spread evenly across alive months; draw computed per-month below
    const monthlyTax = aliveMonthCount > 0 ? taxResult.total_tax / aliveMonthCount : 0;

    // --- MONTHLY LOOP: produce one row per month ---
    for (let m = 1; m <= 12; m++) {
      const erikAlive = year < erikDeathYear || (year === erikDeathYear && m < erikDeathMonth);
      const debAlive = year < debDeathYear || (year === debDeathYear && m < debDeathMonth);
      const peopleAlive = (erikAlive ? 1 : 0) + (debAlive ? 1 : 0);
      const alive = peopleAlive > 0;
      const tFrac = t + (m - 1) / 12;  // fractional years for monthly inflation

      // Health: annual premium (steps once a year). Others: monthly inflation.
      const mHealth = alive ? inf(healthBase, healthcareInflation, t) / 12 * (peopleAlive / 2) : 0;
      const mTravel = alive ? inf(travelBase, generalInflation, tFrac) / 12 * (peopleAlive / 2) : 0;
      const mLiving = alive ? inf(livingBase, generalInflation, tFrac) / 12 : 0;
      const mAllowance = alive ? inf(allowancePerPersonPerMonth, allowanceNetRate, tFrac) * peopleAlive : 0;

      let mPets = 0;
      if (alive) {
        for (const entity of entities.filter(e => e.type === 'pet')) {
          const birthYear = entity.appreciation_rate;
          const lifespan = entity.term_years;
          if (birthYear && lifespan && year >= Math.round(birthYear + lifespan)) continue;
          const services = entity.services_json ? JSON.parse(entity.services_json) : [];
          mPets += inf(services.reduce((s, i) => s + i.yearly, 0), generalInflation, tFrac) / 12;
        }
      }

      let mVehicles = 0;
      if (alive) {
        for (const entity of entities.filter(e => e.type === 'vehicle')) {
          const bought = events.some(e => e.type === 'vehicle_buy' && e.entity_id === entity.id && (eventYear(e) < year || (eventYear(e) === year && (eventMonth(e) || 1) <= m)));
          const tradedIn = events.some(e => e.type === 'vehicle_tradeup' && e.entity_id === entity.id && (eventYear(e) < year || (eventYear(e) === year && (eventMonth(e) || 1) <= m)));
          const tradedAway = events.some(e => e.type === 'vehicle_tradeup' && e.down_payment === entity.id && (eventYear(e) < year || (eventYear(e) === year && (eventMonth(e) || 1) <= m)));
          const sold = events.some(e => e.type === 'vehicle_sell' && e.entity_id === entity.id && (eventYear(e) < year || (eventYear(e) === year && (eventMonth(e) || 1) <= m)));
          if ((bought || tradedIn) && !tradedAway && !sold) {
            const services = entity.services_json ? JSON.parse(entity.services_json) : [];
            const buyEvt = events.find(e => e.type === 'vehicle_buy' && e.entity_id === entity.id) || events.find(e => e.type === 'vehicle_tradeup' && e.entity_id === entity.id);
            const tSinceBuy = tFrac - Math.max(0, (eventYear(buyEvt) || startYear) - startYear);
            mVehicles += inf(services.reduce((s, i) => s + i.yearly, 0), generalInflation, Math.max(0, tSinceBuy)) / 12 * (peopleAlive / 2);
          }
        }
      }

      let mLoans = 0;
      let mRECosts = 0;
      if (alive) {
        for (const prop of properties) {
          const boughtThisYear = prop.yearBought === year;
          const buyMonth = prop.buyMonth || 1;
          const propActive = prop.active
            ? (boughtThisYear ? m >= buyMonth : true)
            : (prop.sellYear === year && prop.sellMonth ? m < prop.sellMonth : false);
          if (propActive) {
            for (const loan of prop.loans) {
              if (loan.principal > 0) mLoans += loan.payment;
            }
            // RE costs: annual billing (property tax, insurance, HOA)
            const yearsSinceBought = Math.max(0, year - prop.yearBought);
            mRECosts += inf(prop.expenseBase, generalInflation, yearsSinceBought) / 12;
          }
        }
      }

      // Cap expense: computed in the month the event occurs
      let mCapExpense = 0;
      events.filter(e => e.type === 'vehicle_tradeup' && eventYear(e) === year && (eventMonth(e) || 1) === m).forEach(e => {
        mCapExpense += (e.purchase_price ?? 0) - (e.sale_price ?? 0);
      });
      for (const prop of properties) {
        if (prop.yearBought === year && (prop.buyMonth || 1) === m && year > startYear) {
          const loanTotal = prop.loans.reduce((s, l) => s + l.principal, 0);
          mCapExpense += prop.value - loanTotal;
        }
        if (prop.sellYear === year && prop.sellMonth === m && !prop.active) {
          const totalPrincipal = prop.loans.reduce((s, l) => s + l.principal, 0);
          const proceeds = ((prop.salePrice ?? 0) - totalPrincipal) * (1 - (prop.sellingCostsPct ?? 0));
          mCapExpense -= proceeds;
        }
      }

      const mTotalExpenses = mHealth + mTravel + mLiving + mAllowance + mPets + mVehicles + mLoans + mRECosts;

      // SS
      let mSSErik = 0, mSSDeb = 0;
      const erikSSMonthly = (year > ssErikStartYear || (year === ssErikStartYear && m >= ssErikStartMonth))
        ? ssErikMonthlyBase * Math.pow(1 + socialSecurityCoLA, year - ssErikStartYear) : 0;
      const debSSMonthly = (year > ssDebStartYear || (year === ssDebStartYear && m >= ssDebStartMonth))
        ? ssDebMonthlyBase * Math.pow(1 + socialSecurityCoLA, year - ssDebStartYear) : 0;
      if (erikAlive) mSSErik = erikSSMonthly;
      if (debAlive) mSSDeb = debSSMonthly;
      if (!erikAlive && debAlive) mSSDeb = Math.max(debSSMonthly, erikSSMonthly);

      const mSSTotal = mSSErik + mSSDeb;

      // Sale proceeds this month (investment balance impact)
      let monthSaleProceeds = 0;
      for (const prop of properties) {
        if (!prop.active && prop.sellYear === year && prop.sellMonth === m) {
          const totalPrincipal = prop.loans.reduce((s, l) => s + l.principal, 0);
          const proceeds = ((prop.salePrice ?? 0) - totalPrincipal) * (1 - (prop.sellingCostsPct ?? 0));
          monthSaleProceeds += proceeds;
        }
      }
      for (const prop of properties) {
        if (prop.yearBought === year && (prop.buyMonth || 1) === m && year > startYear) {
          const loanTotal = prop.loans.reduce((s, l) => s + l.principal, 0);
          monthSaleProceeds -= (prop.value - loanTotal);
        }
      }

      // Draw = operating expenses + tax share - SS (total investment outflow for this month)
      // Draw already includes the tax component — no separate tax deduction needed
      const effectiveDraw = alive ? Math.max(0, mTotalExpenses + monthlyTax - mSSTotal) : 0;
      const effectiveTax = alive ? monthlyTax : 0;

      // Investment balance: draw is the total outflow (includes tax), saleProceeds handles capital flows
      const monthlyROI = investmentBalance * (investmentROI / 12);
      investmentBalance = Math.max(0, investmentBalance + monthlyROI - effectiveDraw + monthSaleProceeds);

      // RE value: respect buy/sell months, not just active flag
      const isPropertyVisible = (p) => {
        if (p.active) {
          if (p.yearBought === year && p.buyMonth && m < p.buyMonth) return false;
          return year >= p.yearBought;
        }
        // Sold property: visible until sell month in sell year
        return p.sellYear === year && p.sellMonth && m < p.sellMonth;
      };
      const reValue = properties.filter(isPropertyVisible).reduce((s, p) => s + p.value, 0);
      const reEquity = properties.filter(isPropertyVisible).reduce((s, p) => s + p.value - p.loans.reduce((s2, l) => s2 + l.principal, 0), 0);

      rows.push({
        year, month: m, yrs: t, erik_age: erikAge, deb_age: debAge,
        health: Math.round(mHealth), pets: Math.round(mPets), vehicles: Math.round(mVehicles),
        travel: Math.round(mTravel), living: Math.round(mLiving), allowance: Math.round(mAllowance),
        loans: Math.round(mLoans), real_estate_costs: Math.round(mRECosts),
        cap_expense: Math.round(Math.max(0, mCapExpense)),
        total_expenses: Math.round(mTotalExpenses),
        social_security_erik: Math.round(mSSErik), social_security_debbie: Math.round(mSSDeb),
        social_security_subtotal: Math.round(mSSTotal),
        social_security_tax: Math.round(taxResult.total_tax * (annualSS > 0 ? (taxResult.ss_fed_rate + taxResult.ss_state_rate) * annualSS / taxResult.total_tax : 0) / aliveMonthCount),
        social_security_net: Math.round(mSSTotal),
        gross_draw: Math.round(effectiveDraw), draw_tax: Math.round(taxResult.draw_tax || 0) / aliveMonthCount,
        net_draw: Math.round(effectiveDraw),  // draw IS the total outflow (includes tax)
        total_tax: Math.round(effectiveTax),
        draw_fed_rate: taxResult.draw_fed_rate, draw_state_rate: taxResult.draw_state_rate,
        ss_fed_rate: taxResult.ss_fed_rate, ss_state_rate: taxResult.ss_state_rate,
        fed_tax: alive ? Math.round(taxResult.fed_tax / aliveMonthCount) : 0,
        state_tax: alive ? Math.round(taxResult.state_tax / aliveMonthCount) : 0,
        investment_balance: Math.round(investmentBalance),
        roi: Math.round(monthlyROI),
        capital_spend: Math.round(Math.max(0, effectiveDraw - monthlyROI)),
        real_estate: Math.round(reEquity), real_estate_value: Math.round(reValue),
        invest_plus_re: Math.round(investmentBalance + reEquity),
        draw_rate: (investmentBalance + reEquity) > 0 ? effectiveDraw * 12 / (investmentBalance + reEquity) : 0,
        tax_state: taxState, filing_status: filingStatus,
        mortgage_interest: Math.round(annualMortgageInterest), property_taxes_actual: Math.round(annualPropertyTaxes),
      });
    }
  }

  return rows;
}

/**
 * Aggregate monthly rows to annual for timeline table.
 */
function aggregateToAnnual(monthlyRows) {
  const years = {};
  for (const r of monthlyRows) {
    if (!years[r.year]) years[r.year] = [];
    years[r.year].push(r);
  }
  return Object.entries(years).map(([year, months]) => {
    const last = months[months.length - 1];
    const sum = (key) => months.reduce((s, m) => s + (m[key] || 0), 0);
    return {
      year: parseInt(year), yrs: last.yrs, erik_age: last.erik_age, deb_age: last.deb_age,
      health: sum('health'), pets: sum('pets'), vehicles: sum('vehicles'),
      travel: sum('travel'), living: sum('living'), allowance: sum('allowance'),
      loans: sum('loans'), real_estate_costs: sum('real_estate_costs'),
      cap_expense: sum('cap_expense'), total_expenses: sum('total_expenses'),
      social_security_erik: sum('social_security_erik'), social_security_debbie: sum('social_security_debbie'),
      social_security_subtotal: sum('social_security_subtotal'),
      social_security_tax: sum('social_security_tax'), social_security_net: sum('social_security_net'),
      gross_draw: sum('gross_draw'), draw_tax: sum('draw_tax'), net_draw: sum('net_draw'),
      total_tax: sum('total_tax'), roi: sum('roi'), capital_spend: sum('capital_spend'),
      draw_fed_rate: last.draw_fed_rate, draw_state_rate: last.draw_state_rate,
      ss_fed_rate: last.ss_fed_rate, ss_state_rate: last.ss_state_rate,
      fed_tax: sum('fed_tax'), state_tax: sum('state_tax'),
      investment_balance: last.investment_balance,
      real_estate: last.real_estate, real_estate_value: last.real_estate_value,
      invest_plus_re: last.invest_plus_re, draw_rate: last.draw_rate,
      tax_state: last.tax_state, filing_status: last.filing_status,
      mortgage_interest: last.mortgage_interest, property_taxes_actual: last.property_taxes_actual,
    };
  });
}

module.exports = { computeTimeline, aggregateToAnnual };
