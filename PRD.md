# Freed Life Planner — Product Requirements Document

_Last updated: 2026-03-26_

---

## 1. Overview

The Freed Life Planner is a personal retirement financial planning application for Erik James Freed (DOB 12/27/1956) and Deborah Sue Emery (DOB 10/18/1961). It models their complete financial life from 2026 through end-of-life, including assets, expenses, income, taxes, and life events across a 35+ year horizon.

The system uses deterministic tax bracket math with an iterative solver to accurately compute effective tax rates, IRA draw requirements, and net wealth trajectories. All computations run server-side with zero external API dependencies.

**Live URL:** https://planner.erikfreed.com/lifeplanner

---

## 2. Architecture

| Layer | Technology | Details |
|-------|-----------|---------|
| Frontend | React 18 + Redux Toolkit | Dark theme, inline styles, Recharts |
| Backend | Node.js + Express 5 | REST API, serves React build |
| Database | SQLite (better-sqlite3) | Persistent, file-based, auto-seeded |
| Hosting | Hetzner Cloud (CX22) | Ubuntu 24.04, Helsinki |
| Proxy | Nginx | Reverse proxy, SSL, basic auth |
| SSL | Let's Encrypt (certbot) | Auto-renewing |
| Domain | planner.erikfreed.com | A record via Ionos DNS |

---

## 3. Data Model

### 3.1 Entity Types

| Type | Description | Key Fields |
|------|-------------|------------|
| `real_estate` | Properties with appreciation and services | address, appreciation_rate, tax_yearly, insurance_yearly, tax_rate, services_json |
| `vehicle` | Cars with depreciation and maintenance | name, owner (street_address), appreciation_rate (-7.5%), services_json |
| `pet` | Animals with lifespan modeling | name, birthday (street_address), birth_year (appreciation_rate), lifespan (term_years), services_json |
| `social_security` | Per-spouse SS income source | name (Erik/Deb) |
| `spouse` | Human entities | full name (Erik James Freed, Deborah Sue Emery) |

### 3.2 Event Types

| Type | Trigger | Impact |
|------|---------|--------|
| `real_estate_buy` | Property purchase | Investment balance decreases, expense stream starts, RE value tracked |
| `real_estate_sell` | Property sale | Equity → investment balance, expenses stop, RE value removed |
| `vehicle_buy` | Vehicle purchase | Investment balance decreases, vehicle expenses start |
| `vehicle_sell` | Vehicle sale | Sale proceeds → investment balance, expenses stop |
| `spouse_death` | Spouse passes | Filing status → single, health/travel/vehicles halve, SS survivor benefits |
| `social_security_start` | SS collection begins | Monthly income starts, COLA-indexed, taxed per bracket math |

### 3.3 Loans

Mortgages and debt instruments linked to entities via `entity_id`. Tracked fields: rate, term, balance, monthly payment, start date. Amortization computed month-by-month for accurate interest/principal splits.

---

## 4. Financial Computation Engine

### 4.1 Timeline (`compute.js`)

Generates one row per year from 2026 through end-of-game (last spouse death + 2 years). Each row computes:

**Expenses** (inflated annually):
- Loans (mortgage payments, no inflation)
- Health (6% healthcare inflation, halves on spouse death)
- Pets (from entity services, stops at pet death year)
- Vehicles (from entity services, halves on spouse death)
- Travel (2.5% inflation, halves on spouse death)
- Living/General (2.5% inflation, does not halve)
- Allowance ($3K/person/month, prorated by months alive, net 1.5% inflation)
- Real Estate Costs (services + property tax + insurance, prorated for partial years)

**Income:**
- Social Security (COLA-indexed, prorated first year, survivor benefits after spouse death)
- Investment ROI (balance × 7.5%)

**Tax Solver (iterative):**
1. Start with gross_draw = total_expenses - ss_net
2. Compute taxes via bracket math (federal + state)
3. Recalculate: gross_draw = expenses_after_ss / (1 - draw_tax_rate)
4. Repeat until convergence (< $1 change, max 10 iterations)

**Investment Balance:**
- Year 0: base balance + sale proceeds
- Year N: previous balance + ROI - net_draw + sale proceeds

### 4.2 Tax Brackets (`taxBrackets.js`)

Deterministic computation using progressive brackets — no LLM calls.

**Federal:**
- 2025-2026 brackets hardcoded (OBBBA/TCJA rates: 10%-37%)
- Future years: brackets inflate by `generalInflation` rate
- Standard deduction: base + age 65+ extra + senior bonus (OBBBA 2025-2028, $4K, phases out at $150K MFJ)
- SS taxation: combined income formula with 50%/85% tiers (thresholds NOT indexed since 1993)

**State:**
- Derived from active RE entities: WA if any WA property owned, else CA
- WA: no state income tax
- CA: progressive brackets (1%-12.3% + 1% MH surcharge over $1M), does not tax SS

**Deductions:**
- Standard vs itemized (uses greater)
- Mortgage interest (amortization walk)
- Property taxes (SALT cap: $40K 2025-2029, $10K 2030+, with phasedown)

### 4.3 Tax Data (`taxHelpers.js`)

Builds per-year tax context from timeline data:
- Mortgage interest per year (amortization walk per loan)
- Property taxes (inflated from entity data)
- Filing status (married_filing_jointly → single after spouse death)
- State of residence (derived from active properties)

---

## 5. Views

### 5.1 Dashboard
- **Parameters Panel** (left): Investment ROI, inflation rates, allowance, health scenario sliders
- **Wealth Chart**: Investments + Real Estate equity (stacked areas)
- **Income Chart**: SS + ROI + Capital Spend (stacked areas) + Total Tax (line)
- **Expense Chart**: 8 categories stacked largest-to-smallest with alternating warm/cool colors
- **Event Overlay**: Colored vertical lines with labels for all life events (deaths, SS starts, RE/vehicle transactions, pet deaths)
- **Tooltips**: 15px custom tooltips showing each item with percentage of total

### 5.2 Living
Itemized general household expenses (streaming, phones, food, misc). Base: $33,619/year.

### 5.3 Travel
Editable days with/without pets, boarding cost/day. Splits travel budget proportionally. Base: $36,000/year.

### 5.4 Health
Medicare plan options with min/max per person. Scenario slider (0% best → 100% worst). Dynamically updates healthBase parameter.

### 5.5 Pets
Per-pet subtabs (Winnie, Tatia). Editable lifespan dropdown (5-20 yrs, 0.5 steps). Shows born/RIP dates, yearly service costs. Global boarding $/day control.

### 5.6 Vehicles
Per-vehicle subtabs. Purchase price/date, owner, yearly service costs. **Trade-up mechanism**: set sell year → auto-creates sell + buy events for next vehicle. Depreciation-based sale price (editable dropdown). Future vehicles show "Not yet purchased."

### 5.7 Real Estate
Per-property subtabs. Editable purchase price ($50K-$4M), tax rate (0.5%-2.5%), address. Inner tabs: Expenses (services breakdown) and Appreciation (year-by-year values).

### 5.8 Loans
Per-loan subtabs. Balance, rate, payment, term, start date. Full amortization schedule (scrollable, sticky headers).

### 5.9 Social Security
Global COLA dropdown. Per-person subtabs. Monthly benefit, start date (uses birthday), countdown to collection. Annual schedule: monthly, annual, tax, net.

### 5.10 Spouses
Both spouses in one table. Full names (first/middle/last), born, died, lifespan, years remaining.

### 5.11 Tax
Auto-computed tax estimates for every year. Grouped columns: Deductions (mortgage interest, property tax), Social Security (income, fed/state rates, tax), Draw/IRA (solved income, fed/state rates, tax), Result (total tax, effective rate, solver cycles), Events. Border-boxed groups with dark theme headers.

### 5.12 Events
Read-only master event log. All event types with dates, names, entity IDs/types, prices, details. Sorted chronologically.

### 5.13 Timeline
Full year-by-year financial model. Grouped column headers (Real Estate, Lifestyle, Income, Draw, Wealth). Event column with color-coded labels. Compressed Year/Erik/Deb columns.

---

## 6. Parameters

### Inflation & Growth
| Parameter | Default | Used For |
|-----------|---------|----------|
| generalInflation | 2.5% | Most expenses, tax bracket indexing |
| healthcareInflation | 6% | Health costs |
| allowanceDeflation | 1% | Reduces allowance growth vs inflation |
| realEstateAppreciation | 5% | Property values |
| investmentROI | 7.5% | Portfolio returns |
| socialSecurityCoLA | 2.5% | SS benefit growth |

### Expense Bases (Annual)
| Parameter | Default |
|-----------|---------|
| healthBase | $21,276 |
| travelBase | $36,000 |
| livingBase | $33,619 |
| allowancePerPersonPerMonth | $3,000 |
| boardingCostPerPetPerDay | $75 |

### Other
| Parameter | Default |
|-----------|---------|
| investmentBalanceBase | $3,823,105 |
| filingStatus | married_filing_jointly |
| stateOfResidence | WA |
| travelDaysWithPets | 21 |
| travelDaysWithoutPets | 14 |
| healthScenarioPct | 0.45 |

---

## 7. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/parameters | Load all parameters |
| POST | /api/parameters | Update parameters |
| GET | /api/timeline | Compute full financial timeline |
| GET/POST/PUT/DELETE | /api/events[/:id] | CRUD events |
| GET/POST/PUT/DELETE | /api/entities[/:id] | CRUD entities |
| GET/POST/PUT/DELETE | /api/loans[/:id] | CRUD loans |
| POST | /api/vehicle-tradeup | Create sell + buy events for trade-up |
| DELETE | /api/vehicle-tradeup | Remove trade-up events |
| GET | /api/tax-data | Raw tax-relevant fields per year |
| GET | /api/tax-computed | Full tax table with solved draws |
| POST | /api/tax-estimate | Single-row tax estimation |

All frontend API calls use `/lifeplanner/api/...` prefix for nginx routing.

---

## 8. Deployment

### Server Setup
- Hetzner Cloud CX22 (2 vCPU, 4GB RAM, 40GB SSD)
- systemd service: `life-planner` (auto-starts, restarts on failure)
- Express on port 3001, nginx on 80/443

### Deploy Process
```bash
git push                          # from local
ssh root@204.168.205.36
cd /root/life-planner
git pull
cd frontend && npm run build
systemctl restart life-planner
```

### Authentication
- Nginx basic auth (`/etc/nginx/.htpasswd`)
- Users: erik, debbie

### SSL
- Let's Encrypt via certbot
- Auto-renewing (expires 2026-06-25)
- HTTP → HTTPS redirect

---

## 9. Design System

- **Theme**: Dark navy (#1a1a2e background, #1e293b panels, #334155 headers)
- **Text**: #e2e8f0 primary, #94a3b8 secondary, #cbd5e1 muted
- **Font size**: 12px everywhere (labels, values, selects, th, td)
- **Tables**: width: auto, alternating rows (#1e293b / #0f172a)
- **Label:field grids**: inline-grid, 5 columns (auto auto 20px auto auto), gray pill labels
- **Tabs**: L-shaped (left + bottom border, rounded bottom-left, blue when active)
- **Entity panels**: 1px solid #334155 border box, 6px radius, 12px padding
- **Charts**: Custom 15px tooltips with percentages, alternating warm/cool colors

### Event Colors
| Event | Color |
|-------|-------|
| Spouse death | Red (#ef4444) |
| Pet death | Orange (#f97316) |
| SS start | Blue (#2563eb) |
| RE buy | Purple (#7c3aed) |
| RE sell | Green (#16a34a) |
| Vehicle buy/sell | Pink (#ec4899) |
| End of game | Green (#16a34a) |

---

## 10. Seed Data

### Properties
| Name | Address | Purchase Price | Year |
|------|---------|---------------|------|
| Orcas | 184 Maria Lane, Eastsound, WA 98245 | $2,000,000 | 2026 |
| Portland | 4818 NE 35th Ave, Portland, OR 97211 | $950,000 | 2026 |
| San Rafael | 1820 Point San Pedro Rd, San Rafael, CA 94901 | $2,400,000 | 2027 |

### Vehicles
| Name | Owner | Purchase Price | Year |
|------|-------|---------------|------|
| 2019 Mazda CX-5 Signature | Deb | $38,000 | 2019 |
| 2021 Honda Ridgeline RTL-E | Erik | $48,000 | 2021 |
| Erik's Next Vehicle | Erik | TBD | TBD |
| Deb's Next Vehicle | Deb | TBD | TBD |

### Pets
| Name | Born | Lifespan | Services/Year |
|------|------|----------|--------------|
| Winnie | 2/2/2021 | 12.5 yrs | $7,695 |
| Tatia | 2/2/2022 | 12.5 yrs | $8,695 |

### Social Security
| Person | Monthly Benefit | Start |
|--------|----------------|-------|
| Erik | $5,215 | Dec 2026 |
| Deb | $5,392 | Oct 2031 |

### Life Events
| Event | Year | Age |
|-------|------|-----|
| Erik death | 2041 | 85 |
| Deb death | 2048 | 87 |
| Sell Orcas | 2027 (Jun) | — |
| Sell Portland | 2027 (Jun) | — |
| Buy San Rafael | 2027 (Aug) | — |
