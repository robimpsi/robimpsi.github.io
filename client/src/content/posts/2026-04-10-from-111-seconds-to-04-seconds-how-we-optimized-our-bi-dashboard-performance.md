---
title: "From 111 Seconds to 0.4 Seconds: How We Optimized Our BI Dashboard
  Performance"
date: 2026-04-10
description: Our internal business intelligence dashboard built on Python Dash
  and DuckDB had developed a critical performance problem. And it makes me
  rethink about how I approached data architecture.
tags: |
  Plotly
  DuckDB
---


A three-second load time loses users.  

Our internal BI dashboard, however, wasn’t losing users. It was taking them hostage.  

Built on Python Dash and DuckDB, it had become a performance nightmare. Every `docker-compose up` was a coin flip: would it boot in its allotted 120 seconds, or would Gunicorn’s patience run out, issuing its signature `SIGKILL`?  

For the users who made it past the loading screen, the reward was a 13-second wait for a single profit metric.  

This wasn’t a dashboard. It was a digital oubliette. Users weren't just annoyed—they were abandoning it.  

This is the story of the autopsy, the heist, and the architectural lesson that turned a 111-second startup into a 0.4-second blink.  



### **The Crime Scene: A Conspiracy of Laziness**

The murder weapon wasn't one thing, but a conspiracy of three perfectly aligned mistakes:  

1. **The Phantom Menace:** DuckDB views were created *lazily*. They only materialized on the first query, turning an innocent click into a system-wide fire drill.
2. **The File System Tax:** That fire drill involved scanning 198 Parquet files across WSL2's notoriously slow bind-mount filesystem. Every file operation was a bureaucratic nightmare of Linux-to-Windows translation.
3. **The Goldfish Brain:** The database ran entirely in-memory `:memory:`), meaning every optimization, every cache, every shred of hard-won knowledge was wiped clean on every restart. It had the long-term memory of a goldfish.

It was death by a thousand cuts—each cut a tiny, translated file operation. The great irony? We’d aggregated our raw data into daily Parquet files, *thinking* we were being efficient. But a view over those files isn’t data; it’s a promise to go do the work later. And "later" was costing us everything.  



### **The Autopsy: When a View Is a Liar**

The logs pointed to a single query on a view named `agg_profit_daily`. But this view was a ghost. It was just a pointer, a reminder to go open 198 files spanning 400 days of history.  

To compound the felony, on every startup the app would dutifully run `CREATE OR REPLACE VIEW`, even when the view already existed. It was like a chef rewriting the entire menu from scratch every single morning. Seventy-seven seconds of pure, uncut futility.  

The problem wasn't our stack. The problem was our architecture was built on a series of lies we were telling ourselves.  



### **The Heist: A Three-Layer Plan for Performance**

We didn’t need a rewrite. We needed a heist—to steal our performance back.  

#### **Layer 1: The Safe House (Persistent Storage)**

First, we killed the goldfish. We ditched `:memory:` and gave our DuckDB instance a home on disk: `/data-lake/cache/dash.duckdb`.  

This simple change was revolutionary. Suddenly, views and metadata *survived* restarts. The app stopped having amnesia.  

**Startup time plummeted from 111 seconds to 0.4 seconds.** That's not an improvement; that's a magic trick.  

#### **Layer 2: Meal Prep for Data**

Next, we stopped cooking from scratch. We embraced **materialized views**.  

A materialized view is meal prep for your database. Instead of a recipe (a standard view), it’s the pre-cooked dish, ready to be served instantly. We created four key MVs:  

- `mv_sales_daily`: Daily revenue aggregates  
- `mv_sales_by_product`: Product-level daily summaries  
- `mv_profit_daily`: Pre-crunched profit metrics

Each of these tables contains just **400 rows**—one per day. These tiny, kilobyte-sized tables replaced scans of millions of raw transaction rows.  

**Query time dropped from 13 seconds to under 50 milliseconds.** A **260x speedup**. Users now get answers faster than they can blink.  

#### **Layer 3: The Insurance Policy (Incremental & Versioned Caching)**

Rebuilding 400 days of history just to add one new day is architectural malpractice.  

So, we built an `mv_refresh_metadata` table that tracks the last refresh timestamp. When new ETL data lands, we only process the new dates. Full rebuilds are dead.  

For an extra layer of speed, we added versioned Redis caching. Cache keys include a hash of the data's last refresh date, ensuring that when the underlying data changes, the cache automatically invalidates. The result? Sub-millisecond hits for repeated queries that survive container Armageddon.  



### **The Scorecard: From Agony to Instant Gratification**

The results weren't just an improvement; they were a regime change.  


| Metric | Before | After | Improvement |
| -------------- | ------ | ----------------- | --------------- |
| Cold Startup | 77s | 0.4s | **192× faster** |
| View Creation | 21s | 0.1s | **210× faster** |
| Profit Query | 13s | <50ms | **260× faster** |
| Cache Survival | None | Redis + versioned | **Immortal** |


### **The Core Lesson: Store the Answer, Not the Math Problem**

This whole saga validated a truth so obvious it's often ignored: **Transactional data and analytical queries should not share a bedroom.**  

Your OLTP system generates millions of granular events. Your dashboard users need aggregated answers. C-level doesn't want to read every invoice line from yesterday; they want to know yesterday's profit.  

We implemented a classic two-tier architecture:  

- **Tier 1 (Cold Storage):** The Parquet files. Our source of truth. Full granularity, cheap to store, slow to query.  
- **Tier 2 (Hot Storage):** The materialized views. Our source of answers. Pre-aggregated, tiny, and instant.

Don't let the fancy name—Kimball's "periodic snapshot fact tables"—fool you. It's just common sense: compute the answer once, then store it.  



### **The Next Target: The Inventory Boss Fight**

Sales data was an easy win. Inventory is a harder problem. Stock level isn't a simple daily sum; it's a running total across all of history. You can't just `GROUP BY` the granularity; you must *accumulate*.  

The solution is the same. Don't do the math every time. Create a periodic snapshot: a table of daily ending balances for each product in each location. Transform the computational nightmare into a lookup dream. That's our next agenda.



### **The Takeaway**

This problem makes me rethink about my approach towards data architecture: BI performance is rarely about a fancy tech stack or faster hardware. It's also about proper **architecture**. Tiered schema that mimics user behavior and adjusted to user's usage pattern.

We turned a 111-second death sentence into a 0.4-second wink. We made `docker-compose restart` a non-event. And we built patterns that will scale from 400 days of history to 4,000 without breaking a sweat.  

The real optimization wasn't in the code. It was a mental shift: admitting that laziness—both in computation and in design—was the real bottleneck.  

Now, our dashboard is so fast, it feels like it knows your question before you ask. And that is how you win.