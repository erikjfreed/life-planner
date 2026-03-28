/**
 * Compute yearly mortgage interest for a loan, walking the amortization forward.
 * Returns an array of { year, interest } from startYear until balance reaches 0.
 */
function computeMortgageInterest(loan, startYear, endYear) {
  const results = [];
  let balance = loan.current_balance;
  const monthlyRate = loan.rate / 12;

  for (let year = loan.start_year; year <= endYear && balance > 1; year++) {
    let yearInterest = 0;
    for (let m = 0; m < 12; m++) {
      const interest = balance * monthlyRate;
      const principalPaid = loan.monthly_payment - interest;
      yearInterest += interest;
      balance = Math.max(0, balance - principalPaid);
      if (balance <= 0) break;
    }
    if (year >= startYear) {
      results.push({ year, interest: yearInterest });
    }
  }
  return results;
}

const { eventYear } = require('./dateUtils');

/**
 * Build tax data rows from timeline, entities, events, loans, and params.
 * Returns one row per timeline year with tax-relevant fields.
 */
function buildTaxData(timelineRows, entities, events, loans, params) {
  const startYear = timelineRows.length > 0 ? timelineRows[0].year : 2026;
  const endYear = timelineRows.length > 0 ? timelineRows[timelineRows.length - 1].year : 2060;

  // Pre-compute mortgage interest schedules for all loans
  const loanInterestSchedules = loans.map(loan => ({
    entityId: loan.entity_id,
    schedule: computeMortgageInterest(loan, startYear, endYear),
  }));

  // Determine which entities are active per year (based on buy/sell events)
  function activeEntityIds(year) {
    const ids = new Set();
    for (const ev of events) {
      if ((ev.type === 'real_estate_buy' || ev.type === 'vehicle_buy') && eventYear(ev) <= year) {
        ids.add(ev.entity_id);
      }
    }
    for (const ev of events) {
      if ((ev.type === 'real_estate_sell' || ev.type === 'vehicle_sell') && eventYear(ev) <= year) {
        ids.delete(ev.entity_id);
      }
    }
    return ids;
  }

  // Death events for filing status
  const erikDeath = events.find(e => e.type === 'spouse_death' && e.name === 'Erik');
  const debDeath = events.find(e => e.type === 'spouse_death' && e.name === 'Deb');
  const erikBirthYear = params.erikDOB ? new Date(params.erikDOB).getFullYear() : null;
  const debBirthYear = params.debDOB ? new Date(params.debDOB).getFullYear() : null;
  const erikDeathYear = erikDeath ? (erikDeath.age != null && erikBirthYear ? erikBirthYear + erikDeath.age : eventYear(erikDeath)) : null;
  const debDeathYear = debDeath ? (debDeath.age != null && debBirthYear ? debBirthYear + debDeath.age : eventYear(debDeath)) : null;

  return timelineRows.map(row => {
    const activeIds = activeEntityIds(row.year);

    // Mortgage interest for this year (only for active entities)
    let mortgageInterest = 0;
    for (const ls of loanInterestSchedules) {
      if (activeIds.has(ls.entityId)) {
        const entry = ls.schedule.find(s => s.year === row.year);
        if (entry) mortgageInterest += entry.interest;
      }
    }

    // Property taxes for active real estate entities
    let propertyTaxes = 0;
    for (const id of activeIds) {
      const entity = entities.find(e => e.id === id && e.type === 'real_estate');
      if (entity && entity.tax_yearly) {
        const yearsSinceBuy = Math.max(0, row.year - startYear);
        propertyTaxes += entity.tax_yearly * Math.pow(1 + (params.generalInflation || 0.025), yearsSinceBuy);
      }
    }

    // Filing status: married_filing_jointly until the year after both spouses overlap
    let filingStatus = params.filingStatus || 'married_filing_jointly';
    const bothAlive = (!erikDeathYear || row.year <= erikDeathYear) && (!debDeathYear || row.year <= debDeathYear);
    if (!bothAlive) {
      filingStatus = 'single';
    }

    // Derive state from active real estate entities
    // Map entity names to states (WA properties: Orcas, Portland; CA: California Dream)
    const STATE_MAP = { 'Orcas': 'WA', 'Portland': 'WA' };
    let state = null;
    const activeREStates = new Set();
    for (const id of activeIds) {
      const entity = entities.find(e => e.id === id && e.type === 'real_estate');
      if (entity) {
        activeREStates.add(STATE_MAP[entity.name] || 'CA');
      }
    }
    if (activeREStates.has('WA')) {
      state = 'WA';
    } else if (activeREStates.size > 0) {
      state = [...activeREStates][0];
    } else {
      state = params.stateOfResidence || 'WA';
    }

    return {
      year: row.year,
      erik_age: row.erik_age,
      deb_age: row.deb_age,
      total_expenses: Math.round(row.total_expenses || 0),
      gross_draw: Math.round(row.gross_draw || 0),
      ss_income: Math.round(row.social_security_subtotal || 0),
      mortgage_interest: Math.round(mortgageInterest),
      property_taxes: Math.round(propertyTaxes),
      state,
      filing_status: filingStatus,
      inflation_rate: params.generalInflation || 0.025,
    };
  });
}

module.exports = { buildTaxData };
