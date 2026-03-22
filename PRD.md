# Life Planner — Product Requirements Document

_Last updated: 2026-03-22_

---

## Overview

A private web application for Erik and his wife Debbie to manage their post-retirement financial planning. It replaces and extends an existing Google Sheets spreadsheet, adding a proper UI, data persistence, visualization, and eventually live data integrations.

The app models finances from the present day through end of life — projecting income, expenses, and asset balances year by year, and tracking actuals over time.

**Users:** Erik and Debbie only. No multi-tenancy, no public access.

---

## Goals

- Replace the spreadsheet with a maintainable, extensible system
- Visualize the financial timeline clearly
- Track actual investment balances over time alongside projections
- Eventually integrate with external APIs (financial data, brokerage accounts) and parse documents (tax returns, statements)
- Full undo/redo on all parameter changes
- Events system for what-if scenario planning (future phase)
- Long-term: zero or near-zero operational burden

---

## Architecture

- **Hosting:** Hetzner VPS CAX11 (~$4/month)
- **Web server:** Caddy (reverse proxy, SSL via Let's Encrypt)
- **Frontend:** React + Redux, redux-undo, Recharts
- **API:** FastAPI (Python)
- **Persistence:** SQLite (all data), nightly backup to Cloudflare R2
- **DNS:** Cloudflare

---

## Parameters

All inputs that drive timeline computation. Stored in SQLite, full change history preserved.

### People
| Parameter | Value | Notes |
|---|---|---|
| Erik DOB | 12/27/1956 | |
| Debbie DOB | 10/18/1961 | |
| Erik SS start age | 70 | |
| Debbie SS start age | 70 | |
| End of game year | 2055 | Erik 99, Debbie 94 |

### Economic Assumptions
| Parameter | Value | Notes |
|---|---|---|
| General inflation | 2.5% | 3% recommended |
| Real estate appreciation | 5% | Case-Shiller = 4.8% |
| Investment ROI | 7.5% | Net of 1% load (threebell) |
| SS COLA | 2.5% | Follows general inflation |

### Taxes (Washington State — no income/SS tax)
| Parameter | Value |
|---|---|
| SS federal tax rate | 16% |
| Draw federal tax rate | 16% |

### Social Security
| Parameter | Erik | Debbie |
|---|---|---|
| Monthly benefit at 70 | $5,215 | $5,392 |
| Years until start | ~0.8 | ~5.6 |

### Healthcare (per person, Kaiser Medicare Advantage)
| Component | Min/yr | Max/yr |
|---|---|---|
| Part B | $4,440 | $4,440 |
| Kaiser Advantage OOP | $0 | $5,300 |
| Part D prescriptions | $200 | $2,000 |
| Kaiser dental/vision | $528 | $5,828 |

- **Scenario slider:** 0% (best case) → 100% (worst case), interpolates between min and max OOP
- Current assumption: 45% → $21,276/yr for couple
- Healthcare inflation: 6%/yr
- Note: Debbie currently on ACA, transitioning to Medicare shortly

### Allowance
- $3,000/month each ($72,000/yr combined)
- Deflation: 1%/yr (reduced needs with age)

### Cars
- $60,000 per car, 10-year lifetime → $6,000/yr capital cost each
- Insurance: $1,200/yr each
- Registration: $300/yr each
- Maintenance: $1,500/yr each
- **Total: $18,000/yr for two cars**

### Dogs
- Insurance, food, vet, grooming, boarding, teeth cleaning
- **Total: $16,389/yr, inflated annually**

### Travel
- $36,000/yr shared (personal travel in allowance)
- Inflated annually

### Living Expenses
- Streaming, phones, entertainment, food & drink, misc
- **Total: $33,619/yr, inflated annually**

### Properties

**Portland**
- Current market value: $950,000
- Mortgage: 2.75%, 30yr from Nov 2020, matures Oct 2050
- P&I: $1,235/month ($14,820/yr)
- Services: $16,086/yr
- Property tax: $14,968/yr
- Insurance: $1,039/yr
- **Total annual cost: $46,913**

**Orcas Island**
- Current market value: $2,000,000
- Mortgage: 3.125%, 30yr from May 2020, matures Apr 2050
- P&I: $2,186/month ($26,232/yr)
- Services: $10,040/yr (Starlink, HOA, electricity, water, cleaning, septic, pest, landscape, propane)
- Property tax: $12,038/yr
- Insurance: $1,016/yr
- **Total annual cost: $49,326**

### Long Term Care (LTC)
- Current entrance fee: $2,000,000 (100% refundable)
- Projected future entrance fee: $3,426,791
- Current monthly fee: $19,500
- Duration: 15 years

---

## Timeline Events

Discrete events that change the financial picture at a specific year. Future phase will allow what-if scenario planning by adjusting event years.

| Event | Year | Erik Age | Debbie Age |
|---|---|---|---|
| Buy Mezzanine property | 2027 | 71 | 66 |
| Erik SS starts | 2027 | 70 | 65 |
| Debbie SS starts | 2032 | 75 | 70 |
| Sell Mezzanine | 2035 | 79 | 74 |
| Sell Orcas | 2036 | 80 | 75 |
| Sell Portland | 2040 | 84 | 79 |
| Move to LTC | 2040 | 84 | 79 |
| End of game | 2055 | 99 | 94 |

---

## Data Model

### Timeline Table (SQLite)

One row per year, 2026–2062. Computed from parameters and events.

**Identity**
- year, years_in_retirement, erik_age, debbie_age

**Expenses**
- loans, health, dogs, cars, travel, living, allowance, orcas, portland, ltc, total_expenses

**Social Security**
- ss_erik, ss_debbie, ss_subtotal, ss_tax, ss_net

**Draw** (from investments)
- gross_draw, draw_tax, net_draw, draw_rate, capital_spend

**Investments**
- investment_balance, roi, invest_plus_re

**Wealth**
- real_estate, ltc_monthly, ltc_entrance

**Properties** (value / principal / equity for each)
- orcas_value, orcas_principal, orcas_equity
- portland_value, portland_principal, portland_equity

### Core Calculation
```
net_draw = total_expenses - ss_net
draw comes from investment_balance
investment_balance grows by ROI net of draw each year
```

### Actuals Table (SQLite)
Periodic snapshots of real investment balances over time.
- snapshot_date, investment_balance, notes

### Parameters Table (SQLite)
All parameters above, with change history (created_at, value, previous_value).

---

## UI

### Screens

**Dashboard**
- Key summary: current wealth, projected end wealth (nominal + real), draw rate
- Primary chart: investment balance over time (projected vs actual)

**Timeline**
- Year-by-year table
- Projected vs actual overlay

**Parameters**
- Edit all financial assumptions
- Full undo/redo via redux-undo
- Change history visible

**Actuals**
- Enter periodic investment balance snapshots
- Chart of actuals vs projection over time

### Visualization
- Stacked area/bar charts — expenses by category over time
- Investment balance trajectory — projected vs actual
- Income vs expenses over time
- Draw rate over time

---

## Repository Pattern

All persistence accessed through a typed interface:

```python
class FinancialStore:
    def get_parameters() -> Parameters
    def save_parameters(params: Parameters) -> None
    def get_timeline() -> list[TimelineRow]
    def save_timeline(rows: list[TimelineRow]) -> None
    def get_actuals() -> list[ActualSnapshot]
    def add_actual(snapshot: ActualSnapshot) -> None
```

SQLite implementation today. Portable to Postgres or other store without touching app code.

---

## Future Phases

- **Events system** — define events with year/age triggers, recompute timeline on change, what-if scenario planning
- **External API integrations** — brokerage account data, market data feeds
- **Document parsing** — tax returns, statements, PDF ingestion
- **Mezzanine property** — model third property purchase/sale in 2027/2035
- **ACA → Medicare transition** for Debbie

---

## Open Questions

- Exact subdomain/URL for the life planner
- Mezzanine property details (purchase price, mortgage, costs)
- How healthcare scenario slider interacts with healthcare inflation over time
- State tax tracking (noted in spreadsheet as not correctly handled for CA/OR)
- SS start time knob (noted in spreadsheet as desired feature)

---

## Out of Scope

- Multi-user / sharing beyond Erik and Debbie
- Mobile app
- Real-time data (polling is fine)
