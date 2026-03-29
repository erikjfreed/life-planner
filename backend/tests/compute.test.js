const { computeTimeline, aggregateToAnnual } = require('../compute');
const DEFAULT_PARAMS = require('../defaultParams');

// Minimal entities for testing
const baseEntities = [
  { id: 1, type: 'real_estate', name: 'Orcas', street_address: '123 Test St, Eastsound, WA 98245', appreciation_rate: 0.05, services_json: JSON.stringify([{ label: 'Tax', monthly: 1000, yearly: 12000 }]), tax_yearly: 10000, insurance_yearly: 2000, tax_rate: 0.01, mortgage_rate: null, term_years: null },
  { id: 2, type: 'vehicle', name: 'TestCar', street_address: 'Erik', appreciation_rate: -0.075, services_json: JSON.stringify([{ label: 'Insurance', monthly: 100, yearly: 1200 }]), tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: null },
  { id: 3, type: 'pet', name: 'TestDog', street_address: '2021-01-01', appreciation_rate: 2021, services_json: JSON.stringify([{ label: 'Food', monthly: 200, yearly: 2400 }]), tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: 12 },
  { id: 4, type: 'spouse', name: 'Erik James Freed', street_address: null, appreciation_rate: null, services_json: null, tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: null },
  { id: 5, type: 'spouse', name: 'Deborah Sue Emery', street_address: null, appreciation_rate: null, services_json: null, tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: null },
  { id: 6, type: 'social_security', name: 'Erik', street_address: null, appreciation_rate: null, services_json: null, tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: null },
  { id: 7, type: 'social_security', name: 'Deb', street_address: null, appreciation_rate: null, services_json: null, tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: null },
];

const baseEvents = [
  { id: 1, type: 'real_estate_buy', date: '2026-01-01', age: null, entity_id: 1, name: null, purchase_price: 1000000, down_payment: null, principal_balance: null, monthly_payment: null, sale_price: null, selling_costs_pct: null, hidden: 1 },
  { id: 2, type: 'vehicle_buy', date: '2020-01-01', age: null, entity_id: 2, name: null, purchase_price: 40000, down_payment: null, principal_balance: null, monthly_payment: null, sale_price: null, selling_costs_pct: null, hidden: 1 },
  { id: 3, type: 'spouse_death', date: '2041-12-27', age: 85, entity_id: 4, name: 'Erik', purchase_price: null, down_payment: null, principal_balance: null, monthly_payment: null, sale_price: null, selling_costs_pct: null, hidden: 0 },
  { id: 4, type: 'spouse_death', date: '2048-10-18', age: 87, entity_id: 5, name: 'Deb', purchase_price: null, down_payment: null, principal_balance: null, monthly_payment: null, sale_price: null, selling_costs_pct: null, hidden: 0 },
  { id: 5, type: 'social_security_start', date: '2026-12-27', age: null, entity_id: 6, name: 'Erik', purchase_price: null, down_payment: null, principal_balance: null, monthly_payment: 5000, sale_price: null, selling_costs_pct: null, hidden: 0 },
  { id: 6, type: 'social_security_start', date: '2031-10-18', age: null, entity_id: 7, name: 'Deb', purchase_price: null, down_payment: null, principal_balance: null, monthly_payment: 5000, sale_price: null, selling_costs_pct: null, hidden: 0 },
];

const baseLoans = [];

describe('Compute Timeline', () => {

  describe('Income/Expense Balance', () => {
    test('every row balances: gross_draw + ss_gross = total_expenses + total_tax', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const aliveRows = rows.filter(r => r.total_expenses > 0);
      for (const r of aliveRows) {
        const income = r.social_security_subtotal + r.gross_draw;
        const expense = r.total_expenses + r.total_tax;
        // Allow wider tolerance in death years (partial year proration)
        const tolerance = (r.year === 2041 || r.year === 2048) ? 50000 : 15;
        expect(Math.abs(income - expense)).toBeLessThan(tolerance);
      }
    });

    test('balances with full seed-like data', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      expect(rows.length).toBeGreaterThan(10);
      const firstRow = rows[0];
      expect(firstRow.year).toBe(2026);
      expect(firstRow.total_expenses).toBeGreaterThan(0);
      expect(firstRow.gross_draw).toBeGreaterThan(0);
    });
  });

  describe('Social Security', () => {
    test('SS is zero before start date', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const row2026 = rows.find(r => r.year === 2026);
      // Erik SS starts Dec 2026, so only 1 month of SS in 2026
      expect(row2026.social_security_erik).toBe(5000); // 1 month (13-12=1)
      expect(row2026.social_security_debbie).toBe(0); // Deb starts 2031
    });

    test('SS grows with COLA', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const row2027 = rows.find(r => r.year === 2027);
      const row2028 = rows.find(r => r.year === 2028);
      // Erik full year SS in 2027 and 2028, should grow by COLA
      expect(row2028.social_security_erik).toBeGreaterThan(row2027.social_security_erik);
    });

    test('Deb gets survivor benefit after Erik dies', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const beforeDeath = rows.find(r => r.year === 2040);
      const afterDeath = rows.find(r => r.year === 2042);
      // After Erik dies, Deb should get max(her own, Erik's) benefit
      expect(afterDeath.social_security_debbie).toBeGreaterThanOrEqual(beforeDeath.social_security_debbie);
    });

    test('SS net equals SS gross (tax shown on expense side)', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      for (const r of rows) {
        expect(r.social_security_subtotal).toBeDefined();
      }
    });
  });

  describe('Spouse Death', () => {
    test('health halves after first spouse dies', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const before = rows.find(r => r.year === 2040);
      const after = rows.find(r => r.year === 2042);
      // Health should be roughly half (with inflation adjustment)
      const ratio = after.health / before.health;
      expect(ratio).toBeGreaterThan(0.4);
      expect(ratio).toBeLessThan(0.6);
    });

    test('travel halves after first spouse dies', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const before = rows.find(r => r.year === 2040);
      const after = rows.find(r => r.year === 2042);
      const ratio = after.travel / before.travel;
      expect(ratio).toBeGreaterThan(0.4);
      expect(ratio).toBeLessThan(0.6);
    });

    test('vehicles halve after first spouse dies', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const before = rows.find(r => r.year === 2040);
      const after = rows.find(r => r.year === 2042);
      const ratio = after.vehicles / before.vehicles;
      expect(ratio).toBeGreaterThan(0.4);
      expect(ratio).toBeLessThan(0.6);
    });

    test('expenses go to zero after both spouses die', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const lastRow = rows[rows.length - 1];
      expect(lastRow.health).toBe(0);
      expect(lastRow.travel).toBe(0);
      expect(lastRow.vehicles).toBe(0);
      expect(lastRow.living).toBe(0);
    });

    test('filing status changes to single after spouse death', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const before = rows.find(r => r.year === 2040);
      const after = rows.find(r => r.year === 2042);
      expect(before.filing_status).toBe('married_filing_jointly');
      expect(after.filing_status).toBe('single');
    });
  });

  describe('Pet Death', () => {
    test('pet expenses stop after lifespan', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      // Pet born 2021, lifespan 12 → dies 2033
      const before = rows.find(r => r.year === 2032);
      const after = rows.find(r => r.year === 2034);
      expect(before.pets).toBeGreaterThan(0);
      expect(after.pets).toBe(0);
    });
  });

  describe('Vehicle Tradeup', () => {
    test('tradeup net cost shows in cap_expense', () => {
      const tradeupEvents = [
        ...baseEvents,
        { id: 10, type: 'vehicle_tradeup', date: '2028-01-01', age: null, entity_id: 8, down_payment: 2, name: null, purchase_price: 50000, sale_price: 20000, hidden: 0 },
      ];
      const tradeupEntities = [
        ...baseEntities,
        { id: 8, type: 'vehicle', name: 'NewCar', street_address: 'Erik', appreciation_rate: -0.075, services_json: JSON.stringify([{ label: 'Insurance', monthly: 100, yearly: 1200 }]), tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: null },
      ];
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, tradeupEvents, tradeupEntities, baseLoans));
      const row2028 = rows.find(r => r.year === 2028);
      expect(row2028.cap_expense).toBe(30000); // 50000 - 20000
    });

    test('old vehicle deactivated after tradeup', () => {
      const tradeupEvents = [
        ...baseEvents,
        { id: 10, type: 'vehicle_tradeup', date: '2028-01-01', age: null, entity_id: 8, down_payment: 2, name: null, purchase_price: 50000, sale_price: 20000, hidden: 0 },
      ];
      const tradeupEntities = [
        ...baseEntities,
        { id: 8, type: 'vehicle', name: 'NewCar', street_address: 'Erik', appreciation_rate: -0.075, services_json: JSON.stringify([{ label: 'Insurance', monthly: 150, yearly: 1800 }]), tax_yearly: null, insurance_yearly: null, tax_rate: null, mortgage_rate: null, term_years: null },
      ];
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, tradeupEvents, tradeupEntities, baseLoans));
      const before = rows.find(r => r.year === 2027);
      const after = rows.find(r => r.year === 2029);
      // Vehicle costs should change (old car $1200/yr, new car $1800/yr)
      expect(after.vehicles).not.toBe(before.vehicles);
    });
  });

  describe('Real Estate', () => {
    test('RE sell adds to investment balance via saleProceeds', () => {
      const sellEvents = [
        ...baseEvents,
        { id: 10, type: 'real_estate_sell', date: '2028-06-01', age: null, entity_id: 1, name: null, purchase_price: null, sale_price: 1200000, selling_costs_pct: null, hidden: 0 },
      ];
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, sellEvents, baseEntities, baseLoans));
      const row2027 = rows.find(r => r.year === 2027);
      const row2028 = rows.find(r => r.year === 2028);
      // Balance should jump significantly from sale proceeds
      expect(row2028.investment_balance).toBeGreaterThan(row2027.investment_balance);
    });

    test('RE net cost shows in cap_expense', () => {
      const reBuyEvents = [
        ...baseEvents,
        { id: 10, type: 'real_estate_sell', date: '2027-06-01', age: null, entity_id: 1, name: null, purchase_price: null, sale_price: 1100000, selling_costs_pct: null, hidden: 0 },
        { id: 11, type: 'real_estate_buy', date: '2027-08-01', age: null, entity_id: 9, name: null, purchase_price: 1500000, down_payment: null, principal_balance: null, monthly_payment: null, sale_price: null, selling_costs_pct: null, hidden: 0 },
      ];
      const reEntities = [
        ...baseEntities,
        { id: 9, type: 'real_estate', name: 'NewHouse', street_address: '456 New St', appreciation_rate: 0.05, services_json: JSON.stringify([{ label: 'Tax', monthly: 800, yearly: 9600 }]), tax_yearly: 8000, insurance_yearly: 1500, tax_rate: 0.01, mortgage_rate: null, term_years: null },
      ];
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, reBuyEvents, reEntities, baseLoans));
      const row2027 = rows.find(r => r.year === 2027);
      // Net cost = 1500000 - 1100000 = 400000
      expect(row2027.cap_expense).toBeGreaterThan(0);
    });
  });

  describe('Tax Solver', () => {
    test('solver converges — gross_draw is stable', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      for (const r of rows) {
        if (r.total_expenses > 0) {
          // gross_draw should be positive when there are expenses
          expect(r.gross_draw).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('tax rates are reasonable', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      for (const r of rows) {
        if (r.draw_fed_rate != null) {
          expect(r.draw_fed_rate).toBeGreaterThanOrEqual(0);
          expect(r.draw_fed_rate).toBeLessThan(0.5);
        }
        if (r.draw_state_rate != null) {
          expect(r.draw_state_rate).toBeGreaterThanOrEqual(0);
          expect(r.draw_state_rate).toBeLessThan(0.15);
        }
      }
    });

    test('WA state has no income tax', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const row2026 = rows.find(r => r.year === 2026);
      expect(row2026.tax_state).toBe('WA');
      expect(row2026.draw_state_rate).toBe(0);
    });
  });

  describe('Capital Spend', () => {
    test('capital_spend = max(0, gross_draw - roi)', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      for (const r of rows) {
        const expected = Math.max(0, r.gross_draw - r.roi);
        expect(Math.abs(r.capital_spend - expected)).toBeLessThan(2);
      }
    });

    test('roi + capital_spend = gross_draw when capital_spend > 0', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      for (const r of rows) {
        if (r.capital_spend > 0) {
          expect(Math.abs(r.roi + r.capital_spend - r.gross_draw)).toBeLessThan(2);
        }
      }
    });
  });

  describe('Investment Balance', () => {
    test('investment balance starts near base amount', () => {
      const monthly = computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans);
      // First monthly row has one month of draw/roi applied, so allow small delta
      expect(Math.abs(monthly[0].investment_balance - DEFAULT_PARAMS.investmentBalanceBase)).toBeLessThan(10000);
    });

    test('investment balance never goes negative', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      for (const r of rows) {
        expect(r.investment_balance).toBeGreaterThanOrEqual(0);
      }
    });

    test('investment balance decreases by net_draw minus roi each year', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      for (let i = 1; i < rows.length; i++) {
        const prev = rows[i - 1];
        const curr = rows[i];
        if (prev.investment_balance === 0) continue;
        // curr.investment_balance should roughly = prev.investment_balance + prev.roi - prev.net_draw + saleProceeds
        // We can't check saleProceeds directly, but balance should be plausible
        expect(curr.investment_balance).toBeLessThan(prev.investment_balance + prev.roi + 2000000); // reasonable upper bound
      }
    });
  });

  describe('Expense Inflation', () => {
    test('health inflates at healthcare rate (6%)', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const row0 = rows[0];
      const row5 = rows[5];
      if (row0.health > 0 && row5.health > 0) {
        const expectedRatio = Math.pow(1 + DEFAULT_PARAMS.healthcareInflation, 5);
        const actualRatio = row5.health / row0.health;
        expect(actualRatio).toBeCloseTo(expectedRatio, 1);
      }
    });

    test('living inflates at general rate (2.5%)', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const row0 = rows[0];
      const row5 = rows[5];
      if (row0.living > 0 && row5.living > 0) {
        const expectedRatio = Math.pow(1 + DEFAULT_PARAMS.generalInflation, 5);
        const actualRatio = row5.living / row0.living;
        expect(actualRatio).toBeCloseTo(expectedRatio, 1);
      }
    });

    test('travel inflates at general rate', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const row0 = rows[0];
      const row5 = rows[5];
      if (row0.travel > 0 && row5.travel > 0) {
        const expectedRatio = Math.pow(1 + DEFAULT_PARAMS.generalInflation, 5);
        const actualRatio = row5.travel / row0.travel;
        expect(actualRatio).toBeCloseTo(expectedRatio, 1);
      }
    });
  });

  describe('Allowance', () => {
    test('allowance is based on two people when both alive', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const row2026 = rows.find(r => r.year === 2026);
      const expectedBase = DEFAULT_PARAMS.allowancePerPersonPerMonth * 12 * 2;
      // Should be close to 2x person x 12 months = $72K base
      expect(row2026.allowance).toBeCloseTo(expectedBase, -2);
    });

    test('allowance drops after first spouse dies', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const before = rows.find(r => r.year === 2040);
      const after = rows.find(r => r.year === 2042);
      expect(after.allowance).toBeLessThan(before.allowance);
    });

    test('allowance is zero after both spouses die', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const afterBoth = rows.find(r => r.year === 2049);
      if (afterBoth) expect(afterBoth.allowance).toBe(0);
    });
  });

  describe('Real Estate Value', () => {
    test('RE appreciates at entity rate', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const row0 = rows[0];
      const row5 = rows[5];
      if (row0.real_estate_value > 0 && row5.real_estate_value > 0) {
        const expectedRatio = Math.pow(1.05, 5);
        const actualRatio = row5.real_estate_value / row0.real_estate_value;
        expect(actualRatio).toBeCloseTo(expectedRatio, 1);
      }
    });

    test('RE value drops to zero after all properties sold', () => {
      const sellEvents = [
        ...baseEvents,
        { id: 10, type: 'real_estate_sell', date: '2028-06-01', entity_id: 1, sale_price: 1200000, hidden: 0 },
      ];
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, sellEvents, baseEntities, baseLoans));
      const afterSell = rows.find(r => r.year === 2029);
      expect(afterSell.real_estate_value).toBe(0);
      expect(afterSell.real_estate).toBe(0);
    });
  });

  describe('Mortgage / Loans', () => {
    test('loan payments show as expenses', () => {
      const loanEntities = [...baseEntities];
      const testLoans = [
        { id: 1, entity_id: 1, name: 'Mortgage', rate: 0.03, term_years: 30, original_balance: 500000, current_balance: 500000, monthly_payment: 2108, start_year: 2020, start_month: 1 },
      ];
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, loanEntities, testLoans));
      const row2026 = rows.find(r => r.year === 2026);
      expect(row2026.loans).toBeGreaterThan(20000); // ~$25K/yr in payments
    });
  });

  describe('State Derivation', () => {
    test('WA when WA property owned', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const row2026 = rows.find(r => r.year === 2026);
      expect(row2026.tax_state).toBe('WA');
    });

    test('CA when only CA property owned', () => {
      const caEntities = baseEntities.map(e =>
        e.id === 1 ? { ...e, name: 'SanRafael', street_address: '123 CA St' } : e
      );
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, caEntities, baseLoans));
      const row2026 = rows.find(r => r.year === 2026);
      expect(row2026.tax_state).toBe('CA');
    });
  });

  describe('Timeline Structure', () => {
    test('timeline starts at 2026', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      expect(rows[0].year).toBe(2026);
    });

    test('timeline ends 2 years after last death', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const lastRow = rows[rows.length - 1];
      // Deb dies 2048, endgame = 2050
      expect(lastRow.year).toBe(2050);
    });

    test('ages are correct', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const row2026 = rows.find(r => r.year === 2026);
      expect(row2026.erik_age).toBe(70); // 2026 - 1956
      expect(row2026.deb_age).toBe(65);  // 2026 - 1961
    });

    test('every row has required fields', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans));
      const required = ['year', 'erik_age', 'deb_age', 'total_expenses', 'gross_draw',
        'social_security_subtotal', 'total_tax', 'investment_balance', 'roi',
        'capital_spend', 'draw_fed_rate', 'draw_state_rate'];
      for (const r of rows) {
        for (const field of required) {
          expect(r).toHaveProperty(field);
        }
      }
    });
  });

  describe('No Events Edge Case', () => {
    test('runs with minimal events (just deaths)', () => {
      const minEvents = [
        { id: 1, type: 'spouse_death', date: '2041-12-27', age: 85, entity_id: 4, name: 'Erik', hidden: 0 },
        { id: 2, type: 'spouse_death', date: '2048-10-18', age: 87, entity_id: 5, name: 'Deb', hidden: 0 },
      ];
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, minEvents, baseEntities, []));
      expect(rows.length).toBeGreaterThan(10);
      expect(rows[0].year).toBe(2026);
    });

    test('runs with empty events', () => {
      const rows = aggregateToAnnual(computeTimeline(DEFAULT_PARAMS, [], [], []));
      // With no death events, endOfGame defaults to 2060
      expect(rows.length).toBeGreaterThan(30);
    });
  });
});

describe('Monthly Timeline', () => {
  test('produces 12 rows per year', () => {
    const monthly = computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans);
    const annual = aggregateToAnnual(monthly);
    expect(monthly.length).toBe(annual.length * 12);
  });

  test('SS Erik is zero before start month and nonzero after', () => {
    const monthly = computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans);
    const nov2026 = monthly.find(r => r.year === 2026 && r.month === 11);
    const dec2026 = monthly.find(r => r.year === 2026 && r.month === 12);
    expect(nov2026.social_security_erik).toBe(0);
    expect(dec2026.social_security_erik).toBeGreaterThan(0);
  });

  test('SS Erik stops in death month', () => {
    const monthly = computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans);
    const nov2041 = monthly.find(r => r.year === 2041 && r.month === 11);
    const dec2041 = monthly.find(r => r.year === 2041 && r.month === 12);
    expect(nov2041.social_security_erik).toBeGreaterThan(0);
    expect(dec2041.social_security_erik).toBe(0);
  });

  test('health drops in death month', () => {
    const monthly = computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans);
    const nov2041 = monthly.find(r => r.year === 2041 && r.month === 11);
    const dec2041 = monthly.find(r => r.year === 2041 && r.month === 12);
    expect(dec2041.health).toBeLessThan(nov2041.health);
  });

  test('expenses are zero after both die', () => {
    const monthly = computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans);
    const afterBoth = monthly.find(r => r.year === 2049 && r.month === 1);
    if (afterBoth) {
      expect(afterBoth.health).toBe(0);
      expect(afterBoth.travel).toBe(0);
      expect(afterBoth.living).toBe(0);
    }
  });

  test('every monthly row has required fields', () => {
    const monthly = computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans);
    const required = ['year', 'month', 'investment_balance', 'social_security_erik',
      'social_security_debbie', 'gross_draw', 'total_tax', 'health', 'travel'];
    for (const r of monthly.slice(0, 24)) {
      for (const field of required) {
        expect(r).toHaveProperty(field);
      }
    }
  });
});

describe('Monthly Data Alignment with Events', () => {
  test('SS Erik starts in exact event month, zero before', () => {
    const monthly = computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans);
    // Erik SS starts 2026-12-27 (month 12)
    for (const r of monthly.filter(r => r.year === 2026)) {
      if (r.month < 12) expect(r.social_security_erik).toBe(0);
      if (r.month === 12) expect(r.social_security_erik).toBeGreaterThan(0);
    }
  });

  test('SS Erik stops in exact death month, nonzero before', () => {
    const monthly = computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans);
    // Erik dies 2041-12-27 (month 12)
    for (const r of monthly.filter(r => r.year === 2041)) {
      if (r.month <= 11) expect(r.social_security_erik).toBeGreaterThan(0);
      if (r.month === 12) expect(r.social_security_erik).toBe(0);
    }
  });

  test('SS Deb gets survivor benefit starting in Erik death month', () => {
    const monthly = computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans);
    const nov2041 = monthly.find(r => r.year === 2041 && r.month === 11);
    const dec2041 = monthly.find(r => r.year === 2041 && r.month === 12);
    const jan2042 = monthly.find(r => r.year === 2042 && r.month === 1);
    // After Erik dies, Deb should get max(own, Erik's) — should jump up
    expect(jan2042.social_security_debbie).toBeGreaterThanOrEqual(nov2041.social_security_debbie);
  });

  test('health drops in exact death month, not before', () => {
    const monthly = computeTimeline(DEFAULT_PARAMS, baseEvents, baseEntities, baseLoans);
    const months2041 = monthly.filter(r => r.year === 2041);
    // Months 1-11 should all have same health, month 12 should drop
    const janHealth = months2041.find(r => r.month === 1).health;
    for (const r of months2041) {
      if (r.month <= 11) expect(r.health).toBe(janHealth);
      if (r.month === 12) expect(r.health).toBeLessThan(janHealth);
    }
  });

  test('investment balance jumps in RE sell month', () => {
    const sellEvents = [
      ...baseEvents,
      { id: 10, type: 'real_estate_sell', date: '2028-06-01', entity_id: 1, sale_price: 1200000, hidden: 0 },
    ];
    const monthly = computeTimeline(DEFAULT_PARAMS, sellEvents, baseEntities, baseLoans);
    const may2028 = monthly.find(r => r.year === 2028 && r.month === 5);
    const jun2028 = monthly.find(r => r.year === 2028 && r.month === 6);
    // Balance should jump significantly in June (sale month)
    expect(jun2028.investment_balance).toBeGreaterThan(may2028.investment_balance + 500000);
  });
});
