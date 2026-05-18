---
title: "Optimizing Docker Startup: A Rigorous Bug Hunting"
date: 2026-05-16
description: After MV is built, the graph still showing stale data. The bug
  hunting for this error directs me into something more than stale cache.
tags: python, dash, docker
---
# Hunting Down Performance Ghosts in a Production Analytics Dashboard  
  
Our production analytics frontend had developed three distinct personalities:  
  
- on startup, it would pause for several seconds before responding to the first request,  
- occasionally, a wide date-range query would send it into an unresponsive trance,  
- and after nightly data refreshes, some charts would continue showing stale metadata until the app was restarted.  
  
The architecture was conceptually simple: operational data flowed from our ERP system through an ETL pipeline into partitioned columnar storage, then into an in-process analytical database powering the dashboard. Everything ran on a single host with a web app container, a background worker, and a message broker.  
  
On paper, this was manageable. In practice, several small assumptions had accumulated into production instability.  
  
This is the story of how we traced those issues down, fixed them, and turned a temperamental dashboard into a predictable one.  
  
---  
  
## The Symptoms  
  
We were seeing three classes of problems:  
  
1. **Startup tax**    
   The app took too long to become responsive after boot.  
  
2. **Unbounded query hangs**    
   Certain requests—usually large date-range queries—could monopolize the only request-serving process.  
  
3. **Stale metadata after refresh**    
   After the nightly ETL run, newly available schema changes or dimensions sometimes didn’t appear until the container was manually restarted.  
  
None of these issues looked catastrophic in isolation. Together, they created a system that felt unreliable.  
  
---  
  
## Clue 1: Recomputing Metadata We Already Knew  
  
The first thing I profiled was startup behavior. One function stood out: a helper that inspected parquet-backed datasets to discover available columns.  
  
The pattern was roughly:  
  
```python  
def get_columns(dataset_path: str) -> set:  
    rows = conn.execute("DESCRIBE SELECT  *FROM ...").fetchall()*  
    *return {r[0] for r in rows if r and r[0]}*  
*```*  
  
*That kind of schema inspection is fine once. It is not fine repeatedly during application startup.*  
  
*What made this especially frustrating was that a module-level cache already existed. The code had a place to store the result, but the lookup path wasn’t using it consistently. So the same metadata discovery ran multiple times per boot.*  
  
*The fix was simple: add an early return if the path had already been seen.*  
  
*```python*  
*def get_columns(dataset_path: str) -> set:*  
    *if dataset_path in column_cache:*  
        *return column_cache[dataset_path]*  
  
    *rows = conn.execute("DESCRIBE SELECT*  FROM ...").fetchall()  
    cols = {r[0] for r in rows if r and r[0]}  
    column_cache[dataset_path] = cols  
    return cols  
```  
  
This didn’t eliminate startup latency by itself, but it removed a chunk of unnecessary work and confirmed a broader pattern: we had caching structures in place, but not all of them were actually participating in the lifecycle correctly.  
  
---  
  
## Clue 2: Parsing Information the Engine Already Provided  
  
Next, I inspected the generated SQL behind some of the slower materialization logic.  
  
What I found was an anti-pattern that looked clever at first glance but was fighting the database engine: the queries were extracting partition dates from file paths using string functions, even though partition-aware reads were already enabled.  
  
The original shape was conceptually like this:  
  
```sql  
SELECT  
    COALESCE(  
        TRY_CAST(date AS DATE),  
        MAKE_DATE(  
            CAST(SPLIT_PART(... ) AS INTEGER),  
            CAST(SPLIT_PART(... ) AS INTEGER),  
            CAST(SPLIT_PART(... ) AS INTEGER)  
        )  
    ) AS date  
FROM read_parquet(..., partitioning=true, filename=true)  
```  
  
The problem was subtle but important:  
  
- partition-aware reading was already available,  
- enabling filename extraction forced per-row path string handling,  
- and the string parsing prevented the engine from using simpler, more optimized scan behavior.  
  
The dates were correct, but the path to correctness was expensive.  
  
We removed the file-name parsing logic and let the engine use partition metadata directly. The rewritten query became much simpler:  
  
```sql  
SELECT  
    TRY_CAST(date AS DATE) AS date,  
    ...  
FROM read_parquet(..., partitioning=true)  
```  
  
This improved materialization times for broader date ranges and cleaned up the execution plan significantly.  
  
The lesson here was important: **correct SQL is not necessarily cooperative SQL**. Sometimes the database is already doing the work for you, and extra logic only gets in the way.  
  
---  
  
## The Biggest Risk: Unbounded Queries in a Single-Worker App  
  
The startup issue was annoying. The query issue was dangerous.  
  
Our production web app was configured conservatively: a single worker process and a single thread. That made some shared-state decisions simpler, but it also meant one runaway query could monopolize the entire app.  
  
At the time, query execution looked roughly like this:  
  
```python  
conn.execute(query).fetchdf()  
```  
  
No timeout. No upper bound. No escape hatch.  
  
If a user requested an overly broad dataset, the app didn’t degrade gracefully. It just stopped responding.  
  
In a single-worker environment, an unbounded analytical query is effectively self-inflicted denial of service.  
  
The fix was to enforce a per-query timeout before execution:  
  
```python  
def execute_with_timeout(conn, query: str, params=None, timeout_ms: int = 10000):  
    conn.execute(f"SET statement_timeout={timeout_ms}")  
    if params:  
        return conn.execute(query, params).fetchdf()  
    return conn.execute(query).fetchdf()  
```  
  
If a query exceeded the limit, we caught the exception and returned a safe fallback result for the UI. The chart rendered as empty or “no data” instead of spinning forever.  
  
That changed the system behavior dramatically:  
  
- worst-case latency became bounded,  
- dashboard hangs dropped to zero,  
- and the app remained available even when a query request was unreasonable.  
  
One important caveat: this pattern is safe only if connection ownership is predictable. In a multi-threaded or pooled setup, per-connection timeout mutation would need a different approach.  
  
---  
  
## Clue 4: The Cache That Never Got Invalidated  
  
After nightly ETL refreshes, we had already built a signaling mechanism to tell the app to reload analytical state. That part was working.  
  
And yet, some charts still displayed stale dimension metadata after refresh.  
  
The problem turned out to be cache invalidation boundaries.  
  
We had a cache-clearing function that reset memoized query functions:  
  
```python  
def clear_query_caches():  
    query_a.cache_clear()  
    query_b.cache_clear()  
    query_c.cache_clear()  
```  
  
That looked complete. It wasn’t.  
  
The metadata cache introduced earlier—the one holding discovered column sets—wasn’t included in the invalidation routine. So after schema changes upstream, query-level caches were fresh, but metadata assumptions were not.  
  
The result was a ghost schema: views and queries built against yesterday’s understanding of the dataset.  
  
The fix was to make that cache part of the invalidation contract:  
  
```python  
def clear_query_caches():  
    query_a.cache_clear()  
    query_b.cache_clear()  
    query_c.cache_clear()  
    column_cache.clear()  
```  
  
This was less about one bug and more about system design. Cache invalidation is not a local concern. If you expose a “refresh everything” pathway, every cache that affects correctness must participate.  
  
---  
  
## Clue 5: Metadata Tables Should Behave Like Metadata Tables  
  
One final issue lived in a small refresh-tracking table used for incremental materialization. It stored last-refresh information for each analytical object.  
  
The table was tiny, so performance wasn’t visibly bad. But query plans suggested the optimizer wasn’t treating the key constraint the way we expected.  
  
We restructured the table definition to use a more explicit constraint form, then re-checked the plan. The resulting behavior was more aligned with what we wanted.  
  
Did this make a huge runtime difference? Not materially.  
  
But correctness isn’t just about returning the right answer. It also means the schema should honestly express intent, and the execution plan should reflect that intent.  
  
---  
  
## How We Verified the Fixes  
  
I didn’t want to patch these issues by instinct alone, so we used a two-phase testing approach.  
  
### Phase 1: Bug-condition tests  
These tests were designed to fail against the broken behavior.  
  
Examples:  
- repeated metadata inspection should not re-run schema discovery every time,  
- generated SQL should not contain unnecessary file-path parsing,  
- cache-clear routines should actually clear all relevant caches.  
  
These tests proved the bug existed and gave us a reproducible counterexample.  
  
### Phase 2: Preservation tests  
These tests captured behavior that should remain true before and after the fix.  
  
Examples:  
- query functions should still return the expected shape,  
- connection lifecycle operations should still reset state correctly,  
- partition-aware reads should still be enabled.  
  
This separation mattered. A test that tries to both expose a bug and validate a fix often ends up doing neither clearly.  
  
---  
  
## A Few Supporting Improvements  
  
While we had the system open, we cleaned up several adjacent issues.  
  
### Health checks tied to readiness  
We added a health endpoint that verified not just process liveness, but analytical readiness. Instead of merely answering “is the server up?”, it also answered “is the data layer usable?”  
  
That gave orchestration a much better signal during startup.  
  
### Resource boundaries  
We introduced memory limits and reservations for the web app and worker containers. This reduced the chance that one runaway analytical operation would destabilize the host.  
  
### Missing cache decorators  
A few frequently used query functions weren’t cached at all, despite the rest of the codebase following a cache pattern. We aligned them with the existing strategy and simplified the invalidation code afterward.  
  
---  
  
## Key Lessons  
  
### 1. Write tests that prove the bug exists  
A fix is more trustworthy when you can demonstrate the failure mode first.  
  
### 2. Inspect generated SQL, not just outputs  
Some of the worst inefficiencies still returned correct data. The real problem only became visible by looking at the SQL being generated.  
  
### 3. Cache invalidation is a system contract  
If one part of the app says “refresh everything,” every correctness-relevant cache must honor that promise.  
  
### 4. Bound the worst case first  
A few hundred milliseconds of startup overhead is annoying. An unbounded query that monopolizes the only worker is existential.  
  
### 5. Test inside the real runtime  
Container Python versions, dependency mismatches, and environment-specific behavior will punish assumptions quickly.  
  
---  
  
## The Takeaway  
  
In the end, none of these fixes required a rewrite. They required attention.  
  
The dashboard is now faster to start, resistant to runaway queries, and honest after refreshes. More importantly, it is predictable.  
  
That’s often the real difference between a clever internal analytics tool and a production-ready one: not how fast it is on a good day, but how well it behaves on a bad one.