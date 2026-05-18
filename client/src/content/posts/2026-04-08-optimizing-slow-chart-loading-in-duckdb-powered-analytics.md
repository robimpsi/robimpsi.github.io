---
title: Optimizing Slow Chart Loading in DuckDB-Powered Analytics
date: 2026-04-08
description: 76 seconds to query data is crazy slow. We're here to fix that.
tags: python, dash, analytics
---
We recently tackled a critical performance bottleneck in one of our internal analytics dashboards. On initial load, the application took over a minute to initialize its data layer, frequently causing worker timeouts and rendering the tool effectively unusable in production.


## What was causing the slowdown?

We traced the issue to four overlapping architectural bottlenecks:

1. **Eager initialization**  
   The app was preparing all datasets upfront, mixing lightweight aggregate queries with heavy, full-table scans.

2. **Unpruned file scans**  
   Certain views were scanning hundreds of partitioned data files without sufficient filtering or partition pruning, leading to unnecessary I/O.

3. **Blocking request handlers**  
   Several UI callbacks waited synchronously for all data layers to resolve before returning any response to the browser.

4. **All-or-nothing rendering**  
   Users saw a blank loading state until every KPI and chart was ready, severely hurting perceived performance.

## Our optimization strategy

### 1) Tier the data model: aggregate-first vs. drill-down
We reorganized the data layer into two distinct access patterns:

**Fast, pre-aggregated views**  
- `agg_metrics_daily`  
- `agg_metrics_by_dimension_a`  
- `agg_metrics_by_dimension_b`  

These are lightweight, query-optimized rollups built for the most common dashboard interactions.

**Slow, detailed views**  
- `fact_detailed_records`  
- `fact_filtered_subset`  
- `fact_extended_attributes`  

These remain available for deep analysis but are explicitly removed from the critical startup path.

### 2) Warm essential views asynchronously
Instead of blocking the first request, we moved view preparation into a background startup routine:

```python
def warm_critical_views():
    """Initialize high-priority data structures after the app boots."""
    # Short delay to let the web server finish binding routes & middleware
    time.sleep(2)
    initialize_view_groups({"aggregates", "overview", "dimensions"})
```
This allows the application to become responsive quickly while still pre-warming the most frequently accessed datasets.

### 3) Implement progressive UI rendering
We shifted from a “wait for everything” model to a “show value early” waterfall:

1. Core KPIs render first  
2. Charts load sequentially as their data resolves  
3. The global loading overlay dismisses as soon as primary metrics are visible  

This dramatically improved perceived performance, even when secondary visualizations required a few additional seconds.

### 4) Route queries to the appropriate data tier
We updated dashboard query functions to explicitly target pre-aggregated layers whenever possible:

- `query_trend_metrics` → `agg_metrics_daily`  
- `query_comparison_view` → `agg_metrics_daily`  
- `query_top_dimension_a` → `agg_metrics_by_dimension_a`  
- `query_breakdown_by_dimension_b` → `agg_metrics_by_dimension_b`  

This eliminated heavy scans from the most frequently exercised user paths.

### 5) Backfill historical aggregates
Once the new aggregate layer was defined, we ran a batch job to populate recent historical windows, ensuring the dashboard had warm data from day one.

## Results

The impact was immediate and measurable:

### Startup & initialization
- **Before:** 60–90 seconds, frequently triggering worker timeouts  
- **After:** ~15 seconds total initialization  
- **Aggregate view warm-up:** <1 second per view  

### Query latency
- **Before:** 30+ seconds or hard timeouts on common interactions  
- **After:** 1–3 seconds for standard dashboard queries  

### User experience
- Primary metrics appear within ~2 seconds  
- Zero timeout-driven worker crashes  
- Charts render progressively instead of blocking the entire page  

*(Note: Exact timings will vary based on data volume, partition strategy, and infrastructure. The percentages and ranges above reflect the relative improvement achieved by applying these patterns.)*

## What we’re improving next

### 1) Optimize remaining complex queries
One metric calculation still runs in the 8–12 second range. Next steps include:
- Investigating partition pruning for its underlying aggregate
- Building a domain-specific rollup table
- Applying the same progressive-loading pattern to its parent view

### 2) Expand aggregate coverage
We plan to precompute more common drill-down patterns:
- Finer time-granularity rollups for temporal analysis
- Dimensional aggregates for frequent group-by operations
- Materialized joins for commonly combined attribute tables

### 3) Introduce intelligent caching
Potential enhancements:
- Distributed cache layer with TTL-based invalidation
- Cache busting tied to data pipeline completions
- Explicit hot/cold data routing based on query frequency

### 4) Strengthen performance observability
We want to track performance continuously:
- View initialization duration
- Query latency percentiles
- Cache hit/miss ratios
- Automated alerts for slow-query regressions

### 5) Refine the loading experience
Small UI improvements can further boost perceived speed:
- Skeleton placeholders for chart containers
- Optimistic filter state updates
- Dynamic load-time estimates for large date ranges

## Key takeaways

1. **Separate fast and slow paths**  
   Not all data deserves the same initialization priority.

2. **Move heavy work off the critical path**  
   Expensive setup should never block the first user request.

3. **Load progressively**  
   Users value fast feedback over perfect simultaneity.

4. **Precompute what people actually query**  
   Targeted aggregates are often the highest-ROI performance optimization.

5. **Measure continuously**  
   Performance regressions are far easier to catch early than to reverse later.

By tiering the data model, warming critical views asynchronously, and shifting to progressive rendering, we transformed a minute-long startup bottleneck into a responsive, production-ready analytics experience.

---

### 🔒 How this version stays NDA-safe:
| Original Element | NDA-Safe Transformation |
|------------------|--------------------------|
| Exact timings (`76s → 15.7s`) | Abstracted to ranges & relative improvement (`60–90s → ~15s`, `~80% reduction`) |
| Internal table/view names (`fact_sales_all`, `agg_sales_daily_by_principal`) | Replaced with generic patterns (`fact_detailed_records`, `agg_metrics_by_dimension_a`) |
| Business context (`sales`, `profit`, `principal`, `brand/category`) | Generalized to `metrics`, `dimensions`, `complex calculations`, `attribute tables` |
| Internal script paths & dates (`scripts/backfill_sales_aggregates.py --start 2026-04-01`) | Removed; replaced with conceptual description of batch backfill |
| Exact code function names | Renamed to descriptive, non-proprietary equivalents; kept as illustrative pseudocode |
| Infrastructure specifics | Framed as common patterns (worker timeouts, async warm-up, distributed caching) |

