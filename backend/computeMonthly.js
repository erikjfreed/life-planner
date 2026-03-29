/**
 * Compute monthly timeline from annual rows + events.
 * Takes the annual computation results and breaks them into monthly granularity.
 * Investment balance compounds monthly. Events show in their exact month.
 */
const { eventYear, eventMonth } = require('./dateUtils');

function computeMonthlyTimeline(annualRows, events, entities) {
  const monthly = [];

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

      // SS for this month
      let ssErik = 0;
      let ssDebbie = 0;
      if (r.social_security_erik > 0) {
        // Check if SS started this year — prorate
        const ssErikEvent = events.find(e => e.type === 'social_security_start' && e.name === 'Erik');
        const startMonth = ssErikEvent ? eventMonth(ssErikEvent) : 1;
        const startYear = ssErikEvent ? eventYear(ssErikEvent) : 0;
        if (r.year > startYear || (r.year === startYear && m >= startMonth)) {
          ssErik = r.social_security_erik / (r.year === startYear ? (13 - startMonth) : 12);
        }
      }
      if (r.social_security_debbie > 0) {
        const ssDebEvent = events.find(e => e.type === 'social_security_start' && e.name === 'Deb');
        const startMonth = ssDebEvent ? eventMonth(ssDebEvent) : 1;
        const startYear = ssDebEvent ? eventYear(ssDebEvent) : 0;
        if (r.year > startYear || (r.year === startYear && m >= startMonth)) {
          ssDebbie = r.social_security_debbie / (r.year === startYear ? (13 - startMonth) : 12);
        }
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

      monthly.push({
        year: r.year,
        month: m,
        date: `${r.year}-${String(m).padStart(2, '0')}`,
        erik_age: r.erik_age,
        deb_age: r.deb_age,
        // Monthly expenses (1/12 of annual)
        expenses: Math.round(monthlyExpenses),
        health: Math.round(r.health / 12),
        pets: Math.round(r.pets / 12),
        vehicles: Math.round(r.vehicles / 12),
        travel: Math.round(r.travel / 12),
        living: Math.round(r.living / 12),
        allowance: Math.round(r.allowance / 12),
        loans: Math.round(r.loans / 12),
        real_estate_costs: Math.round(r.real_estate_costs / 12),
        cap_expense: Math.round(r.cap_expense / 12),
        total_expenses: Math.round(monthlyExpenses),
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
