---
title: "Cafe Rewards: Conversion Funnel & Retention Cohort Analysis"
description: "End-to-end EDA of Cafe Rewards offers, transactions, and customer cohorts — conversion funnel analysis, unaware completion detection, and retention cohort breakdown."
date: "2026-10-13"
author: "Robi Maulana"
tags: [data-science, eda, conversion-funnel, retention-cohort, cafe-rewards, customer-analytics]
thumbnail: "/images/cafe-rewards/funnel_per_offer.png"
---

# Cafe Rewards: Conversion Funnel & Retention Cohort Analysis

## 1. Introduction

One of the recurring tasks of a data analyst in retail and F&B is evaluating whether a rewards program actually works: are offers being completed, are rewards being paid to the right people, and is budget producing incremental behavior or subsidizing purchases customers would have made anyway?

This analysis evaluates 10 offers sent by a cafe loyalty program to 17,000 members over a 30-day period.

---

## 2. Dataset Description

Three tables from the Cafe Rewards dataset, documented in `data_dictionary.csv`.

### Tables

**`offers.csv`** — Catalog of 10 offers. Each has a unique ID, type (bogo, discount, informational), difficulty (minimum spend required, in dollars), reward (amount earned on completion), duration (days to complete), and marketing channels used.

**`customers.csv`** — Demographic data for 17,000 members: customer ID, join date, gender, age, and estimated annual income.

**`events.csv`** — 306,534 activity records. Each links a customer to an offer or transaction with a timestamp (hours since start of the 30-day period) and a `value` payload.

### Database figure

| Table | Rows | Cols |
|---|---|---|
| `offers.csv` | 10 | 6 |
| `customers.csv` | 17,000 | 5 |
| `events.csv` | 306,534 | 4 |

### Offer catalog

| offer_id (prefix) | type | difficulty $ | reward $ | duration days | channels |
|---|---|---|---|---|---|
| ae264e… | bogo | 10 | 10 | 7 | email, mobile, social |
| 4d5c57… | bogo | 10 | 10 | 5 | web, email, mobile, social |
| 9b98b8… | bogo | 5 | 5 | 7 | web, email, mobile |
| f19421… | bogo | 5 | 5 | 5 | web, email, mobile, social |
| 0b1e15… | discount | 20 | 5 | 10 | web, email |
| 2298d6… | discount | 7 | 3 | 7 | web, email, mobile, social |
| fafdcd… | discount | 10 | 2 | 10 | web, email, mobile, social |
| 2906b8… | discount | 10 | 2 | 7 | web, email, mobile |
| 3f207d… | informational | 0 | 0 | 4 | web, email, mobile |
| 5a8bc6… | informational | 0 | 0 | 3 | email, mobile, social |

---

## 3. Exploratory Data Analysis and Data Issues

### Data issue 1: Inconsistent JSON keys in `events.value`

The `value` column stores a stringified dict whose key names vary by event type:

| event | key(s) |
|---|---|
| `offer received`, `offer viewed` | `"offer id"` (space) |
| `offer completed` | `"offer_id"` (underscore) + `"reward"` |
| `transaction` | `"amount"` |

Fix: one `extract()` helper that probes both spellings:

```python
def extract(d, *keys):
    for k in keys:
        if k in d:
            return d[k]
    return None

events["offer_id"] = events["v"].apply(lambda d: extract(d, "offer_id", "offer id"))
events["amount"]   = events["v"].apply(lambda d: extract(d, "amount"))
events["reward_c"] = events["v"].apply(lambda d: extract(d, "reward"))
```

### Data issue 2: A 2,175-row masked block in `customers.csv`

Exactly 2,175 of 17,000 rows (12.8%) have `age=118`, `gender=NaN`, `income=NaN`. Age 118 is impossible (real range 18-101) — it is a deliberate missing-marker, not a real value. All 2,175 rows are masked together.

**Decision:** These members have real transactions and offer events, so I keep them in funnel, transaction, and tenure analyses but **exclude them from demographic segmentation**, reporting them as a separate "unknown" segment.

### Customer demographics (masked block excluded)

![Demographics](customer_demographic_distribution.png)

| Variable | Summary |
|---|---|
| gender | 8,484 M / 6,129 F / 212 O / 2,175 masked |
| age (clean) | mean 46.2, median 47, range 18-101 |
| income | mean $65,406, median $64,000, $6,700-$120,000 |
| became_member_on | 2013-07-29 → 2018-07-26 |

---

## 4. Goal of Analysis

### Problem
Optimize offer design and targeting to maximize completion and net value while minimizing reward budget spent on customers who would have purchased anyway.

### Questions
1. How does the conversion funnel compare across offer types, and what explains the differences?
2. How many completion rewards are paid to customers who never viewed the offer?
3. Does transaction behavior relate to offer completion?
4. Which demographic segments convert most effectively?
5. Does membership tenure relate to engagement?
6. Which offers generate the best net value per completion?

---

## 5. Process — Step by Step

**Step 1 — Parse and merge.** Parse `events.value` as dict; consolidate `offer_id` keys; dropna on offer_id before offer-level analysis (transaction events lack offer_id by design).

**Step 2 — Per-offer funnel.** Unique customer counts per stage per offer:

```python
funnel = ev.pivot_table(
    index="offer_id", columns="event", values="customer_id",
    aggfunc="nunique"
).fillna(0).astype(int)
```

**Step 3 — Unaware completions.** For each `offer completed` event, check whether the customer had an `offer viewed` event for the same offer_id. Completions with no prior view are flagged `unaware`.

**Step 4 — Reward accounting.** Total rewards paid per offer = sum of `reward` field in `offer completed` events × per-completion reward from offers table. Cost per completion = total rewards ÷ unique completers.

**Step 5 — Transactions.** Per-customer transaction count and amount during the offer window; correlate with completion rate.

**Step 6 — Tenure cohort.** Group members by `became_member_on` year; classify active = ≥1 transaction in 30 days.

**Step 7 — Demographic segmentation.** Income quartiles × gender × offer type, masked block reported separately.

---

## 6. Findings

### 6.1 Conversion funnel — all 10 offers

![Funnel](funnel_per_offer.png)

| offer_id (prefix) | type | diff | reward $ | dur | received | viewed | completed | view % | complete % |
|---|---|---|---|---|---|---|---|---|---|
| ae264e… | bogo | 10 | 10 | 7 | 6,374 | 5,696 | 3,177 | 89.4 | 49.8 |
| 4d5c57… | bogo | 10 | 10 | 5 | 6,330 | 6,132 | 2,885 | 96.9 | 45.6 |
| 9b98b8… | bogo | 5 | 5 | 7 | 6,355 | 3,658 | 3,784 | 57.6 | 59.5 |
| f19421… | bogo | 5 | 5 | 5 | 6,262 | 6,060 | 3,741 | 96.8 | 59.7 |
| 0b1e15… | discount | 20 | 5 | 10 | 6,374 | 2,400 | 2,978 | 37.7 | 46.7 |
| 2298d6… | discount | 7 | 3 | 7 | 6,325 | 6,122 | 4,421 | 96.8 | 69.9 |
| fafdcd… | discount | 10 | 2 | 10 | 6,332 | 6,150 | 4,530 | 97.1 | 71.5 |
| 2906b8… | discount | 10 | 2 | 7 | 6,285 | 3,608 | 3,480 | 57.4 | 55.4 |
| 3f207d… | informational | 0 | 0 | 4 | 6,331 | 3,635 | 0 | 57.4 | 0 |
| 5a8bc6… | informational | 0 | 0 | 3 | 6,320 | 5,674 | 0 | 89.8 | 0 |

**Aggregate:** 16,994 members received ≥1 offer; 12,774 (75.2%) completed ≥1. Total rewards paid: \$164,676. Average reward per completion: \$4.90.

**Key funnel findings:**
- View rate is a **channel-coverage problem**, not offer quality. Offers on all 4 channels reach ~97% view rate; `0b1e15` (web + email only) is 37.7%.
- Discounts complete more often than BOGOs at lower cost: 71.5% (discount, $2 reward) vs 49.8% (bogo, $10 reward).
- Informational offers view 57-90% but complete 0% by design.

### 6.2 Difficulty, type, and duration interaction

![Difficulty curve](difficulty_sensitivity_curve.png)

Difficulty alone is misleading. The interaction with type and duration matters:

- Difficulty 7-10 with discount type and 7-10 day duration → 55-72% completion
- Difficulty 10 with BOGO and 5-7 day duration → 46-50% completion
- Difficulty 20 → cliff to 47% regardless of type

The sweet spot is **difficulty 7-10 + discount + 7-10 day duration**.

### 6.3 Unaware completions: paying for behavior that already happened

![Unaware](unaware_completion_per_offer.png)

A completion event means the customer spent enough during the window — but did they actually *see* the offer? 15.6% of completions happened with no prior `offer viewed` event.

| Offer type | Unaware completions | % of completions |
|---|---|---|
| Discount | 2,744 | 12.1% |
| BOGO | 2,062 | 10.7% |
| **Total** | **4,536** | **15.6%** |

Offer `0b1e15` (discount, difficulty 20) is the worst offender: 51% of its completions are from customers who never viewed it. This is the clearest sign of **wasted reward budget** — paying rewards for purchases that happened organically.

### 6.4 Transaction behavior vs completion

![Transaction](transaction_amount_vs_completion.png)

| Statistic | Value |
|---|---|
| Mean transaction | \$12.78 |
| Median transaction | \$8.89 |
| Max transaction | \$1,062.28 |
| Transactions ≤ \$7.70 (avg difficulty) | 46.7% |

- Customers who complete offers transact more frequently: mean 9.3 transactions vs 5.5 for non-completers.
- Average transaction amount doesn't strongly predict individual completion (per-transaction ρ ≈ 0.13).
- **Frequency, not magnitude** is the stronger behavioral signal — consistent with offers rewarding repeat visitors.

### 6.5 Cost efficiency: completion rate vs reward cost

![Cost per completion](cost_per_completion.png)

| Offer type | Difficulty | Reward | Completion rate | Cost per completion |
|---|---|---|---|---|
| Discount $2 | 10 | 2 | 71.5% | \$0.74 |
| Discount $3 | 7 | 3 | 69.9% | \$0.88 |
| Discount $5 | 20 | 5 | 46.7% | \$5.70 |
| BOGO $5 | 5 | 5 | 59.5% | \$5.79 |
| BOGO $10 | 10 | 10 | 45.6-49.8% | \$11.50 |

Discount offers at \$2-\$3 reward are 7-15x more cost-efficient per completion than \$10 BOGOs, even when completion rates are similar.

### 6.6 Demographic segments (masked 2,175 excluded)

![Income quartile](income_quartile_completion.png)

#### By income quartile
| Income quartile | BOGO complete | Discount complete |
|---|---|---|
| <25th percentile | 41% | 52% |
| 25-50th | 56% | 64% |
| 50-75th | 66% | 71% |
| ≥75th | 77% | 81% |

Completion rises monotonically with income — the gap is 36pp for BOGO, 29pp for discount.

#### Gender within income (disentangled)
When we hold income constant, the gender gap shrinks but persists:

| Gender | Income <25th | Income ≥75th |
|---|---|---|
| Female | 55% | **78%** |
| Male | 35% | **67%** |
| Other | 51% | **75%** |

The ~5-10pp gender gap is **partly driven by income** (women have higher median income in this dataset), but a residual gap (~5pp) remains even within income bands, suggesting a genuine behavioral difference.

#### Unknown demographics segment
2,175 members (12.8%) have masked age/gender/income. Their completion rate is 12-21% — dramatically lower than any known segment. They consume offers at the same rate but convert poorly.

### 6.7 Retention cohort (by join year)

![Retention cohort](cohort_retention_curve.png)

| Join year | Active rate | Completion rate |
|---|---|---|
| 2017-2018 (newest) | 68% | 55% |
| 2015-2016 (mid) | 45% | 42% ← trough |
| 2013-2014 (oldest) | 65% | 48% |

- Newest members are most engaged (onboarding effect).
- The **2015-2016 cohort underperforms** both adjacent cohorts by ~20pp on activity — a retention leak worth investigating.
- This is cross-sectional (one 30-day window); it cannot show retention decay over time.

---

## 7. Recommendations

1. **Send every offer on all four channels.** `0b1e15` (discount, difficulty 20) is viewed by only 37.7% — adding missing channels is a free completion boost.

2. **Route by income segment.** Top-quartile income customers complete 77-81%; bottom quartile completes 41-52%. Use low-difficulty discounts for lower-income segments.

3. **Target high-frequency transactors.** Customers with ≥4 transactions during offer window complete 19pp more often. Micro-spenders can be re-targeted with lower-difficulty offers.

4. **Deprioritize \$10 BOGOs.** They cost \$11.50 per completion against \$0.74-\$0.88 for \$2-\$3 discounts. Keep only if basket-size lift justifies the 15x cost premium.

5. **Suppress reward offers for unaware-prone customers.** 15.6% of completions go to customers who never viewed the offer — implement a spend-threshold filter (if customer spent ≥ difficulty organically in past 30 days, skip the offer).

6. **Investigate the 2015-2016 cohort.** It lags both older (survivors) and newer (onboarding) cohorts by ~20pp — likely a data or product issue that warrants root-cause analysis.

---

## 8. Limitations

1. **No causal attribution.** We cannot prove the offer caused the purchase — only that spending occurred during the window. Net effect is a proxy, not true incremental ROI.
2. **No transaction-offer linkage.** Transaction events do not carry `offer_id`, so we cannot attribute specific transaction amounts to specific offers. Transaction analysis is at the customer level only.
3. **30-day window.** Cannot observe seasonality, repeat campaign effects, or retention decay over time.
4. **Self-selection bias.** Customers who view offers may differ systematically from those who don't.
5. **Income is estimated.** Described as "estimated annual income" — likely model-imputed, introducing measurement error at the strongest predictor variable.
6. **75% of offers have identical channel sets**, making it hard to isolate channel effects; difficulty, duration, and type are confounded across the 10 offers.
7. **Small sample for gender "O".** The third gender category (n≈212-303) is too small for robust conclusions.
