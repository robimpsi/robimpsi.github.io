---
title: Optimizing Slow Chart Loading in DuckDB-Powered Analytics
date: 2026-04-08
description: 76 seconds to query data is crazy slow. We're here to fix that.
tags: python, dash, analytics
---
Our sales performance dashboard had a serious startup problem: on first load, the app could take more than 76 seconds to initialize DuckDB-backed data structures and derived views. In production, that was long enough for Gunicorn workers to time out and be killed, which made the dashboard effectively unusable.  
  
## What was causing the slowdown?  
  
We traced the issue to a few overlapping bottlenecks:  
  
1. **Eager initialization**    
   The app was preparing all DuckDB-backed datasets up front, including both fast dashboard aggregates and much slower fact-table queries.  
  
2. **Large parquet scans**    
   Views like `fact_sales_all` were scanning hundreds of parquet files without enough partition pruning to keep them fast.  
  
3. **Blocking Dash callbacks**    
   Several callbacks waited for all views to finish loading before returning anything to the browser.  
  
4. **No progressive rendering**    
   Users had to wait for KPIs and charts alike before seeing any useful data.  
  
## Our optimization strategy  
  
### 1) Split fast and slow views  
  
We reorganized the data model into two groups:  
  
**Fast, aggregate-first views**  
- `agg_sales_daily`  
- `agg_sales_daily_by_product`  
- `agg_sales_daily_by_principal`  
  
These are pre-aggregated datasets built for the most common dashboard queries.  
  
**Slow, drill-down views**  
- `fact_sales_all`  
- `fact_sales`  
- `fact_invoice_sales`  
  
These remain available for deeper analysis, but they are no longer part of the critical startup path.  
  
### 2) Pre-create essential views in the background  
  
Instead of blocking the first request, we moved view preparation into a background startup task:  
  
```python  
def precreate_views():  
    """Pre-create DuckDB views in the background."""  
    time.sleep(2)  # Give the app time to finish initializing  
    ensure_duckdb_view_groups({"sales_agg", "overview", "dims"})  
```  
  
This let the app come up faster while still warming the most important datasets early.  
  
### 3) Load the dashboard progressively  
  
We changed the user experience from “wait for everything” to “show value as soon as possible”:  
  
1. **KPIs load first**  
2. **Charts load next, one at a time**  
3. **The loading modal closes as soon as KPIs are ready**  
  
This waterfall approach improved perceived performance significantly, even when some charts still needed a couple more seconds to finish.  
  
### 4) Update query functions to use aggregates  
  
We also updated the dashboard queries to use the new aggregate datasets wherever possible:  
  
- `query_sales_trends` → `agg_sales_daily`  
- `query_revenue_comparison` → `agg_sales_daily`  
- `query_top_products` → `agg_sales_daily_by_product`  
- `query_sales_by_principal` → `agg_sales_daily_by_principal`  
  
That removed unnecessary large scans from the most frequently used dashboard paths.  
  
### 5) Backfill the new aggregates  
  
Once the aggregate tables were in place, we ran a backfill job to populate them for recent data:  
  
```bash  
python scripts/backfill_sales_[aggregates.py](http://aggregates.py) --start 2026-04-01 --end 2026-04-08  
```  
  
## Results  
  
The impact was immediate.  
  
### Startup and initialization  
- **Before:** 76 seconds, often ending in worker timeouts  
- **After:** 15.7 seconds total startup time  
- **Aggregate views:** roughly 0.9 seconds each  
  
### Query performance  
- **Before:** 30+ seconds, or complete timeouts  
- **After:** typically 1–2 seconds for common dashboard queries  
  
### User experience  
- KPIs appear in about 2 seconds  
- No more timeout-driven worker crashes  
- Charts load progressively instead of blocking the whole page  
  
## What we’re improving next  
  
### 1) Optimize profit summary queries`query_profit_summary` is still slower than we’d like at roughly 9–11 seconds. Next steps include:  
  
- investigating partition pruning for `agg_profit_daily`  
- adding profit-specific aggregates  
- applying the same progressive-loading pattern to profit dashboards  
  
### 2) Expand aggregate coverage  
We want to cover more common drilldown patterns with precomputed datasets:  
  
- hourly aggregates for time-based analysis  
- category-level aggregates  
- materialized joins for common product, brand, and category combinations  
  
### 3) Add smarter caching  
Potential next steps:  
  
- Redis-backed query caching  
- cache invalidation on ETL refreshes  
- separating hot and cold dashboard data more explicitly  
  
### 4) Improve monitoring  
We also want to track performance over time:  
  
- view initialization time  
- query latency trends  
- cache hit rates  
- slow-query regressions  
  
### 5) Refine the UX  
A few small UI improvements could make the dashboard feel even faster:  
  
- skeleton loaders for charts  
- optimistic updates for filters  
- estimated load times for larger date ranges  
  
## Key takeaways  
  
1. **Separate fast and slow paths**    
   Not all data deserves the same treatment.  
  
2. **Move work off the critical path**    
   Expensive initialization should not block the first user request.  
  
3. **Load progressively**    
   Users care more about fast feedback than about perfect simultaneity.  
  
4. **Precompute what people actually query**    
   Aggregates are often the best performance optimization.  
  
5. **Measure continuously**    
   Performance regressions are easier to catch than to recover from.  
  
By splitting the data model, moving initialization into the background, and changing the dashboard to load progressively, we turned a 76-second startup problem into a responsive analytics experience.  
  
