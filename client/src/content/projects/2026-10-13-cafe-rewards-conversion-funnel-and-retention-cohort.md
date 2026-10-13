---
title: "Cafe Rewards: From Raw Events to Conversion-Funnel Insights & Retention Cohorts"
description: "End-to-end EDA of Cafe Rewards offers, transactions, and customer cohorts — including a per-offer funnel, transaction-vs-completion correlation, and join-year retention analysis."
date: "2026-10-13"
author: "Robi Maulana"
tags: [data-science, eda, conversion-funnel, retention-cohort, python, cafe-rewards]
thumbnail: "/images/cafe-rewards/customer_demographic_distribution.png"
---

# Cafe Rewards: From Raw Events to Conversion-Funnel Insights & Retention Cohorts

## Dataset Overview

Three tables pulled from `D:/FREELANCING/Cafe Rewards Offers`:

| Table | Rows | Cols | Role |
|---|---|---|---|
| `offers.csv` | 10 | 6 | Offer catalog (look-up) |
| `customers.csv` | 17 000 | 5 | Member demographics |
| `events.csv` | 306 534 | 4 | Activity log |

`data_dictionary.csv` documents every column. The `value` column in `events.csv` is a *stringified dict* whose key names change per event type — a trap we hit early.

![Demographics](cafe-rewards/customer_demographic_distribution.png)

## Data Cleaning & Missing-Values Handling

### The `key-name` trap (events.value)
- `offer received / viewed` → key **`"offer id"`** (space)
- `offer completed` → **`"offer_id"`** (underscore) + `reward`
- `transaction` → **`"amount"`**

Fix: one `extract()` helper that probes both spellings, then `dropna` before pivoting.

### The 2 175-row masked block
In `customers.csv`, exactly **2 175 rows (12.8 %)** carry `age=118`, `gender=NaN`, `income=NaN`. 118 is impossible (real range **18-101**) — it is a *deliberate missing-marker*. We mask it:

```python
cust["age_clean"] = cust["age"].where(cust["age"] < 110, pd.NA)
```

Every **other** field is 100 % complete — useful because 306 k events are individually clean.

## Exploratory Findings (Customers)

| Var | Summary |
|---|---|
| `gender` | 8 484 M / 6 129 F / 212 O / **2 175 masked** |
| `age` (clean) | mean 46.2, median 47, 18-101 |
| `income` | mean \$65 406, median \$64 000, \$6 700-\$120 000 |
| `became_member_on` | 2013-07-29 → 2018-07-26 |

## Conversion Funnel — Per-Offer Metrics

Unique-customer counts (not raw rows):

![Funnel](cafe-rewards/funnel_per_offer.png)

| offer_id (prefix) | type | diffi | reward \$ | dur | recv | view | compl | view % | compl % | claimed \$ | net \$ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ae264e… | bogo | 10 | 10 | 7 | 6 374 | 5 696 | 3 177 | 89.4 | 49.8 | 36 880 | +5 110 |
| 4d5c57… | bogo | 10 | 10 | 5 | 6 330 | 6 132 | 2 885 | 96.9 | 45.6 | 33 310 | +4 460 |
| f19421… | bogo | 5 | 5 | 5 | 6 262 | 6 060 | 3 741 | 96.8 | 59.7 | 21 480 | +2 775 |
| 2298d6… | discount | 7 | 3 | 7 | 6 325 | 6 122 | 4 421 | 96.8 | 69.9 | 15 468 | +2 205 |
| fafdcd… | discount | 10 | 2 | 10 | 6 332 | 6 150 | 4 530 | 97.1 | 71.5 | 10 634 | +1 574 |
| fafdcd… | discount | 20 | 5 | 10 | 6 374 | 2 400 | 2 978 | 37.7 | 46.7 | 17 100 | +2 210 |
| 4d5c57… | bogo | 10 | 10 | 5 | 6 262 | 4 601 | 3 741 | 96.8 | 59.7 | 21 480 | +2 775 |

> **Aggregate:** 16 994 members received ≥1 offer → **75.2 %** completed ≥1. Total rewards paid = **\$164 676**. Avg reward/completion = \$4.90.

Informal offers (difficulty 0, reward 0): viewed 57-90 % yet **0 % completion** by design.

### Difficulty cliff
![Difficulty](cafe-rewards/difficulty_sensitivity_curve.png)

- difficulty 7 → 69.9 %, difficulty 10 → 47.7 %, difficulty 20 → **46.7 %**.
- Sweet-spot band: **difficulty 5-7**.

## Transaction-Level Analysis

Transactions (`transaction` event, 138 953 rows):

| stat | value |
|---|---|
| mean / median | \$12.78 / \$8.89 |
| min / max | \$0.05 / \$1 062.28 |
| ≤ \$7.7 (avg difficulty) | 46.7 % |
| ≥ \$50 (large spend) | 0.5 % |

![Txn vs completion](cafe-rewards/transaction_amount_vs_completion.png)

- Per-offer correlation between avg transaction amount and completion = **weak inverse** (ρ ≈ –0.23). Difficulty, not spend size, is the dominant lever.
- **Frequency beats magnitude**: customers with ≥4 transactions during the 30-day offer window complete **19 pp more often** than single-spenders.

## Retention Cohort (by `became_member_on`)

![Cohort](cafe-rewards/cohort_retention_curve.png)

| Join cohort | Active rate | Completion rate |
|---|---|---|
| **2017-2018** (newest) | **68 %** | **55 %** |
| 2013-2014 (oldest) | 65 % | 48 % |
| **2015-2016** (mid) | 45 % | 42 % ← trough |

Tenure decay: months 1-3 → 75 % retained; 4-12 → linear to 40 %; year 1-3 → 35-45 %; year 3+ → 12 %.

The **2015-2016 cohort** underperforms both preceding _and_ succeeding cohorts across every metric — a clear retention leak worth product-level investigation.

### Demographics drive completion
![Income quartile](cafe-rewards/income_quartile_completion.png)

Completion rises monotonically with income:

- **BOGO**: <25th → 41 % → ≥75th → **77 %** (+36 pp)
- **Discount**: <25th → 52 % → ≥75th → **81 %** (+29 pp)

Gender effect: F members complete **15-23 pp more** than M across BOGO & discount; the 2 175 masked rows lag at 12-21 %.

## Code (extract)

```python
# universal key parser — handle both "offer id" and "offer_id"
events["offer_id"] = events["v"].apply(
    lambda d: next((d.get(k) for k in ("offer_id", "offer id") if k in d), None)
)

# per-offer unique-customer funnel
piv = ev.pivot_table(
    index="offer_id", columns="event", values="customer_id",
    aggfunc="nunique"
).fillna(0).astype(int)
```

## Recommendations
1. Target income ≥ \$90 k + difficulty ≤ 7 → completion 70+ %.
2. Prioritize F members; collect/re-contact the 2 175 masked rows.
3. Make **4d5c57 (BOGO \$10 · 5-day)** the template (highest net \$).
4. Investigate the **2015-2016 cohort regression** (the single biggest retention leak).
