---
title: Optimizing Slow Chart Loading in DuckDB-Powered Analytics
date: 2026-04-08
description: 76 seconds to query data is crazy slow. We're here to fix that.
tags: python, dash, analytics
---
We recently worked on an analytics dashboard that suffered from a frustratingly slow first-load experience. In production, the application took a long time to become usable after startup—long enough that users often abandoned the page or saw timeout errors from the web server. This made the dashboard feel unreliable and blocked teams from getting timely insights.

## **What was going wrong (at a high level)**

After investigating, we identified a few common anti-patterns that were compounding each other:

1. **Eager, monolithic initialization:** The application tried to prepare *all* data structures and derived datasets up front, including both lightweight summaries and heavy, detailed datasets.
2. **Expensive data scans on startup:** Some views required scanning large volumes of raw data with insufficient filtering/partitioning, which made them disproportionately slow.
3. **Blocking UI rendering:** The frontend waited for every dataset and chart to be ready before showing anything meaningful to the user.
4. **No progressive feedback:** Users saw a blank/loading screen for an extended period, with no indication of progress or partial results.

## **The optimization strategy**

### **1) Separate “fast” vs “slow” data paths**

We re-architected the data access layer so the most common dashboard views relied on **pre-aggregated, purpose-built summary datasets**, while deeper drill-down datasets remained available on demand. This ensured the critical path stayed lightweight.



### **2) Move heavy initialization out of the request path**

Instead of doing all preparation during application startup (or during the first user request), we moved expensive view/materialization steps into a **background initialization task** that runs after the app is ready to serve traffic. This reduced time-to-first-response without sacrificing data readiness for key screens.



### **3) Load the UI progressively**

We shifted from “load everything before showing UI” to **progressive rendering**:

- Show high-level KPIs and summary metrics as soon as they’re available.
- Load charts and secondary visualizations incrementally.
- Dismiss loading states early once the primary value is on screen.

This dramatically improved perceived performance, even if some secondary elements still took a bit longer.



### **4) Prefer aggregated queries for common use cases**

We updated the most frequently used queries to read from **summary/aggregate datasets** rather than repeatedly scanning large raw datasets. This reduced unnecessary work and made performance more predictable under load.



### **5) Build and maintain aggregates with a repeatable process**

We introduced a repeatable backfill/update process for aggregates so they could be created, refreshed, and extended safely over time—without requiring ad hoc manual work or risky one-off scripts.



## **Results**

- **Startup time-to-usable-dashboard dropped significantly**, eliminating the timeout/worker-kill behavior we were seeing in production.
- **Common dashboard queries became consistently fast**, improving reliability during peak usage.
- **User experience improved**: users saw meaningful information within seconds, and the page felt responsive even while less-critical charts continued loading.



## **What we’re improving next**

- **Tighten performance of slower analytical queries** by adding more targeted aggregates and improving data partitioning/filtering strategies.
- **Expand aggregate coverage** for common drill-down patterns (e.g., time-bucketed summaries, category-level rollups, and frequently joined views).
- **Add smarter caching** (e.g., application-level caching with clear invalidation rules aligned to data refreshes).
- **Improve observability**: track initialization latency, query performance trends, cache effectiveness, and regressions over time.
- **Polish UX details**: skeleton loaders, optimistic filter updates, and clearer messaging for longer-running operations.



## **Key takeaways**

1. **Not all data is equal:** Separate fast paths (summaries/KPIs) from slow paths (deep drill-downs).
2. **Keep the critical path short:** Don’t block the first user interaction with expensive initialization.
3. **Progressive loading beats perfect loading:** Fast feedback matters more than waiting for everything at once.
4. **Precompute what users query most:** Aggregates and purpose-built summaries are often the highest-impact optimization.
5. **Measure and monitor continuously:** Performance work isn’t “done”—it’s maintained.

