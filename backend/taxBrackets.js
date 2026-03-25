/**
 * Tax bracket computation engine.
 * Computes federal and state taxes using progressive brackets.
 */

// Federal brackets by year and filing status
const FEDERAL_BRACKETS = {
  2025: {
    married_filing_jointly: [
      [23850, 0.10], [96950, 0.12], [206700, 0.22], [394600, 0.24],
      [501050, 0.32], [751600, 0.35], [Infinity, 0.37],
    ],
    single: [
      [11925, 0.10], [48475, 0.12], [103350, 0.22], [197300, 0.24],
      [250525, 0.32], [626350, 0.35], [Infinity, 0.37],
    ],
  },
  2026: {
    married_filing_jointly: [
      [24800, 0.10], [100800, 0.12], [211400, 0.22], [403550, 0.24],
      [512450, 0.32], [768700, 0.35], [Infinity, 0.37],
    ],
    single: [
      [12400, 0.10], [50400, 0.12], [105700, 0.22], [201775, 0.24],
      [256225, 0.32], [640600, 0.35], [Infinity, 0.37],
    ],
  },
};

// Standard deduction by year and filing status
const STANDARD_DEDUCTION = {
  2025: { married_filing_jointly: 31500, single: 15750 },
  2026: { married_filing_jointly: 32200, single: 16100 },
};

// Additional standard deduction for age 65+
const AGE_65_EXTRA = {
  2025: { married_filing_jointly: 1600, single: 2000 }, // per qualifying person for MFJ
  2026: { married_filing_jointly: 1650, single: 2050 },
};

// Senior bonus deduction (OBBBA 2025-2028), phases out above MAGI thresholds
const SENIOR_BONUS = {
  amount: 4000,
  mfj_threshold: 150000,
  single_threshold: 75000,
  start_year: 2025,
  end_year: 2028,
};

// SALT cap by year (OBBBA raised it 2025-2029, reverts to 10K in 2030)
const SALT_CAP = {
  2025: { cap: 40000, phasedown_threshold: 500000 },
  2026: { cap: 40400, phasedown_threshold: 505000 },
  2027: { cap: 40804, phasedown_threshold: 510050 },
  2028: { cap: 41212, phasedown_threshold: 515151 },
  2029: { cap: 41624, phasedown_threshold: 520302 },
};
const SALT_CAP_DEFAULT = { cap: 10000, phasedown_threshold: Infinity };
const SALT_FLOOR = 10000;

// California brackets by year
const CA_BRACKETS = {
  2025: {
    married_filing_jointly: [
      [22158, 0.01], [52528, 0.02], [82904, 0.04], [115084, 0.06],
      [145448, 0.08], [742958, 0.093], [891542, 0.103],
      [1485906, 0.113], [Infinity, 0.123],
    ],
    single: [
      [11079, 0.01], [26264, 0.02], [41452, 0.04], [57542, 0.06],
      [72724, 0.08], [371479, 0.093], [445771, 0.103],
      [742953, 0.113], [Infinity, 0.123],
    ],
  },
  2026: {
    married_filing_jointly: [
      [22816, 0.01], [54088, 0.02], [85368, 0.04], [118502, 0.06],
      [149770, 0.08], [765032, 0.093], [918030, 0.103],
      [1530052, 0.113], [Infinity, 0.123],
    ],
    single: [
      [11408, 0.01], [27044, 0.02], [42684, 0.04], [59251, 0.06],
      [74885, 0.08], [382516, 0.093], [459015, 0.103],
      [765026, 0.113], [Infinity, 0.123],
    ],
  },
};

const CA_STANDARD_DEDUCTION = {
  2025: { married_filing_jointly: 11412, single: 5706 },
  2026: { married_filing_jointly: 11754, single: 5877 },
};

// CA Mental Health Services surcharge: +1% on taxable income over $1M
const CA_MHS_THRESHOLD = 1000000;
const CA_MHS_RATE = 0.01;

/**
 * Apply progressive brackets to taxable income.
 */
function applyBrackets(taxableIncome, brackets) {
  let tax = 0;
  let prev = 0;
  for (const [limit, rate] of brackets) {
    const taxable = Math.min(taxableIncome, limit) - prev;
    if (taxable <= 0) break;
    tax += taxable * rate;
    prev = limit;
  }
  return tax;
}

/**
 * Compute taxable Social Security using the combined income formula.
 * Combined income = AGI (excluding SS) + tax-exempt interest + 1/2 of SS benefits
 */
function computeTaxableSS(ssIncome, otherAGI, filingStatus) {
  if (ssIncome <= 0) return 0;

  const combinedIncome = otherAGI + ssIncome / 2;
  const isMFJ = filingStatus === 'married_filing_jointly';
  const base = isMFJ ? 32000 : 25000;
  const upper = isMFJ ? 44000 : 34000;

  if (combinedIncome <= base) return 0;

  // 50% tier
  const tier1 = Math.min(combinedIncome - base, upper - base);
  const taxable50 = Math.min(0.50 * ssIncome, 0.50 * tier1);

  if (combinedIncome <= upper) return taxable50;

  // 85% tier
  const tier2 = combinedIncome - upper;
  const taxable85 = Math.min(0.85 * ssIncome, 0.85 * tier2 + taxable50);

  return taxable85;
}

/**
 * Get brackets for a year, inflating thresholds for future years.
 */
function getBrackets(table, year, filingStatus, inflationRate) {
  const years = Object.keys(table).map(Number).sort((a, b) => a - b);
  let useYear = years[years.length - 1];
  for (const y of years) {
    if (y <= year) useYear = y;
  }
  const yearData = table[useYear];
  const brackets = yearData[filingStatus] || yearData['single'];
  const yearsAhead = year - useYear;
  if (yearsAhead <= 0 || !inflationRate) return brackets;
  const factor = Math.pow(1 + inflationRate, yearsAhead);
  return brackets.map(([limit, rate]) => [limit === Infinity ? Infinity : Math.round(limit * factor), rate]);
}

function getScalar(table, year, filingStatus, inflationRate) {
  const years = Object.keys(table).map(Number).sort((a, b) => a - b);
  let useYear = years[years.length - 1];
  for (const y of years) {
    if (y <= year) useYear = y;
  }
  const yearData = table[useYear];
  const value = yearData[filingStatus] ?? yearData['single'];
  const yearsAhead = year - useYear;
  if (yearsAhead <= 0 || !inflationRate) return value;
  return Math.round(value * Math.pow(1 + inflationRate, yearsAhead));
}

/**
 * Compute taxes for a given year's financial situation.
 *
 * @param {object} d - { year, filing_status, state, erik_age, deb_age, gross_draw, ss_income, mortgage_interest, property_taxes, inflation_rate }
 * @returns {object} - { draw_fed_rate, draw_state_rate, ss_fed_rate, ss_state_rate, fed_tax, state_tax, total_tax, explanation }
 */
function computeTaxes(d) {
  const year = d.year;
  const filing = d.filing_status || 'married_filing_jointly';
  const isMFJ = filing === 'married_filing_jointly';
  const state = d.state || 'WA';
  const inf = d.inflation_rate || 0.025;

  const iraDraw = d.gross_draw || 0;
  const ssIncome = d.ss_income || 0;
  const mortgageInterest = d.mortgage_interest || 0;
  const propertyTaxes = d.property_taxes || 0;

  // Count people 65+
  const over65Count = ((d.erik_age >= 65 ? 1 : 0) + (d.deb_age >= 65 ? 1 : 0));

  // --- FEDERAL ---

  // Taxable SS
  const taxableSS = computeTaxableSS(ssIncome, iraDraw, filing);

  // AGI = IRA draw + taxable SS
  const agi = iraDraw + taxableSS;

  // Standard deduction
  let stdDeduction = getScalar(STANDARD_DEDUCTION, year, filing, inf);
  const ageExtra = getScalar(AGE_65_EXTRA, year, filing, inf);
  if (isMFJ) {
    stdDeduction += ageExtra * over65Count;
  } else if (over65Count > 0) {
    stdDeduction += ageExtra;
  }

  // Senior bonus deduction (OBBBA 2025-2028)
  if (year >= SENIOR_BONUS.start_year && year <= SENIOR_BONUS.end_year && over65Count > 0) {
    const magiThreshold = isMFJ ? SENIOR_BONUS.mfj_threshold : SENIOR_BONUS.single_threshold;
    if (agi <= magiThreshold) {
      stdDeduction += SENIOR_BONUS.amount;
    }
  }

  // Itemized deductions
  const saltInfo = SALT_CAP[year] || SALT_CAP_DEFAULT;
  let saltCap = saltInfo.cap;
  if (agi > saltInfo.phasedown_threshold) {
    saltCap = Math.max(SALT_FLOOR, saltCap - 0.30 * (agi - saltInfo.phasedown_threshold));
  }
  const saltDeduction = Math.min(propertyTaxes, saltCap);
  const itemized = mortgageInterest + saltDeduction;

  // Use greater of standard or itemized
  const deduction = Math.max(stdDeduction, itemized);
  const deductionType = stdDeduction >= itemized ? 'standard' : 'itemized';

  // Federal taxable income
  const fedTaxableIncome = Math.max(0, agi - deduction);

  // Federal tax
  const fedBrackets = getBrackets(FEDERAL_BRACKETS, year, filing, inf);
  const fedTax = applyBrackets(fedTaxableIncome, fedBrackets);

  // Allocate federal tax proportionally between IRA and SS
  const iraShare = agi > 0 ? iraDraw / agi : 1;
  const ssShare = agi > 0 ? taxableSS / agi : 0;
  const fedTaxOnDraw = fedTax * iraShare;
  const fedTaxOnSS = fedTax * ssShare;

  const drawFedRate = iraDraw > 0 ? fedTaxOnDraw / iraDraw : 0;
  const ssFedRate = ssIncome > 0 ? fedTaxOnSS / ssIncome : 0;

  // --- STATE ---
  let stateTax = 0;
  let stateTaxOnDraw = 0;
  let stateTaxOnSS = 0;

  if (state === 'CA') {
    // California does not tax SS income
    const caStdDeduction = getScalar(CA_STANDARD_DEDUCTION, year, filing, inf);
    // CA itemized: mortgage interest + full property taxes (CA has no SALT cap)
    const caItemized = mortgageInterest + propertyTaxes;
    const caDeduction = Math.max(caStdDeduction, caItemized);
    const caTaxableIncome = Math.max(0, iraDraw - caDeduction);

    const caBrackets = getBrackets(CA_BRACKETS, year, filing, inf);
    stateTax = applyBrackets(caTaxableIncome, caBrackets);

    // Mental Health Services surcharge
    if (caTaxableIncome > CA_MHS_THRESHOLD) {
      stateTax += (caTaxableIncome - CA_MHS_THRESHOLD) * CA_MHS_RATE;
    }

    stateTaxOnDraw = stateTax; // all state tax is on draw (CA doesn't tax SS)
    stateTaxOnSS = 0;
  }
  // WA: no state income tax (stateTax stays 0)

  const drawStateRate = iraDraw > 0 ? stateTaxOnDraw / iraDraw : 0;
  const ssStateRate = ssIncome > 0 ? stateTaxOnSS / ssIncome : 0;

  const totalTax = fedTax + stateTax;

  const explanation = `AGI: $${Math.round(agi).toLocaleString()} (IRA $${Math.round(iraDraw).toLocaleString()} + taxable SS $${Math.round(taxableSS).toLocaleString()}). ` +
    `Deduction: $${Math.round(deduction).toLocaleString()} (${deductionType}). ` +
    `Fed taxable: $${Math.round(fedTaxableIncome).toLocaleString()}. ` +
    `Fed tax: $${Math.round(fedTax).toLocaleString()}. ` +
    (state === 'CA' ? `CA tax: $${Math.round(stateTax).toLocaleString()}. ` : `${state}: no state income tax. `) +
    `Total: $${Math.round(totalTax).toLocaleString()}.`;

  return {
    draw_fed_rate: Math.round(drawFedRate * 10000) / 10000,
    draw_state_rate: Math.round(drawStateRate * 10000) / 10000,
    ss_fed_rate: Math.round(ssFedRate * 10000) / 10000,
    ss_state_rate: Math.round(ssStateRate * 10000) / 10000,
    fed_tax: Math.round(fedTax),
    state_tax: Math.round(stateTax),
    total_tax: Math.round(totalTax),
    taxable_ss: Math.round(taxableSS),
    deduction: Math.round(deduction),
    deduction_type: deductionType,
    explanation,
  };
}

module.exports = { computeTaxes };
