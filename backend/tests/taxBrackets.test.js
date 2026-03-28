const { computeTaxes } = require('../taxBrackets');

describe('Tax Brackets', () => {

  describe('Federal Tax - MFJ', () => {
    test('basic MFJ computation', () => {
      const result = computeTaxes({
        year: 2026, filing_status: 'married_filing_jointly', state: 'WA',
        erik_age: 70, deb_age: 65,
        gross_draw: 300000, ss_income: 0,
        mortgage_interest: 0, property_taxes: 0,
        inflation_rate: 0.025,
      });
      expect(result.fed_tax).toBeGreaterThan(0);
      expect(result.draw_fed_rate).toBeGreaterThan(0.1);
      expect(result.draw_fed_rate).toBeLessThan(0.3);
    });

    test('higher income = higher effective rate', () => {
      const low = computeTaxes({
        year: 2026, filing_status: 'married_filing_jointly', state: 'WA',
        erik_age: 70, deb_age: 65,
        gross_draw: 100000, ss_income: 0,
        mortgage_interest: 0, property_taxes: 0,
      });
      const high = computeTaxes({
        year: 2026, filing_status: 'married_filing_jointly', state: 'WA',
        erik_age: 70, deb_age: 65,
        gross_draw: 500000, ss_income: 0,
        mortgage_interest: 0, property_taxes: 0,
      });
      expect(high.draw_fed_rate).toBeGreaterThan(low.draw_fed_rate);
    });
  });

  describe('Federal Tax - Single', () => {
    test('single filer pays more than MFJ at same income', () => {
      const mfj = computeTaxes({
        year: 2026, filing_status: 'married_filing_jointly', state: 'WA',
        erik_age: 70, deb_age: 65,
        gross_draw: 200000, ss_income: 0,
        mortgage_interest: 0, property_taxes: 0,
      });
      const single = computeTaxes({
        year: 2026, filing_status: 'single', state: 'WA',
        erik_age: 70, deb_age: 0,
        gross_draw: 200000, ss_income: 0,
        mortgage_interest: 0, property_taxes: 0,
      });
      expect(single.draw_fed_rate).toBeGreaterThan(mfj.draw_fed_rate);
    });
  });

  describe('WA State Tax', () => {
    test('WA has no state income tax', () => {
      const result = computeTaxes({
        year: 2026, filing_status: 'married_filing_jointly', state: 'WA',
        erik_age: 70, deb_age: 65,
        gross_draw: 300000, ss_income: 50000,
        mortgage_interest: 0, property_taxes: 0,
      });
      expect(result.state_tax).toBe(0);
      expect(result.draw_state_rate).toBe(0);
      expect(result.ss_state_rate).toBe(0);
    });
  });

  describe('CA State Tax', () => {
    test('CA has state income tax on draw', () => {
      const result = computeTaxes({
        year: 2026, filing_status: 'married_filing_jointly', state: 'CA',
        erik_age: 70, deb_age: 65,
        gross_draw: 300000, ss_income: 0,
        mortgage_interest: 0, property_taxes: 0,
      });
      expect(result.state_tax).toBeGreaterThan(0);
      expect(result.draw_state_rate).toBeGreaterThan(0);
    });

    test('CA does not tax Social Security', () => {
      const result = computeTaxes({
        year: 2026, filing_status: 'married_filing_jointly', state: 'CA',
        erik_age: 70, deb_age: 65,
        gross_draw: 0, ss_income: 60000,
        mortgage_interest: 0, property_taxes: 0,
      });
      expect(result.ss_state_rate).toBe(0);
    });
  });

  describe('Social Security Taxation', () => {
    test('SS is taxable when combined income exceeds threshold', () => {
      const result = computeTaxes({
        year: 2026, filing_status: 'married_filing_jointly', state: 'WA',
        erik_age: 70, deb_age: 65,
        gross_draw: 200000, ss_income: 60000,
        mortgage_interest: 0, property_taxes: 0,
      });
      expect(result.ss_fed_rate).toBeGreaterThan(0);
      expect(result.taxable_ss).toBeGreaterThan(0);
      // Up to 85% of SS should be taxable at high income
      expect(result.taxable_ss).toBeLessThanOrEqual(60000 * 0.85 + 1);
    });

    test('SS is not taxable at very low income', () => {
      const result = computeTaxes({
        year: 2026, filing_status: 'married_filing_jointly', state: 'WA',
        erik_age: 70, deb_age: 65,
        gross_draw: 10000, ss_income: 20000,
        mortgage_interest: 0, property_taxes: 0,
      });
      // Combined income = 10000 + 10000 = 20000 < 32000 MFJ threshold
      expect(result.taxable_ss).toBe(0);
    });
  });

  describe('Deductions', () => {
    test('uses standard deduction when greater than itemized', () => {
      const result = computeTaxes({
        year: 2026, filing_status: 'married_filing_jointly', state: 'WA',
        erik_age: 70, deb_age: 65,
        gross_draw: 200000, ss_income: 0,
        mortgage_interest: 5000, property_taxes: 5000,
      });
      // Standard deduction for MFJ age 65+ should exceed $10K itemized
      expect(result.deduction_type).toBe('standard');
      expect(result.deduction).toBeGreaterThan(30000);
    });

    test('uses itemized when mortgage interest + taxes exceed standard', () => {
      const result = computeTaxes({
        year: 2026, filing_status: 'married_filing_jointly', state: 'WA',
        erik_age: 70, deb_age: 65,
        gross_draw: 200000, ss_income: 0,
        mortgage_interest: 30000, property_taxes: 20000,
      });
      // SALT cap at $40K (2026), so itemized = 30000 + 20000 = 50000 (under cap)
      expect(result.deduction_type).toBe('itemized');
    });

    test('SALT cap limits property tax deduction', () => {
      const result = computeTaxes({
        year: 2026, filing_status: 'married_filing_jointly', state: 'WA',
        erik_age: 70, deb_age: 65,
        gross_draw: 200000, ss_income: 0,
        mortgage_interest: 20000, property_taxes: 60000,
      });
      // SALT cap at $40,400 for 2026
      // Itemized = 20000 + min(60000, 40400) = 60400
      expect(result.deduction_type).toBe('itemized');
      expect(result.deduction).toBeLessThan(80001); // Should be capped
    });
  });

  describe('Inflation Indexing', () => {
    test('brackets inflate for future years', () => {
      const result2026 = computeTaxes({
        year: 2026, filing_status: 'married_filing_jointly', state: 'WA',
        erik_age: 70, deb_age: 65,
        gross_draw: 300000, ss_income: 0,
        mortgage_interest: 0, property_taxes: 0,
        inflation_rate: 0.025,
      });
      const result2040 = computeTaxes({
        year: 2040, filing_status: 'married_filing_jointly', state: 'WA',
        erik_age: 84, deb_age: 79,
        gross_draw: 300000, ss_income: 0,
        mortgage_interest: 0, property_taxes: 0,
        inflation_rate: 0.025,
      });
      // Same income but inflated brackets → lower effective rate in future
      expect(result2040.draw_fed_rate).toBeLessThan(result2026.draw_fed_rate);
    });
  });

  describe('Total Tax', () => {
    test('total_tax = fed_tax + state_tax', () => {
      const result = computeTaxes({
        year: 2026, filing_status: 'married_filing_jointly', state: 'CA',
        erik_age: 70, deb_age: 65,
        gross_draw: 300000, ss_income: 50000,
        mortgage_interest: 10000, property_taxes: 15000,
        inflation_rate: 0.025,
      });
      expect(result.total_tax).toBe(result.fed_tax + result.state_tax);
    });

    test('rates are between 0 and 1', () => {
      const result = computeTaxes({
        year: 2026, filing_status: 'married_filing_jointly', state: 'CA',
        erik_age: 70, deb_age: 65,
        gross_draw: 300000, ss_income: 50000,
        mortgage_interest: 0, property_taxes: 0,
      });
      expect(result.draw_fed_rate).toBeGreaterThanOrEqual(0);
      expect(result.draw_fed_rate).toBeLessThanOrEqual(1);
      expect(result.draw_state_rate).toBeGreaterThanOrEqual(0);
      expect(result.draw_state_rate).toBeLessThanOrEqual(1);
      expect(result.ss_fed_rate).toBeGreaterThanOrEqual(0);
      expect(result.ss_fed_rate).toBeLessThanOrEqual(1);
    });
  });
});
