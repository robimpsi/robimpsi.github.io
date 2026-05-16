---
title: "Optimizing Docker Startup: A Rigorous Bug Hunting"
date: 2026-05-16
description: After MV is built, the graph still showing stale data. The bug
  hunting for this error directs me into something more than stale cache.
tags: python, dash, docker
---
Our production Dash analytics frontend for the retail operation, had developed three distinct personalities: on startup, it took a leisurely four to five seconds before it would even acknowledge a request; every so often, a wide date range would send it into an unresponsive trance; and after the nightly ETL refresh, some charts would stubbornly display stale dimensions until we kicked the container.  

The architecture was deceptively simple. Data flowed from Odoo ERP through a Celery ETL pipeline into a Parquet data lake, then into DuckDB for in-process analytics. Everything ran on a single Docker host: one `dash-app` container running Gunicorn with a single worker and a single thread, one Celery worker, and Redis. On startup, a singleton `DuckDBManager` materialized views from Parquet into native DuckDB tables`mv_sales_daily`, `mv_profit_daily`, `mv_sales_by_product`, and others—backing every chart query. The lake held two to three years of daily retail data across roughly ten fact and aggregate tables.  

Because Gunicorn was pinned to `--workers 1 --threads 1`, there was exactly one process and one thread serving requests. The singleton was safe. The Celery worker used an in-memory `:memory:` DuckDB instance and never touched the file on disk at `/data-lake/cache/dash.duckdb`. That file lock was owned exclusively by the Dash app. When ETL finished, a signal went through Redis, and the app reloaded its connection in a background thread.  

That single-threaded reality would become crucial later. But first, the hunt.  

---

## Clue #1: The Startup Tax

I started with the four-second silence. Profiling the cold start pointed straight at `_parquet_columns()`. On every boot, the manager called `DESCRIBE SELECT  FROM read_parquet(...)` *for each dimension table—products, categories, brands—to discover column names. Each call cost about fifty milliseconds. With three dimensions, and multiple invocations during view setup, we were burning ~150–300ms before the first byte.*  

*Here was the maddening part: a module-level cache already existed.*  

*`python*   *_column_cache: Dict[str, set] = {}*   *`*  

*But the lookup was missing. The function ran the* `DESCRIBE` *every single time, nine calls in total, while the dictionary sat there empty. It was like buying a safe and leaving the key in the lock.*  

*The fix was a single guard clause:*  

*```python*  
*def parquetcolumns(parquet_path: str) -> set:*  
    *if parquet_path in columncache:*  
        *return columncache[parquet_path]*  
    *rows = conn.execute(f"DESCRIBE SELECT*  FROM read_parquet('{parquet_path}')").fetchall()  
    cols = {r[0] for r in rows if r and r[0]}  
    *column*cache[parquet_path] = cols  
    return cols  

```
  
Nine `DESCRIBE` calls dropped to one. Startup shed roughly two hundred milliseconds. It wasn’t the whole delay, but it was the first domino.  
  
---  
  
## Clue #2: Parsing What Was Already Free  
  
Next, I pulled the SQL for `mv_profit_daily` and `mv_inventory_daily`. What I saw made me wince:  
  
```sql  
COALESCE(TRY_CAST(date AS DATE), MAKE_DATE(  
    CAST(SPLIT_PART(SPLIT_PART(filename, 'year=', 2), '/', 1) AS INTEGER),  
    CAST(SPLIT_PART(SPLIT_PART(filename, 'month=', 2), '/', 1) AS INTEGER),  
    CAST(SPLIT_PART(SPLIT_PART(filename, 'day=', 2), '/', 1) AS INTEGER)  
)) AS date  
FROM read_parquet('.../**/*.parquet', hive_partitioning=1, filename=true)  
```

DuckDB was already parsing the Hive-partitioned directory structure`year=2024/month=01/day=15`—into virtual columns because `hive_partitioning=1` was enabled. But by adding `filename=true`, we forced DuckDB to allocate the full file path as a string on every single row, then run `SPLIT_PART` gymnastics to extract what the virtual columns already provided. It was correct, but it was fighting the engine.  

The `EXPLAIN` plan confirmed it: string allocation per row, vectorized scan optimizations blocked.  

We stripped out `filename=true` and the `SPLIT_PART` chain, letting the virtual `year`, `month`, `day` columns do their job:  

```sql
SELECT  
    TRY_CAST(date AS DATE) AS date,  
    ...  
FROM read_parquet('.../**/*.parquet', union_by_name=True, hive_partitioning=1)  
```

The MV load time for wide date ranges dropped measurably. The plan was clean.  

---

## The Smoking Gun: An Unbounded Query

Bug 1 and 2 were performance papercuts. Bug 3 was a loaded gun.  

Every query function called `conn.execute(query).fetchdf()` directly. No timeout. No guardrails. Because Gunicorn was running one worker with one thread, a single analyst requesting five years of line-item data from `fact_sales_all`—millions of rows—would seize the process indefinitely. The dashboard didn’t just slow down; it died. No health checks, no error page, just a hung worker staring into the void until someone killed the container.  

> In a single-threaded world, an unbounded query isn’t slow—it’s a denial-of-service attack you invited yourself.  

DuckDB supports `statement_timeout` per connection. In our singleton architecture, setting it before each query was safe. I wrapped the execution path:  

```python
def *execute*with_timeout(conn, query: str, params: list = None, timeout_ms: int = 10000) -> pd.DataFrame:  
    conn.execute(f"SET statement_timeout={timeout_ms}")  
    if params:  
        return conn.execute(query, params).fetchdf()  
    return conn.execute(query).fetchdf()  
```

When DuckDB exceeds the limit, it throws. We catch that and return an empty DataFrame, which renders as a “no data” chart rather than an infinite loading spinner. Worst-case latency became exactly ten seconds. Dashboard hangs dropped to zero.  

I noted the caveat: `statement_timeout` is per-connection. If we ever moved to a multi-threaded setup, this pattern would race. We’d need per-query connections or a pool. But for now, the gun was unloaded.  

---

## Clue #4: The Ghost in the Cache

With ETL refreshes running nightly, we had a signal path through Redis telling the Dash app to reload its views. After implementing that, we still saw stale dimension metadata—new columns from the ERP would appear in Parquet but the charts wouldn’t see them until a manual restart.  

The culprit was `clear_sales_caches()`. It dutifully cleared the `@lru_cache` decorators on all the query functions:  

```python
def clear_sales_caches() -> None:  
    query_sales_trends.cache_clear()  
    query_revenue_comparison.cache_clear()  
    ...  
```

But `_column_cache`—the dictionary we’d fixed in Bug 1—wasn’t in the room when the invalidation happened. It was a cache without a landlord. After a schema change, the old column set persisted, and downstream queries built views against a ghost schema.  

The fix was to bring it into the contract:  

```python
def clear_sales_caches() -> None:  
    query_sales_trends.cache_clear()  
    query_revenue_comparison.cache_clear()  
    query_top_products.cache_clear()  
    query_overview_summary.cache_clear()  
    query_hourly_sales_heatmap.cache_clear()  
    query_hourly_sales_pattern.cache_clear()  
    query_sales_by_principal.cache_clear()  
    *column*cache.clear()  
```

I also removed the `try/except AttributeError` guard that had been papering over the fact that `query_hourly_sales_heatmap` lacked an `@lru_cache` decorator. That was a symptom; the root cause was fixed in QW-3.  

---

## Clue #5: A Metadata Mystery

The last bug was quieter. `mv_refresh_metadata` tracks last refresh dates for incremental loads. It was created with an inline primary key:  

```sql
CREATE TABLE IF NOT EXISTS mv_refresh_metadata (  
    view_name VARCHAR PRIMARY KEY,  
    last_refresh_date TIMESTAMP,  
    ...  
)  
```

Small table, fast queries—except `EXPLAIN` showed a sequential scan instead of an index lookup. In DuckDB, the inline `PRIMARY KEY` syntax doesn’t always behave the same as a trailing constraint clause. Since the incremental refresh path queries this table on every MV load, correctness of the lookup path mattered.  

We restructured the DDL:  

```sql
CREATE TABLE IF NOT EXISTS mv_refresh_metadata (  
    view_name VARCHAR,  
    last_refresh_date TIMESTAMP,  
    max_data_date DATE,  
    row_count BIGINT,  
    refresh_type VARCHAR,  
    PRIMARY KEY (view_name)  
)  
```

After the change, `EXPLAIN` showed the index. For a tiny metadata table, the speed difference was marginal, but the plan was now honest.  

---

## Proving the Guilt

I didn’t want to fix these blindly. We used a two-phase testing strategy inspired by property-based thinking, though the tests were deterministic invariant checks rather than randomized Hypothesis runs.  

**Phase 1: Bug Condition Tests.** These were written to *fail* on the unfixed code. Failure was the success condition—it proved the bug existed and gave us a concrete counterexample. Once the fix landed, they became regression tests.  

**Phase 2: Preservation Tests.** These were written to *pass* on the unfixed code. They encoded baseline behavior that had to survive the fix. Re-running them after changes caught regressions.  

Separating the phases kept intent clean. A single test that both detects a bug and verifies the fix conflates two different questions: “does the bug exist?” and “is the fix correct?”  

The test matrix covered:  


| Property | Strategy |
| ----------------- | ----------------------------------------------------------------------- |
| Column cache hit | Call `_parquet_columns()` 3×, assert 2nd/3rd skip `DESCRIBE` |
| Date parsing | Inspect generated SQL string, assert no `SPLIT_PART` or `filename=true` |
| Query timeout | Assert `statement_timeout` set before `conn.execute()` |
| Cache clear | Call `clear_sales_caches()`, assert `_column_cache` empty |
| PK constraint | Query `information_schema.table_constraints`, assert PK exists |
| Query structure | Mock DuckDB connection, assert DataFrame columns/types correct |
| Thread safety | 5 threads call `get_connection()`, assert same instance returned |
| Hive partitioning | Inspect source code, assert `hive_partitioning=1` present |
| Connection reload | Call `close_connection()`, assert all state reset to defaults |


---

## The Lab Conditions

The test harness hit friction immediately.  

**Python 3.9 syntax.** I’d used `str | None` in a type hint. The container ran Python 3.9. Collection exploded with:  

```
TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'  
```

Back to `Optional[str]`. A blunt reminder: always run test collection in the actual image, not on a local 3.11 install.  

**Missing pytest.** `requirements.txt` had no `pytest` entry. The image was built without it. I installed it ad-hoc with `pip install pytest` to avoid a full rebuild, then added `pytest==8.3.5` to `requirements.txt` for the next cycle.  

**Rate limiting.** I tried to spin up seven parallel sub-agent invocations for Wave 2 tasks. They all failed with `Too many requests`. I fell back to direct implementation—reading source, applying fixes inline. Parallel automation is fragile under rate limits; a sequential fallback has to be part of the playbook.  

---

## While the Hood Was Open

With the main bugs squashed, I cleaned up three smaller issues that had been lurking in the margins.  

**QW-1: Health check tied to MV readiness.** We added a `/health` endpoint that counts `mv_%` tables in `information_schema.tables` and runs a smoke query against `mv_sales_daily`. It returns `200` when at least four MVs are loaded, `503` while initializing, and `503` with an error body on exception. We wired it into `docker-compose.yml` with a `start_period: 30s` so Docker wouldn’t declare the container unhealthy during normal boot.  

**QW-2: Memory limits.** I capped `dash-app` at 2GB (1GB reservation) and the Celery worker at 1GB (512MB reservation). This prevents an analytical runaway from cascading into an OOM kill on the host.  

**QW-3: Missing cache decorators.** Three query functions`query_sales_by_principal`, `query_hourly_sales_heatmap`, and `query_hourly_sales_pattern`—had no caching at all. I added `@versioned_cache(ttl=3600)` and `@lru_cache(maxsize=32)` to each, matching the existing pattern, and updated `clear_sales_caches()` accordingly. This let me finally delete the `try/except AttributeError` guard in the cache clear function.  

---

## Closing the Case

Looking back, the pattern was clear. We’d optimized for the average case while ignoring the worst case. We’d built caches without drawing their boundaries. We’d written SQL that worked without asking if it was letting the database work *with* us.  

- **Write tests before fixing.** The two-phase approach forces you to understand the breakage before you touch the code. The bug-condition tests become your regression suite for free.  
- **Inspect generated SQL, not just behavior.** Bug 2 was invisible at the result level—the dates were perfect. Only `print(sql)` in a mock revealed the filename parsing atrocity.  
- **Cache invalidation is a system contract, not a function.** `clear_sales_caches()` made an implicit promise: “after this call, everything is fresh.” It broke that promise because `_column_cache` lived outside the contract boundary. Define what each cache holds and what invalidates it.  
- **Python version matters in containers.** Syntax, `match` statements, `tomllib`—the 3.10 divergence is real. Test in the image.  
- **Bound your worst case before optimizing your average case.** A 200ms startup penalty is annoying. An unbounded query hang takes down the service. Fix the infinite before the slow.

Our internal dash is even more stable than ever. The startup is snappy, the queries are bounded, and the caches tell the truth after every ETL run. But I’ll keep the test harness around. The next ghost is always hiding in the logs, waiting for someone to read them carefully enough.