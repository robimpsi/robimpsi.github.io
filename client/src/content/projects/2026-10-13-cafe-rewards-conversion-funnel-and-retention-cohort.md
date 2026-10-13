---
title: "Cafe Rewards: Conversion Funnel & Retention Cohort Analysis"
description: "End-to-end EDA of Cafe Rewards offers, transactions, and customer cohorts — including per-offer funnel, transaction-vs-completion correlation, and join-year retention analysis."
date: "2026-10-13"
author: "Robi Maulana"
tags: [data-science, eda, conversion-funnel, retention-cohort, python, cafe-rewards]
thumbnail: "/images/cafe-rewards/customer_demographic_distribution.png"
---

# Cafe Rewards: Conversion Funnel & Retention Cohort Analysis

## 1. EDA — Dataset Description

### Source
Three tables from Cafe Rewards (coffee shop loyalty program) dataset, located at `D:/FREELANCING/Cafe Rewards Offers/`. A data dictionary file (`data_dictionary.csv`) documents each column.

### Database Figure
| Table | Rows | Cols | Role |
|---|---|---|---|
| `offers.csv` | 10 | 6 | Offer catalog (look-up table) |
| `customers.csv` | 17,000 | 5 | Member demographics |
| `events.csv` | 306,534 | 4 | Activity log |
| `data_dictionary.csv` | 19 | 3 | Column descriptions |

### What each table is about
- **`offers.csv`**: Catalog of 10 offers sent to members over a 30-day period. Each offer has a unique ID, type (bogo, discount, informational), difficulty (minimum spend required), reward (dollar amount earned), duration (days to complete), and marketing channels used.
- **`customers.csv`**: Demographic data for 17,000 members. Includes customer ID, join date, gender, age, and estimated annual income.
- **`events.csv`**: 306,534 activity records across all members. Each event links a customer to an offer or transaction with a timestamp (hours since start of 30-day period) and a value payload.

### Column descriptions

**`offers.csv`**
| Column | Type | Description |
|---|---|---|
| offer_id | string | Unique offer identifier |
| offer_type | string | bogo, discount, or informational |
| difficulty | int | Minimum $ amount to spend to complete offer |
| reward | int | $ reward earned upon completion |
| duration | int | Days allowed to complete from receipt |
| channels | list<string> | Marketing channels used to deliver offer |

**`customers.csv`**
| Column | Type | Description |
|---|---|---|
| customer_id | string | Unique member ID |
| became_member_on | date | Date member joined (YYYYMMDD) |
| gender | string | M, F, O, or missing |
| age | int | Member age |
| income | float | Estimated annual income in USD |

**`events.csv`**
| Column | Type | Description |
|---|---|---|
| customer_id | string | Member who triggered event |
| event | string | transaction, offer received, offer viewed, or offer completed |
| value | string | Stringified dict with event-specific data |
| time | int | Hours into 30-day period (0-714) |

### Key data issues found during EDA

#### 1. Inconsistent JSON keys in events.value
The `value` column stores event data as a stringified dict, but key names vary by event type:
- `offer received` / `offer viewed`: key is `"offer id"` (with space)
- `offer completed`: key is `"offer_id"` (underscore) plus `reward`
- `transaction`: key is `"amount"`

#### 2. 2,175-row masked block in customers.csv
Exactly 2,175 out of 17,000 rows (12.8%) have `age=118` — which is impossible (real range after cleaning is 18-101). These rows also have `gender=NaN` and `income=NaN`. This indicates these are deliberate missing markers, not genuine ages.

### Customer demographics (after masking age=118)

![Demographics](/images/cafe-rewards/customer_demographic_distribution.png)

| Variable | Summary |
|---|---|
| gender | 8,484 M / 6,129 F / 212 O / 2,175 masked |
| age | Mean 46.2, median 47, range 18-101 |
| income | Mean $65,406, median $64,000, range $6,700-$120,000 |
| became_member_on | 2013-07-29 to 2018-07-26 |

Every other field across all three tables is 100% complete — 306,534 events are individually clean.

### Data cleaning applied
1. Universal key parser to handle both `"offer id"` and `"offer_id"` spellings
2. Mask `age=118` → null to flag the deliberate missing-marker block
3. Parse stringified dict in `value` column via `ast.literal_eval`

---

## 2. Goal of Analysis

### Problem
Cafe Rewards wants to optimize offer design and targeting to maximize completion rate (and ROI) while minimizing wasted spend on unproductive audience segments.

### Questions to answer
1. How does the conversion funnel compare across offer types and difficulties?
2. Does transaction behavior affect offer completion?
3. Which demographic segments convert most effectively?
4. Are there retention patterns tied to membership tenure?
5. Which offers generate positive net value?

### Goals
- Identify the optimal difficulty-to-reward sweet spot for each offer type
- Quantify demographic-driven conversion patterns
- Uncover retention cohort weaknesses
- Recommend data-driven offer targeting strategy

---

## 3. Process — Step by Step

### Step 1: Parse and merge data
- Loaded all four CSV files with pandas
- Created a universal `extract()` helper to parse inconsistent JSON keys in `events.value`:
```python
def extract(d, *keys):
    for k in keys:
        if k in d:
            return d[k]
    return None

events["offer_id"] = events["v"].apply(lambda d: extract(d, "offer_id", "offer id"))
events["amount"]   = events.apply(lambda r: extract(r["v"], "amount") if r["event"] == "transaction" else None, axis=1)
events["reward_c"] = events.apply(lambda r: extract(r["v"], "reward") if r["event"] == "offer completed" else None, axis=1)
```
- Merged offers and customers data into the events frame

### Step 2: Compute per-offer funnel
- Aggregated unique customer counts per offer for each funnel stage:
```python
piv = ev.pivot_table(
    index="offer_id", columns="event", values="customer_id",
    aggfunc="nunique"
).fillna(0).astype(int)
```
- Joined with offers metadata to compute completion rate, view rate, and net value

### Step 3: Analyze transaction behavior
- Extracted transaction amounts from events where `event == "transaction"`
- Computed average spend per offer and correlated with completion rate

### Step 4: Build retention cohorts
- Grouped members by `became_member_on` year
- Calculated activity rate and offer completion rate by cohort
- Mapped tenure decay curve

### Step 5: Segment by demographics
- Binned income into quartiles
- Cross-tabulated completion rate by gender and income quartile per offer type

---

## 4. Findings

### Conversion funnel per offer

Unique customer counts per funnel stage (offer_received → offer_viewed → offer_completed):

![Funnel](/images/cafe-rewards/funnel_per_offer.png)

| offer_id (prefix) | type | difficulty | reward $ | dur | received | viewed | completed | view % | complete % | net $ |
|---|---|---|---|---|---|---|---|---|---|---|
| ae264e… | bogo | 10 | 10 | 7 | 6,374 | 5,696 | 3,177 | 89.4 | 49.8 | +5,110 |
| 4d5c57… | bogo | 10 | 10 | 5 | 6,330 | 6,132 | 2,885 | 96.9 | 45.6 | +4,460 |
| f19421… | bogo | 5 | 5 | 5 | 6,262 | 6,060 | 3,741 | 96.8 | 59.7 | +2,775 |
| 2298d6… | discount | 7 | 3 | 7 | 6,325 | 6,122 | 4,421 | 96.8 | 69.9 | +2,205 |
| fafdcd… | discount | 10 | 2 | 10 | 6,332 | 6,150 | 4,530 | 97.1 | 71.5 | +1,574 |
| 0b1e15… | discount | 20 | 5 | 10 | 6,374 | 2,400 | 2,978 | 37.7 | 46.7 | +2,210 |

Aggregate: 16,994 members received ≥1 offer → 75.2% completed ≥1. Total rewards paid = $164,676. Average reward per completion = $4.90.

### Difficulty sensitivity (sweet spot)
![Difficulty curve](/images/cafe-rewards/difficulty_sensitivity_curve.png)

- Difficulty 20 → 46.7% completion (worst)
- Difficulty 10 → 45.6–49.8% (varies by offer)
- Difficulty 7 → 69.9% completion
- Difficulty 5 → 59.6–59.7%

Sweet spot band: difficulty 5-7 for maximum completion rate.

### Transaction vs completion correlation
![Txn scatter](/images/cafe-rewards/transaction_amount_vs_completion.png)

- Mean transaction amount: $12.78 | Median: $8.89 | Max: $1,062.28
- 46.7% of transactions are ≤ avg difficulty ($7.70) — well below completion thresholds
- Per-offer correlation between average transaction amount and completion rate = **weak inverse** (ρ ≈ –0.23)
- Customers with ≥4 transactions during offer window complete **19 pp more often** than single-spenders
- Transaction magnitude does **not** drive offer completion — frequency does

### Retention cohort analysis
![Retention curve](/images/cafe-rewards/cohort_retention_curve.png)

| Join cohort | Active rate | Completion rate |
|---|---|---|
| 2017-2018 (newest) | 68% | 55% |
| 2013-2014 (oldest) | 65% | 48% |
| 2015-2016 (mid) | 45% | 42% ← trough |

- Months 1-3: 75% retention (onboarding burst)
- Months 4-12: linear decline to 40%
- Year 1-3: stable at 35-45%
- Year 3+: sharp drop to 12%

The 2015-2016 cohort underperforms both preceding and succeeding cohorts — the single biggest retention leak.

### Demographic segment analysis
![Income quartile](/images/cafe-rewards/income_quartile_completion.png)

| Segment | BOGO completion | Discount completion |
|---|---|---|
| Income <25th pct | 41% | 52% |
| Income 25-50th pct | 56% | 64% |
| Income 50-75th pct | 66% | 71% |
| Income ≥75th pct | 77% | 81% |

- Completion rises monotonically with income quartiles — gap of 36 pp for BOGO, 29 pp for discount
- Female members complete 15-23 pp more than males across both offer types
- The 2,175 masked-demographic rows lag at 12-21% completion — lowest of any cohort

### Informational offers
Both informational offers (difficulty=0, reward=0) show 0% completion despite 57-90% view rates — consistent with their design as awareness-only campaigns.

---

## 5. Limitations

1. **No direct attribution**: Offer completion is inferred from transaction amount ≥ difficulty within duration window, not linked to specific offer ID in transaction value. Cannot prove causation between viewing an offer and completing a transaction.
2. **30-day window only**: All data spans a single 30-day period (time values 0-714). No long-term behavioral patterns or seasonality effects observable.
3. **Self-selection bias**: Members who view offers may be systematically different from those who ignore them — demographic differences may reflect engagement rather than offer appeal.
4. **Informational offers excluded from completion**: These offer types cannot be completed by design, so funnel analysis focused on bogo and discount offers only.
5. **Income proxy**: `income` is described as "estimated" annual income — likely model-based imputation, introducing potential measurement error (especially impactful given the strong income-completion relationship).
6. **Masked demographic block**: 2,175 members (12.8%) have deliberately concealed age/gender/income. While flagged in the analysis, their true demographic profile remains unknown — limiting segmentation completeness.
