/**
 * Compute monthly timeline from annual rows + events.
 * Takes the annual computation results and breaks them into monthly granularity.
 * Investment balance compounds monthly. Events show in their exact month.
 */
const { eventYear, eventMonth } = require('./dateUtils');

function computeMonthlyTimeline(annualRows, events, entities) {
  const monthly = [];

  // Find death events
  const erikDeathEvent = events.find(e => e.type === 'spouse_death' && e.name === 'Erik');
  const debDeathEvent = events.find(e => e.type === 'spouse_death' && e.name === 'Deb');
  const erikDeathYear = erikDeathEvent ? eventYear(erikDeathEvent) : 9999;
  const erikDeathMonth = erikDeathEvent ? eventMonth(erikDeathEvent) : 12;
  const debDeathYear = debDeathEvent ? eventYear(debDeathEvent) : 9999;
  const debDeathMonth = debDeathEvent ? eventMonth(debDeathEvent) : 12;

  for (let yi = 0; yi < annualRows.length; yi++) {
    const r = annualRows[yi];
    const prevRow = yi > 0 ? annualRows[yi - 1] : null;

    // Starting investment balance for this year
    // For year 0, use the row's balance directly
    // For subsequent years, use the last monthly balance from previous year
    let monthlyBalance = (monthly.length > 0) ? monthly[monthly.length - 1].investment_balance : r.investment_balance;

    const monthlyROI = (r.roi > 0 && r.investment_balance > 0)
      ? (r.investment_balance > 0 ? r.roi / r.investment_balance / 12 : 0)
      : 0;
    const monthlyDraw = r.gross_draw / 12;
    const monthlyTax = r.total_tax / 12;
    const monthlyExpenses = r.total_expenses / 12;

    // RE value for this year (appreciates annually, show same value all 12 months)
    const reValue = r.real_estate_value || 0;
    const reEquity = r.real_estate || 0;

    for (let m = 1; m <= 12; m++) {
      // Check for events this month
      const monthEvents = events.filter(e => {
        const ey = eventYear(e);
        const em = eventMonth(e);
        return ey === r.year && em === m;
      });

      // Apply saleProceeds from events in this month
      let monthSaleProceeds = 0;
      for (const e of monthEvents) {
        if (e.type === 'real_estate_sell') {
          monthSaleProceeds += (e.sale_price ?? 0);
        }
        if (e.type === 'real_estate_buy' && !e.hidden) {
          monthSaleProceeds -= (e.purchase_price ?? 0);
        }
        if (e.type === 'vehicle_tradeup') {
          // Net cost already in draw, but balance impact is immediate
          // This is handled by the annual capExpense flow
        }
      }

      // Monthly compound: balance grows by monthly ROI, minus draw
      const roiThisMonth = monthlyBalance * monthlyROI;
      monthlyBalance = Math.max(0, monthlyBalance + roiThisMonth - monthlyDraw - monthlyTax + monthSaleProceeds);

      // Is each spouse alive this month?
      const erikAlive = r.year < erikDeathYear || (r.year === erikDeathYear && m < erikDeathMonth);
      const debAlive = r.year < debDeathYear || (r.year === debDeathYear && m < debDeathMonth);
      const peopleAlive = (erikAlive ? 1 : 0) + (debAlive ? 1 : 0);

      // SS for this month — only while alive and after start date
      let ssErik = 0;
      let ssDebbie = 0;
      if (erikAlive) {
        const ssErikEvent = events.find(e => e.type === 'social_security_start' && e.name === 'Erik');
        const startMonth = ssErikEvent ? eventMonth(ssErikEvent) : 1;
        const startYear = ssErikEvent ? eventYear(ssErikEvent) : 0;
        if (r.year > startYear || (r.year === startYear && m >= startMonth)) {
          // Use the COLA-adjusted monthly rate from annual computation
          const ssErikMonthly = r.social_security_erik > 0
            ? r.social_security_erik / (r.year === startYear ? (13 - startMonth) : 12)
            : 0;
          ssErik = ssErikMonthly;
        }
      }
      if (debAlive) {
        const ssDebEvent = events.find(e => e.type === 'social_security_start' && e.name === 'Deb');
        const startMonth = ssDebEvent ? eventMonth(ssDebEvent) : 1;
        const startYear = ssDebEvent ? eventYear(ssDebEvent) : 0;
        if (r.year > startYear || (r.year === startYear && m >= startMonth)) {
          const ssDebMonthly = r.social_security_debbie > 0
            ? r.social_security_debbie / (r.year === startYear ? (13 - startMonth) : 12)
            : 0;
          ssDebbie = ssDebMonthly;
        }
      }
      // Survivor benefit: after Erik dies, Deb gets max(own, Erik's)
      if (!erikAlive && debAlive && r.social_security_debbie > 0) {
        // The annual computation already handles survivor benefits
        // Just use the annual per-month value which includes it
      }

      // Event labels for this month
      const eventLabel = monthEvents.length > 0
        ? monthEvents.map(e => {
            const entity = entities.find(en => en.id === e.entity_id);
            if (e.type === 'spouse_death') return `RIP ${e.name}`;
            if (e.type === 'social_security_start') return `SS ${e.name}`;
            if (e.type === 'real_estate_buy') return `Buy ${entity?.name || '?'}`;
            if (e.type === 'real_estate_sell') return `Sell ${entity?.name || '?'}`;
            if (e.type === 'vehicle_tradeup') return `Tradeup ${entity?.street_address || '?'}'s vehicle`;
            return e.type;
          }).join(', ')
        : null;

      // Scale expenses that depend on people alive
      // The annual values are already prorated, but for monthly we need per-month accuracy
      const alive = peopleAlive > 0;
      const annualPeopleAlive = (r.year < erikDeathYear ? 1 : 0) + (r.year < debDeathYear ? 1 : 0) || 1;
      const monthScale = alive ? (peopleAlive / annualPeopleAlive) : 0;

      const mHealth = alive ? Math.round(r.health / 12 * monthScale) : 0;
      const mTravel = alive ? Math.round(r.travel / 12 * monthScale) : 0;
      const mVehicles = alive ? Math.round(r.vehicles / 12 * monthScale) : 0;
      const mLiving = alive ? Math.round(r.living / 12) : 0;
      const mAllowance = alive ? Math.round(r.allowance / 12 * (peopleAlive / 2)) : 0;
      const mPets = alive ? Math.round(r.pets / 12) : 0;
      const mLoans = alive ? Math.round(r.loans / 12) : 0;
      const mRECosts = alive ? Math.round(r.real_estate_costs / 12) : 0;
      const mCapExp = Math.round(r.cap_expense / 12);
      const mTotalExp = mHealth + mTravel + mVehicles + mLiving + mAllowance + mPets + mLoans + mRECosts + mCapExp;

      monthly.push({
        year: r.year,
        month: m,
        date: `${r.year}-${String(m).padStart(2, '0')}`,
        erik_age: r.erik_age,
        deb_age: r.deb_age,
        health: mHealth,
        pets: mPets,
        vehicles: mVehicles,
        travel: mTravel,
        living: mLiving,
        allowance: mAllowance,
        loans: mLoans,
        real_estate_costs: mRECosts,
        cap_expense: mCapExp,
        total_expenses: mTotalExp,
        // Monthly income
        social_security_erik: Math.round(ssErik),
        social_security_debbie: Math.round(ssDebbie),
        social_security_subtotal: Math.round(ssErik + ssDebbie),
        // Monthly draw and tax
        gross_draw: Math.round(monthlyDraw),
        total_tax: Math.round(monthlyTax),
        draw_tax: Math.round(r.draw_tax / 12),
        // Balance (compounds monthly)
        investment_balance: Math.round(monthlyBalance),
        roi: Math.round(roiThisMonth),
        real_estate: Math.round(reEquity),
        real_estate_value: Math.round(reValue),
        invest_plus_re: Math.round(monthlyBalance + reEquity),
        capital_spend: Math.round(Math.max(0, monthlyDraw - roiThisMonth)),
        // Rates (same all year)
        draw_fed_rate: r.draw_fed_rate,
        draw_state_rate: r.draw_state_rate,
        tax_state: r.tax_state,
        filing_status: r.filing_status,
        // Event
        event: eventLabel,
      });
    }
  }

  return monthly;
}

/**
 * Aggregate monthly rows back to annual for the timeline table.
 * Takes the last month of each year for balance fields, sums for flow fields.
 */
function aggregateToAnnual(monthlyRows) {
  const years = {};
  for (const m of monthlyRows) {
    if (!years[m.year]) years[m.year] = [];
    years[m.year].push(m);
  }

  return Object.entries(years).map(([year, months]) => {
    const last = months[months.length - 1];
    return {
      year: parseInt(year),
      erik_age: last.erik_age,
      deb_age: last.deb_age,
      // Sum monthly flows
      health: months.reduce((s, m) => s + m.health, 0),
      pets: months.reduce((s, m) => s + m.pets, 0),
      vehicles: months.reduce((s, m) => s + m.vehicles, 0),
      travel: months.reduce((s, m) => s + m.travel, 0),
      living: months.reduce((s, m) => s + m.living, 0),
      allowance: months.reduce((s, m) => s + m.allowance, 0),
      loans: months.reduce((s, m) => s + m.loans, 0),
      real_estate_costs: months.reduce((s, m) => s + m.real_estate_costs, 0),
      cap_expense: months.reduce((s, m) => s + m.cap_expense, 0),
      total_expenses: months.reduce((s, m) => s + m.total_expenses, 0),
      social_security_erik: months.reduce((s, m) => s + m.social_security_erik, 0),
      social_security_debbie: months.reduce((s, m) => s + m.social_security_debbie, 0),
      social_security_subtotal: months.reduce((s, m) => s + m.social_security_subtotal, 0),
      gross_draw: months.reduce((s, m) => s + m.gross_draw, 0),
      total_tax: months.reduce((s, m) => s + m.total_tax, 0),
      draw_tax: months.reduce((s, m) => s + m.draw_tax, 0),
      roi: months.reduce((s, m) => s + m.roi, 0),
      capital_spend: months.reduce((s, m) => s + m.capital_spend, 0),
      // Point-in-time values from last month
      investment_balance: last.investment_balance,
      real_estate: last.real_estate,
      real_estate_value: last.real_estate_value,
      invest_plus_re: last.invest_plus_re,
      draw_fed_rate: last.draw_fed_rate,
      draw_state_rate: last.draw_state_rate,
      tax_state: last.tax_state,
      filing_status: last.filing_status,
    };
  });
}

module.exports = { computeMonthlyTimeline, aggregateToAnnual };
