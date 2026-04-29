---
title: Building a Self-Healing ETL Pipeline, A Retail Data Team's Journey
date: 2026-04-29
description: How we turned a brittle data backfill process into an intelligent,
  self-correcting system—and why DuckDB file locks became our unexpected teacher
tags: DuckDB
---
As a data analyst in the retail sector, my day revolve around one critical question: **"Do we trust our numbers?"**   
  
My goal for building this BI dashboard is to help our super get yesterday's gross profit by product category, or when the inventory team needs to know which SKUs are turning into dead stock. They don't have to think about the ETL pipeline's feelings. All I want to give them is accurate data, fast.  
  
Our stack looks familiar to many retail teams:  
- **Odoo ERP** as the operational source of truth (POS sales, purchases, inventory moves)  
- **DuckDB** for analytical querying and materialized views  
- **Parquet files** with Hive partitioning for cost-effective storage  
- **Polars** for fast data processing  
- **Celery** for orchestration  
  
The problem? Our backfill process was a house of cards.  
  
---  
  
## The Pain Point: "Just Run the Script Again"  
  
Every retail analyst knows the scenario: A store manager reports discrepancies in March's profit numbers. We investigate and realize the cost data from February purchases never made it into the calculation. We need to backfill.  
  
**The old process:**  
1. SSH into the server  
2. Find the right extraction script  
3. Run it for the missing date range  
4. Run the cleaning script  
5. Run the star schema update  
6. Realize the dimensions are stale  
7. Refresh dimensions  
8. Rebuild the aggregates  
9. Refresh the DuckDB materialized views  
10. Pray nothing fails halfway through  
  
Oh, and if DuckDB was already open in another process? **IO Error: File is already open in dllhost.exe.**  
  
---  
  
## The Solution: A Self-Healing Pipeline  
  
We wanted something better. A system that:  
1. **Scans** for missing data automatically  
2. **Fetches** from Odoo when gaps are detected  
3. **Builds** aggregates incrementally  
4. **Validates** the results  
5. **Reports** what it did  
  
### The Architecture  
  
```python  
# The cascading refresh flow  
def refresh_materialized_views_cascading(views, start_date, end_date):  
    """  
    1. Scan parquet availability for each view's source dataset  
    2. If missing data → auto-fetch from Odoo using force refresh scripts  
    3. Build aggregates (sales, profit) if needed  
    4. Load into DuckDB materialized views  
    5. Return detailed report of what was fetched vs. what was present  
    """  
```  
  
The key insight: **Force refresh scripts** (standalone modules that bypass Celery and directly extract from Odoo) became building blocks. Instead of reinventing extraction logic, we composed them:  
  
- `force_refresh_pos_data.py` → POS sales + invoice sales + inventory moves  
- `force_refresh_purchase_data.py` → Purchase invoices  
- `force_refresh_stock_quants.py` → Inventory snapshots  
- `force_refresh_dimensions.py` → Product/location/lot masters  
  
### The GUI: Making It Human-Friendly  
  
Retail analysts aren't always Python developers. So we built a Tkinter GUI that exposes the complexity without requiring code:  
  
```  
[Scan MV vs Parquet] [Refresh All MVs] [Refresh Selected MVs] | [Validate Profit] [Build Aggregates]  
```  
  
**The magic:** Clicking "Refresh All MVs" now:  
1. Checks which dates have raw parquet data  
2. Auto-fetches missing dates from Odoo (self-healing!)  
3. Builds sales aggregates  
4. Builds profit aggregates    
5. Loads everything into DuckDB  
6. Shows a summary: *"Auto-fetched 15 days from Odoo. Built 2 aggregate types. Refreshed 5 views."*  
  
---  
  
## The War Story: dllhost.exe and the File Lock  
  
No retail data blog is complete without battle scars. Ours is `dllhost.exe`.  
  
DuckDB is amazing—columnar, fast, SQL-friendly. But on Windows, if any process (even a stray file explorer preview) touches the `.duckdb` file, you get:  
  
```  
duckdb.duckdb.IOException: IO Error: File is already open in   
C:\Windows\System32\dllhost.exe  
```  
  
**The solution:** We separated the build phase from the query phase. The GUI tool orchestrates all writes and materialized view builds; the analytics app only queries the result in read-only mode. Separation of concerns eliminated the file locks completely.  
  
---  
  
## The Validation Layer: Trust But Verify  
  
Retail profit calculation is tricky. Tax-adjusted costs. Latest-known-cost rules (you can't use April prices for March sales). Bonus items that should have zero cost.   
  
We added a **Profit Validation** button that checks:  
- Are all required columns present?  
- Are there null gross profit values?  
- Are there negative COGS (usually a data quality red flag)?  
- Does the partition have any records at all?  
  
```  
2025-04-15: VALID (1,247 records, 0 issues)  
2025-04-16: INVALID (892 records, 15 null gross_profit values)  
```  
  
Now when the CFO asks, *"Are these numbers right?"* we have an automated answer with an audit trail.  
  
---  
  
## Business Impact: What This Actually Means  
  
| Before | After |
|--------|-------|  
| 30 minutes to backfill a week of missing data | 3 minutes, one button click |
| "Oops, forgot to refresh dimensions" | Automatic dimension refresh when needed |
| Silent failures (missing parquet → empty reports) | Explicit validation with issue counts |
| "Why is the dashboard blank?" | Self-documenting fetch logs |
| Manual Odoo exports via UI | Automated extraction orchestrated from GUI |
  
**The real win:** When a store reports data issues, we can now validate, backfill, and refresh MVs while they're still on the phone. The pipeline heals itself once triggered; we just steer it.  
  
---  
  
## Technical Lessons for Retail Teams  
  
### 1. Compose, Don't Repeat  
Those force refresh scripts we wrote months ago? They're now the engine of a larger system. Modular design pays compound interest.  
  
### 2. Scan Before Fetch  
The `_scan_parquet_availability()` method groups consecutive missing dates into ranges. Instead of 30 individual fetches for a month's gaps, we do 2-3 range fetches. Respect your source system's API limits.  
  
### 3. Validate at the Parquet Level  
Don't wait until the dashboard to find data quality issues. Check the raw files:  
  
```python  
df = [pl.read](http://pl.read)_parquet(parquet_files[0])  
null_profit = df["gross_profit"].is_null().sum()  
negative_cogs = (df["cogs_tax_in"] < 0).sum()  
```  
  
### 4. Windows + DuckDB = Careful Architecture  
File locks are real. Build explicitly from your ETL scripts; query read-only from your apps. Never let two processes write simultaneously.  
  
---  
  
## The Code: A Peek Under the Hood  
  
For fellow teams who want to implement similar patterns:  
  
```python  
# The core cascading refresh logic  
def refresh_materialized_views_cascading(self, views, start_date, end_date):  
    # Map views to their source datasets  
    view_to_dataset = {  
        "mv_sales_daily": "pos",  
        "mv_profit_daily": "profit",  
        "mv_inventory_daily": "stock_quants",  
    }  
      
    # Step 1: Check and fetch missing raw data  
    for view in views:  
        dataset_key = view_to_dataset.get(view)  
        availability = self._scan_parquet_availability(  
            dataset_key, start_date, end_date  
        )  
          
        if availability["missing_count"] > 0:  
            fetch_results = self._auto_fetch_missing_data(  
                dataset_key, availability["missing"]  
            )  
            # Log what was fetched for the audit trail  
      
    # Step 2: Build aggregates  
    if views & {"mv_sales_daily", "mv_sales_by_product"}:  
        self.backfill_aggregates("sales_aggregates", start_date, end_date)  
      
    # Step 3: Load into DuckDB  
    DuckDBManager().ensure_materialized_views(views)  
```  
  
---  
  
## Conclusion: The Team as Pipeline Engineers  
  
Modern retail data analysis isn't just about writing SQL or building dashboards. It's about building **resilient systems** that can detect their own gaps and recover gracefully.  
  
The self-healing pipeline we built isn't perfect. But when `dllhost.exe` locks a file again, we now know exactly which 15 days were fetched from Odoo, which aggregates were rebuilt, and whether our profit calculations are valid.  
  
**That's the difference between a dashboard and a data culture.**  
  
---  
  
*Want to implement something similar? The key primitives are: (1) partitioned parquet storage with Hive-style paths, (2) standalone force-refresh scripts for each data source, (3) a scanner that detects gaps, and (4) a cascading orchestrator that fills them. Start simple, add validation, then build the GUI.*  
