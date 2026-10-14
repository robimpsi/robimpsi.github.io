---
title: "The Four Operators and 1,388 Lost Minutes: A Manufacturing Downtime Story"
description: "Analyzing manufacturing line downtime across products, operators, and downtime factors to find where production time really goes."
date: "2026-10-14"
author: "Robi Maulana"
tags: [data-science, eda, manufacturing, downtime, python]
thumbnail: "/images/manufacturing/downtime_by_operator.png"
---

# The Four Operators and 1,388 Lost Minutes: A Manufacturing Downtime Story

## 1. Opening the logbook

Every factory has one: the downtime logbook. The one nobody likes, but everybody fills. Every time the line stops -- an emergency stop, a jammed conveyor, a spilled batch -- someone writes it down.

In this story, the logbook belongs to a beverage bottling line. It covers 38 batches over five production days, and it records exactly where 1,388 minutes of production time went. That is 23 hours of a line standing still.

The question I wanted to answer was simple: who and what ate those 1,388 minutes? Because if you can answer that, you know where training, maintenance, and inventory fixes will pay off first.

## 2. The data behind the story

The dataset comes from a manufacturing line productivity workbook with four sheets:

| Sheet | Rows | Role |
|---|---|---|
| Line productivity | 38 | One row per batch: date, product, batch ID, operator, start/end time |
| Products | 6 | Product catalog: flavor, size, minimum batch time |
| Downtime factors | 12 | Factor catalog: description + whether it is an operator error |
| Line downtime | 35 | Downtime minutes per batch across 12 factor columns |

### The dirty secret of the downtime sheet

The `Line downtime` sheet looks innocent until you open it. Row 1 is a label row, row 2 is the real header (`Batch`, then factor IDs `1`..`12`), and each subsequent row has minutes scattered across factor columns. When pandas reads it, you get `Unnamed` columns everywhere.

The fix is a two-line reshape:

```python
dt = dt_raw.iloc[2:].copy()
dt.columns = ["Batch"] + [f"F{i}" for i in range(1, 13)]
```

Twelve factor columns map to descriptions through the `Downtime factors` sheet -- and six of them are marked as operator error: batch change, product spill, machine adjustment, batch coding error, calibration error, and label switch.

### Column dictionary

**Line productivity**: Date (batch date), Product (product ID), Batch (unique batch ID), Operator (line operator), Start/End Time (production window).

**Products**: Product (ID), Flavor (orange/lemon-lime/cola/root beer/diet cola), Size (600 ml or 2 L), Min batch time (minutes with no downtime).

**Downtime factors**: Factor (ID 1-12), Description, Operator Error (Yes/No).

**Line downtime**: Batch (FK), then 12 columns of downtime minutes per factor.

## 3. The goal

Management wanted three facts:

1. Which products and batches were hit by downtime?
2. Which operator caused the most errors?
3. Which operator accumulated the longest total downtime?

## 4. How I worked through it

**Step 1 - Reshape downtime.** Read the downtime sheet with `header=None`, take rows from index 2, and assign factor columns manually.

**Step 2 - Compute total downtime per batch.** Each batch's total is the row sum across all 12 factor columns:

```python
dt["total_downtime_min"] = dt.iloc[:, 1:].sum(axis=1)
```

**Step 3 - Join the story together.** Merge operator and product onto each batch via the `Line productivity` sheet, then attach product details from `Products`.

**Step 4 - Split operator error vs everything else.** Sum the six operator-error factor columns separately, so every operator's downtime has two components: their errors and process/machine noise.

**Step 5 - Daily view.** Group downtime by date to see how the week unfolded.

## 5. Finding 1: Every product bleeds, but Cola bleeds most

All six products lost production time across 35 of 38 batches. The damage is not spread evenly:

| Product | Flavor | Batches hit | Total downtime | Avg per batch |
|---|---|---|---|---|
| CO-600 | Cola | 14 | 494 min | 35 min |
| CO-2L | Cola (2L) | 5 | 277 min | 55 min |
| RB-600 | Root beer | 7 | 258 min | 37 min |
| LE-600 | Lemon-lime | 5 | 169 min | 34 min |
| DC-600 | Diet cola | 3 | 115 min | 38 min |
| OR-600 | Orange | 1 | 75 min | 75 min |

The Cola line (CO-600) eats 494 minutes across 14 batches -- one third of all downtime. But look at the two extremes: CO-2L loses 55 minutes per batch on average, and the single OR-600 batch lost 75 minutes. Small-batch products are paying a hefty per-batch price, which makes sense: a 2-liter format is heavier and slower to change over, and the orange batch likely hit a changeover from a different setup.

![Downtime by product](/images/manufacturing/downtime_by_product.png)

## 6. Finding 2: The factor breakdown -- machines and people share the blame

Ranking the 12 factors by total minutes tells a clear story:

| Factor | Operator error? | Minutes | Share | Batches |
|---|---|---|---|---|
| Machine adjustment | Yes | 332 | 23.9% | 12 |
| Machine failure | No | 254 | 18.3% | 11 |
| Inventory shortage | No | 225 | 16.2% | 9 |
| Batch change | Yes | 160 | 11.5% | 5 |
| Batch coding error | Yes | 145 | 10.4% | 6 |
| Other | No | 74 | 5.3% | 6 |
| Product spill | Yes | 57 | 4.1% | 3 |
| Calibration error | Yes | 49 | 3.5% | 3 |
| Labeling error | No | 42 | 3.0% | 2 |
| Label switch | Yes | 33 | 2.4% | 3 |
| Conveyor belt jam | No | 17 | 1.2% | 1 |

![Downtime by factor](/images/manufacturing/downtime_by_factor.png)

The headline number: **55.9% of all downtime (776 minutes) is attributed to operator-error factors**. The single biggest factor, machine adjustment (332 min), is operator-classified. That is not a machine problem wearing a human name -- it is a setup/calibration problem that operators own.

The non-operator side is concentrated too: machine failure (254 min) plus inventory shortage (225 min) together account for another third. So the fix list is short: adjust the adjustment procedure, harden the failure-prone machine, and keep more inventory on hand.

## 7. Finding 3: Meet the operators -- Charlie is the story

Four operators ran the line: Charlie, Dee, Dennis, and Mac. Here is the ledger:

| Operator | Total downtime | Share of all | Operator-error minutes | Error share of own time |
|---|---|---|---|---|
| Charlie | 384 min | 27.7% | 228 min | 59% |
| Dee | 370 min | 26.7% | 192 min | 52% |
| Mac | 332 min | 23.9% | 192 min | 58% |
| Dennis | 302 min | 21.8% | 164 min | 54% |

![Downtime by operator](/images/manufacturing/downtime_by_operator.png)

Charlie leads on both counts: the longest total downtime (384 minutes) and the most operator-error minutes (228 minutes, 59% of his own total). Dee is right behind him at 370 total / 192 error.

One nuance: Mac has the highest minutes per batch (41.5) because he ran fewer batches (8) than Charlie and Dee (11 each). Per shift, Mac's line stops were the most costly.

And a pattern worth naming: every operator's downtime is majority operator-error -- the lowest share is Dee at 52%. This is not a one-bad-apple story; it is a whole-team operational standard that needs raising (or a standard procedure that needs fixing).

## 8. Finding 4: The week's shape -- Monday was brutal

![Downtime by date](/images/manufacturing/downtime_by_date.png)

| Date | Day | Batches | Downtime | Per batch |
|---|---|---|---|---|
| 2024-09-02 | Monday | 11 | 503 min | 45.7 min |
| 2024-08-30 | Friday | 12 | 444 min | 37.0 min |
| 2024-08-29 | Thursday | 7 | 244 min | 34.9 min |
| 2024-08-31 | Saturday | 7 | 165 min | 23.6 min |
| 2024-09-03 | Tuesday | 1 | 32 min | 32.0 min |

Monday, September 2, stands out: 503 minutes lost across 11 batches -- 45.7 minutes per batch, the worst ratio of the week. Friday (444 min) is the second-highest. Both days ran the heaviest production load. Saturday was the calmest at 23.6 minutes per batch, which hints that downtime scales with workload -- possibly via rushed changeovers when the day is packed.

The operator-by-date matrix adds color: on Monday, Charlie (191), Dee (163), and Dennis (149) all had heavy losses; Mac was off. Friday's 444 minutes were split among Charlie, Dee, and Dennis again. Highest workload days coincide with the highest-error operators.

## 9. Recommendations

1. **Retrain or re-procedure Charlie first.** He owns 27.7% of all downtime and 59% of his time is operator error. A focused machine-adjustment and batch-change protocol could reclaim most of it.
2. **Fix machine adjustment (332 min) as a process, not a blame.** It is the single largest factor and it is operator-classified -- meaning the standard operating procedure for adjustment is the real culprit. A documented setup checklist is cheap.
3. **Put 254 minutes of machine failure on the maintenance calendar.** One third of non-operator downtime comes from this factor alone.
4. **Review inventory policy for the 225-minute shortage.** Shortages are usually a planning fix, not a floor fix.
5. **Even the load between operators.** Mac averages 41.5 minutes of downtime per batch vs Dee's 33.6. If batch allocation can be balanced, the line loses less.
6. **Treat Monday/Friday rush as a risk flag.** Heavier production days show the worst per-batch downtime; consider pre-shift changeover prep on those days.

## 10. Limitations

1. **Small sample.** 38 batches over 5 days is a short window. Operator rankings could shift with more shifts.
2. **Correlation, not causation.** High downtime days have more batches, but we cannot prove workload caused the extra minutes without shift-level context.
3. **Factor classification is as given.** The dataset marks six factors as operator error; real root-cause would need shift notes or video.
4. **No cost data.** Downtime minutes are counted, but product margins, overtime, and lost sales are not in the workbook -- a minute on OR-600 may cost more than a minute on CO-600.
5. **"Other" factor (74 min) is a black box** -- 5.3% of all downtime is unexplained by the dictionary.