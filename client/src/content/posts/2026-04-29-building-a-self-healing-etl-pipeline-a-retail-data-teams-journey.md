---
title: Building a Self-Healing ETL Pipeline, A Retail Data Team's Journey
date: 2026-04-29
description: How we turned a brittle data backfill process into an intelligent,
  self-correcting system—and why DuckDB file locks became our unexpected teacher
tags: DuckDB
---
As a data analyst in the retail sector, my work revolves around one critical question: **"Do we trust our numbers?"**  
  
My goal in building our BI dashboard is to provide stakeholders with immediate access to performance metrics—whether it's gross profit by category or identifying non-performing inventory. They shouldn't have to worry about the plumbing of the ETL pipeline. They just need accurate data, fast.  
  
Our technical stack is likely familiar to many data teams:  
*   **Enterprise ERP** as the operational source of truth.  
*   **DuckDB** for analytical querying and materialized views.  
*   **Parquet files** with partition-based storage.  
*   **Polars** for high-performance data processing.  
*   **Celery** for task orchestration.  
  
The problem wasn't the stack; it was the fragility of our backfill process.  
  
## The Pain Point: The "Manual Refill" Cycle  
Every analyst knows the scenario: A manager reports a discrepancy in last month’s profit figures. We investigate and realize a subset of purchase data never made it into the calculation.  
  
**The old, manual process:**  
1. SSH into the server.  
2. Manually trigger extraction scripts for specific date ranges.  
3. Run intermediate cleaning and transformation tasks.  
4. Update the star schema/dimensions.  
5. Manually refresh materialized views.  
6. Pray the file system doesn't lock up during the write.  
  
This manual process was high-risk, time-consuming, and prone to human error.  
  
## The Solution: A Self-Healing Pipeline  
We wanted to move from "manual intervention" to "automated resilience." We built a system that:  
1. **Scans** for missing data gaps automatically.  
2. **Fetches** from the source ERP when gaps are detected.  
3. **Builds** aggregates incrementally.  
4. **Validates** the results at the partition level.  
5. **Reports** the status of the pipeline automatically.  
  
### The Architecture: Cascading Refresh  
The key insight was to standardize our "refresh scripts" into modular, reusable components. Instead of unique, one-off scripts, we standardized our extraction logic into predictable modules that can be orchestrated by the main pipeline.  
  
```python  
# The cascading refresh flow  
def refresh_pipeline_cascading(self, views, start_date, end_date):  
    """  
    1. Scan storage availability for each view's source dataset.  
    2. If gaps are found -> auto-fetch from the ERP source.  
    3. Build aggregates if necessary.  
    4. Load into analytical materialized views.  
    5. Return a summary report of fetch/refresh status.  
    """  
```  
  
### The GUI: Human-Friendly Orchestration  
Retail analysts are rarely software engineers. We built a lightweight GUI layer that exposes pipeline control without requiring them to touch the CLI.  
  
**The workflow:**  
1. Click "Refresh Pipeline."  
2. The system checks raw data parity against target dates.  
3. It identifies gaps, triggers the extraction modules, and updates downstream views.  
4. A dashboard summary displays exactly what was processed.  
  
## The War Story: OS-Level File Locks  
No retail data project is complete without battle scars. Ours involved file-locking issues.   
  
While DuckDB is exceptional for analytical performance, running it on systems where background processes (like file indexers or security scanners) can touch the data file creates a classic "File in use" error.   
  
**The Solution:** We decoupled the **Build Phase** from the **Query Phase**. The orchestration GUI handles all writes and rebuilds, while the dashboard app connects to the database in a read-only mode. This separation of concerns eliminated contention and ensured the dashboard never crashed during a refresh.  
  
## The Validation Layer: Trust, But Verify  
Retail margin calculation is complex—accounting for cost adjustments, latest-known-cost rules, and adjustments for promotional stock. We added a **Validation Step** before the data is ever exposed to the dashboard:  
  
*   **Schema Check:** Are all required columns present?  
*   **Data Integrity:** Are there null or unexpected zero values in critical fields (like gross profit)?  
*   **Anomaly Detection:** Are there negative costs or revenue flags?  
*   **Partition Audit:** Does the partition actually contain records, or is it an empty ghost file?  
  
## Business Impact: The "Efficiency Shift"  
  
| Metric | Before | After |
| :--- | :--- | :--- |  
| **Backfilling missing data** | ~30 minutes manual work | 3 minutes, one-click |
| **Dimension maintenance** | High (manual refresh) | Automatic refresh on trigger |
| **Failures** | Silent / Dashboard blank | Explicit validation with audit logs |
| **Data Extraction** | Manual UI exports | Automated pipeline orchestration |
  
**The real win:** When a stakeholder reports a data discrepancy, we can now validate, backfill, and refresh while they are still on the line. The pipeline heals itself once triggered.  
  
## Key Technical Lessons  
1.  **Compose, Don't Repeat:** Standardize your extraction logic into modular components. A script written once should serve as a building block for future automation.  
2.  **Scan Before Fetch:** When identifying gaps, group consecutive missing dates into ranges. It is far more efficient to make one bulk request to your ERP than 30 individual daily requests.  
3.  **Validate at the Raw Level:** Don't wait for the BI tool to visualize an error. Implement data quality checks on the raw files (Parquet/CSV) immediately after the ETL step.  
4.  **Decouple Processes:** If your environment is prone to file-locking, separate the writer (orchestrator) and the reader (dashboard app) processes completely.  
  
## Conclusion: The Data Team as Pipeline Engineers  
Modern retail analysis isn't just about writing SQL; it's about building resilient systems that detect their own gaps and recover gracefully.   
  
When you know exactly which days were fetched, which aggregates were rebuilt, and whether the underlying data passes quality checks, you move from "reporting" to "data culture."   
