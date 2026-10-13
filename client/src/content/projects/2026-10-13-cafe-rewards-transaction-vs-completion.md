---
title: "Finding Transaction Value vs Offer Completion: A Study Case on Coffee Promotion"
description: "Analyzing how transaction amount, frequency, and timing correlate with offer completion in the Cafe Rewards dataset."
date: "2026-10-13"
author: "Robi Maulana"
tags: [data-science, eda, conversion-funnel, cafe-rewards, transaction-analysis]
thumbnail: "/images/cafe-rewards/transaction_value_vs_completion.png"
---

# Finding Transaction Value vs Offer Completion: A Study Case on Coffee Promotion

## 1. EDA — Dataset Description

### Source
Three tables from the Cafe Rewards loyalty program (coffee shop rewards), located at `D:/FREELANCING/Cafe Rewards Offers/`. A data dictionary file (`data_dictionary.csv`) documents each column.

### Database Figure
| Table | Rows | Cols | Role |
|---|---|---|---|
| `offers.csv` | 10 | 6 | Offer catalog (look-up table) |
| `customers.csv` | 17,000 | 5 | Member demographics |
| `events.csv` | 306,534 | 4 | Activity log |
| `data_dictionary.csv` | 19 | 3 | Column descriptions |

### What each table is about
- **`offers.csv`**: Catalog of 10 offers with offer type (bogo/discount/informational), difficulty, reward, duration, and channels.
- **`customers.csv`**: Demographic data for 17,000 members (gender, age, income, join date).
- **`events.csv`**: 306,534 activity records — transactions, offer received/viewed/completed. Each has a stringified-dict `value` column.

### Column descriptions

**`events.csv`**
| Column | Type | Description |
|---|---|---|
| customer_id | string | Member who triggered the event |
| event | string | transaction / offer received / offer viewed / offer completed |
| value | string | Stringified dict — keys vary by event type |
| time | int | Hours since start of 30-day window (0-714) |

### Key data quirk: inconsistent JSON keys in `value`
- `offer received` / `offer viewed` → key `"offer id"` (with space)
- `offer completed` → `"offer_id"` (underscore) + `reward`
- `transaction` → `"amount"` **only** — no offer linkage

This means transactions cannot be directly tied to a specific offer, but we **can** analyze transaction behavior at the **customer level** and compare it to whether that customer ever completes any offer.

### Customer demographics (after masking age=118, which is a deliberate missing-marker)
| Variable | Summary |
|---|---|
| gender | 8,484 M / 6,129 F / 212 O / 2,175 masked |
| age | Mean 46.2, median 47, range 18-101 |
| income | Mean \$65,406, median \$64,000, \$6,700-\$120,000 |
| became_member_on | 2013-07-29 → 2018-07-26 |

---

## 2. Goal of Analysis

### Problem
Cafe Rewards wants to understand whether transaction value (amount, frequency, timing) is predictive of offer completion — and if so, what spending behaviors characterize customers who actually complete offers.

### Questions to answer
1. Do customers who complete offers spend more per transaction?
2. Do they transact more frequently?
3. Is there an hourly pattern — do completions correlate with when people transact?
4. How strong is the overall correlation between spending and completion likelihood?

### Goals
- Quantify spending behavior differences between completion-prone and inactive-completers
- Compute correlation strength for targeting model features
- Surface actionable segments for offer personalization

---

## 3. Process — Step by Step

### Step 1: Identify completion-prone customers
```python
ev = events.dropna(subset=["offer_id"])
cust_completed = set(ev[ev["event"]=="offer completed"]["customer_id"])
```
→ 12,774 customers (75.1%) ever completed ≥1 offer.

### Step 2: Extract all transaction records (no offer linkage possible)
```python
txn_all = events[events["event"]=="transaction"].copy()
txn_all["amount"] = pd.to_numeric(txn_all["amount"])
txn_all["comp_binary"] = txn_all["customer_id"].isin(cust_completed).astype(int)
```

### Step 3: Aggregate per customer
```python
spend = txn_all.groupby(["customer_id","group"])["amount"].sum()
avg_txn = txn_all.groupby(["customer_id","group"])["amount"].mean()
n_txn = txn_all.groupby(["customer_id","group"]).size()
```

### Step 4: Visualise & correlate
Four-panel chart + Pearson correlation via `scipy.stats.pointbiserialr`.

```python
r, p = pointbiserialr(df["comp_binary"], df["amount"])
```

---

## 4. Findings

![Transaction vs completion](transaction_value_vs_completion.png)

### 4.1 Correlations (completion vs spending metrics)

| Metric | Correlation (r) |
|---|---|
| Per-customer total spend | **0.376** |
| Per-customer avg txn amount | 0.313 |
| Per-customer txn count | 0.318 |
| Individual txn amount | 0.126 |

Moderate correlation (r≈0.38) confirms that **cumulative lifetime spending**, not a single large transaction, is the strongest spending-related predictor of offer completion.

### 4.2 Spending gap between segments

| Metric | Completion-prone | No completion | Ratio |
|---|---|---|---|
| Total spend / customer | \$133.0 (median \$105) | \$20.0 (median \$13) | **5.8×** |
| Avg txn amount | \$16.42 | \$4.48 | **3.7×** |
| # transactions / customer | 9.3 | 5.5 | 1.7× |

Completion-prone customers spend nearly 6× more in total, transact 1.7× more often, and have 3.7× larger average transaction sizes.

### 4.3 Hourly pattern
The hourly P(ever-completed | transaction at hour) chart shows a **baseline around 75%** throughout the 30-day window — no strong U-curve or spike at specific hours. This suggests offer completion is driven more by **who** transacts (a customer-level trait) than by **when** they transact.

---

## 5. Recommendations

1. **Segment by spend tier**: prioritize high-frequency, high-avg-txn customers (>\$10 avg txn) for offer completion — they convert ~5-6× more reliably.
2. **Don't chase big-spenders only**: individual txn size matters (r=0.13) but cumulative spend does more (r=0.38) — a customer with 8 × \$6 txns beats one with 1 × \$48 txn.
3. **Timing is secondary**: since hourly patterns are flat, schedule offers based on channel reachability (email vs push) rather than trying to micro-optimize send time.

---

## 6. Limitations

1. **No transaction-offer linkage**: transaction events do not carry `offer_id`, so we cannot attribute a specific transaction to a specific offer. All analysis is at the **customer level**, not per-offer.
2. **Correlation, not causation**: high spend precedes/matches completion, but does not prove that completing offers causes more spending (or vice versa).
3. **Self-selection bias**: customers who complete offers are inherently more engaged, so spending differences may reflect engagement rather than offer design.
4. **30-day window**: all data is confined to one 30-day period — no seasonality or long-term behavior patterns.
5. **306,534 transactions** span only 17,000 customers (~9 transactions each), so very low-frequency customers are under-represented.
