---
title: "From 111 Seconds to 0.4 Seconds: How We Optimized Our BI Dashboard
  Performance"
date: 2026-04-10
description: Our internal business intelligence dashboard built on Python Dash
  and DuckDB had developed a critical performance problem. And it makes me
  rethink about how I approached data architecture.
---
## The Problem: Death by a Thousand Parquet Files

Our internal business intelligence dashboard built on Python Dash and DuckDB had developed a critical performance problem.

On every container restart, the application would hang for **77 seconds** before becoming responsive, often triggering Gunicorn's 120-second timeout and resulting in `SIGKILL` errors. Individual queries for profit metrics were taking **10-15 seconds**, making the dashboard practically unusable for day-to-day operations.

The root cause was a perfect storm of three factors: (1) DuckDB views being lazily created on first query rather than at startup, (2) 198 parquet files being scanned through WSL2's slow bind-mount filesystem translation layer, and (3) the database running entirely in memory, meaning all optimizations were lost on every `docker-compose restart`.



## The Diagnosis: Understanding Data Gravity

Our investigation revealed that the profit summary query, which is essential for the Sales page KPIs, was scanning `agg_profit_daily`, a DuckDB **view** over partitioned parquet files. Every query triggered a full scan of 198 parquet files across 400 days of history. Because WSL2 translates Linux file system calls to Windows NTFS, each file operation incurred significant overhead. Reading hundreds of small files became a death by a thousand cuts.

The startup delay compounded this: views were created using `CREATE OR REPLACE VIEW` statements on every initialization, even when they already existed. With no persistence mechanism, the application treated every restart as a blank slate, rebuilding everything from scratch.



## The Solution: Three Layers of Optimization



### Layer 1: Persistent DuckDB (The Fridge)

We switched from in-memory DuckDB (`:memory:`) to a file-backed database (`/data-lake/cache/dash.duckdb`). This simple change meant that materialized views could survive container restarts. After implementation, existing views were detected in under 100ms, and startup time dropped from 77 seconds to **0.4 seconds**.



### Layer 2: Materialized Views (Meal Prep)

The breakthrough came from implementing **materialized views**—pre-computed tables stored in DuckDB's native format rather than referencing external parquet files. We created four key MVs:

- `mv_sales_daily`: Daily revenue aggregates
- `mv_sales_by_product`: Product-level daily summaries  
- `mv_sales_by_principal`: Principal-level daily summaries
- `mv_profit_daily`: Profit metrics (revenue, COGS, gross profit)

These tables contain only **400 rows each** (one per day), occupying mere kilobytes in memory, yet they replace scans of millions of raw transaction rows. Query times dropped from **13 seconds to under 50 milliseconds**—a 260× improvement.



### Layer 3: Incremental Refresh & Versioned Caching

To prevent full rebuilds when only new data arrives, we implemented incremental refresh logic. An `mv_refresh_metadata` table tracks the last refresh timestamp and maximum data date. When new ETL data lands, only dates beyond the current maximum are processed, turning a full rebuild into a marginal update.

For cross-request persistence beyond DuckDB, we added versioned Redis caching. Cache keys include an ETL version hash derived from `max(last_refresh_date)`, ensuring automatic invalidation when underlying data changes while providing sub-millisecond cache hits for repeated queries.



## The Results: Sub-Second Performance


| Metric | Before | After | Improvement |
| ----------------- | -------------------- | ----------------- | ---------------------- |
| Cold startup | 77s | 0.4s | 192× faster |
| View creation | 77s | 0.1s | 770× faster |
| Profit query | 13s | <50ms | 260× faster |
| Sales trends | 2-5s | <100ms | 20-50× faster |
| Cache persistence | None (in-memory LRU) | Redis + versioned | Cross-restart survival |




## Key Insights: Two-Tier Architecture

This optimization validated a fundamental data warehouse principle: **transactional data and analytical queries should not mix**. Sales and inventory systems generate millions of granular events (stock moves, invoice lines), but dashboard users need aggregated answers: "What was our profit yesterday?" not "Show me every transaction that contributed to it."

We adopted a two-tier architecture:

- **Tier 1 (Cold)**: Transactional parquet files—full granularity, slow to query, cheap to store
- **Tier 2 (Hot)**: Materialized views—pre-aggregated, instant queries, rebuilt incrementally

This pattern is industry-standard (Kimball's "periodic snapshot fact tables") but often skipped in small-scale BI tools. Our case proves it matters even at modest scale: 400 days of history was enough to make raw transactional queries unusable.



## The Inventory Challenge Ahead

Sales data benefited from this architecture because daily aggregates reduced millions of transactions to 400 rows. Inventory data presents a harder problem: stock movements are 10-100× more granular than sales, and "current stock level" cannot be computed from a simple daily sum—it requires running totals across all history.

The industry solution is **periodic snapshot fact tables**: instead of storing every stock movement, store daily ending balances per product per location.

This transforms a computational problem (summing all history) into a lookup problem (reading one number). For Our app, this means creating `agg_inventory_daily` and `mv_inventory_daily` to complement the existing `fact_inventory_moves` transactional table.



## Conclusion

The optimization demonstrates that BI performance is rarely about hardware or query tuning—it's about **data architecture**.

By recognizing that dashboards need snapshots while audits need transactions, we replaced 13-second filesystem scans with 50-millisecond memory lookups. The 0.4-second startup time means developers can now iterate rapidly without fearing the `docker-compose restart` penalty.

Most importantly, we've established patterns—persistent storage, materialized views, incremental refresh—that will scale as the business grows from 400 days to 4,000 days of history.

