---
title: Optimizing a Streamlit Price Tag Generator for 55,000 Products From 8
  Seconds to 1 Microsecond
date: 2026-04-19
description: Since our built-in price tag generator didn't produce the results
  we wanted, we decided to build our own. But, our big data presents a new
  problem.
tags: Streamlit
---
## The Challenge: Speed at Scale  
  
When building an internal label-generation tool for a retail operation with a large product catalog, we hit a serious performance wall.  
  
What started as a simple web application for printing shelf labels became a lesson in data formats, caching strategies, and the behavior of reactive web frameworks.  
  
The initial problem was straightforward but painful: every product lookup took several seconds. For a user scanning a batch of items to generate printable labels, that meant minutes of waiting for what should have felt like an instant workflow.  
  
For a production support tool used by frontline staff, that delay was unacceptable.  
  
## Identifying the Bottlenecks  
  
### Problem 1: Treating a Spreadsheet Like a Database  
  
The original implementation loaded product data from a spreadsheet export on every lookup.  
  
That spreadsheet contained tens of thousands of product records, including barcodes, names, prices, and promotional values. Each lookup required parsing the entire file again.  
  
This was fundamentally the wrong tool for the job.  
  
Spreadsheets are great for manual review and business handoff. They are not optimized for repeated low-latency lookups in an application.  
  
### Problem 2: Reactive App Re-Execution  
  
The app was built using a reactive Python web framework. In this model, the script may re-run whenever the user interacts with the page.  
  
That means a text input, button click, or widget update can trigger a full re-execution of application logic.  
  
Because the original implementation loaded the product catalog during normal page rendering, the app repeatedly re-read and re-parsed the same dataset. The framework’s reactivity amplified the spreadsheet bottleneck.  
  
### Problem 3: UI State and Widget Refresh Issues  
  
After a successful barcode lookup, the app needed to populate fields such as product name, price, and discount.  
  
However, the UI did not always reflect the newly populated values immediately. The reason was widget state: many reactive frameworks maintain internal widget state separately from backend variables.  
  
Updating the backend state alone was not enough. The UI widgets also needed a reliable refresh strategy.  
  
## The Optimization Journey  
  
### Phase 1: Add Basic Application-Level Caching  
  
The first improvement was to cache the loaded product dataset so it was not parsed on every interaction.  
  
This reduced repeated work, but it did not fully solve the problem. The app was still relying on a spreadsheet as the underlying data source, and spreadsheet parsing remained expensive whenever the cache expired or the data changed.  
  
Caching helped, but it was not the real architectural fix.  
  
### Phase 2: Move from Spreadsheet Format to Columnar Storage  
  
Next, we converted the product catalog into a query-friendly columnar format.  
  
Columnar formats are much better suited for read-heavy workloads because they support compression, efficient scanning, and fast access to selected fields.  
  
The result was a much smaller data file and significantly faster load times.  
  
The workflow became:  
  
1. Accept the spreadsheet export as the business-friendly input format.  
2. Convert it into an optimized application format.  
3. Use the optimized format for all runtime lookups.  
  
This preserved the operational convenience of spreadsheets while removing them from the critical performance path.  
  
### Phase 3: Build an In-Memory Lookup Index  
  
Even with a faster file format, querying storage for every scan was still unnecessary.  
  
The breakthrough came from loading the product catalog into an in-memory dictionary-like structure at startup.  
  
The lookup key was the barcode. The value contained the product metadata needed for label generation, such as:  
  
- Product name  
- Base price  
- Promotional price or discount  
- Other label fields  
  
This changed the lookup pattern from repeated file scans to direct hash-based access.  
  
Instead of asking, “Search the dataset for this barcode,” the app could ask, “Give me the record mapped to this barcode.”  
  
That made lookups effectively instantaneous from the user’s perspective.  
  
### Phase 4: Cache the Service Object, Not Just the Data  
  
Reactive frameworks often distinguish between caching data and caching resources.  
  
For this use case, the most valuable object was not just the raw product table. It was the initialized lookup service: the object that already had the optimized product index loaded into memory.  
  
By caching the service object at the application level, the app avoided rebuilding the in-memory index on every interaction.  
  
This was especially important because the product catalog was mostly static during a working session. There was no reason to reload the same reference data repeatedly while a user was scanning items.  
  
### Phase 5: Fix Widget State Refresh  
  
The next issue was UI consistency.  
  
After a barcode lookup, the backend state was correct, but the visible fields were sometimes stale because the framework preserved widget state across re-renders.  
  
The solution was to explicitly regenerate affected widgets when lookup data changed. In practice, this meant using dynamic widget identifiers or another controlled refresh mechanism so that populated fields displayed the newly retrieved product data immediately.  
  
This was not a database problem. It was a framework-state problem.  
  
Understanding that distinction was key.  
  
### Phase 6: Add Batch Lookup Mode  
  
Finally, we improved the scanning workflow itself.  
  
Instead of looking up each barcode immediately as it was entered, we added a batch mode:  
  
1. The user scans multiple barcodes rapidly.  
2. The app stores the raw barcode list without doing heavy UI updates.  
3. The user clicks one lookup button.  
4. The app resolves all products in a single batch.  
5. The user generates the printable labels.  
  
This eliminated per-keystroke processing during the scanning phase and made the workflow feel much faster.  
  
In practice, this mattered as much as backend speed. A tool can have a fast lookup engine and still feel slow if the UI interrupts the user after every scan.  
  
## Results  
  
The improvement was dramatic.  
  
| Area | Before | After |
|---|---|---|  
| Product lookup | Several seconds per item | Effectively instant |
| Batch label preparation | Minutes for a medium-sized batch | Seconds |
| Runtime data format | Spreadsheet-based | Optimized columnar format |
| Lookup strategy | Repeated parsing/scanning | In-memory key-value lookup |
| User experience | Interruptive and slow | Smooth batch workflow |
| File size | Large spreadsheet export | Compressed application-ready dataset |
  
The application went from feeling frustrating to feeling immediate.  
  
Users can now scan a batch of items, review the results, and generate printable labels without waiting through repeated product lookups.  
  
## Deployment Considerations  
  
Moving the tool from local development to a managed cloud environment introduced several practical issues:  
  
1. **Path handling**    
   Runtime paths needed to be resolved relative to the application directory rather than relying on local machine assumptions.  
  
2. **Directory creation**    
   The app needed to create expected data and output directories safely during startup.  
  
3. **Font fallbacks**    
   Label generation required default fonts when custom fonts were unavailable in the deployment environment.  
  
4. **Dependency pinning**    
   Data-processing and PDF-generation libraries needed explicit version pinning to avoid deployment inconsistencies.  
  
These were not glamorous problems, but they mattered. A fast application is not useful if it fails during deployment.  
  
## Future Improvements  
  
### 1. Background Data Loading  
  
For much larger catalogs, the product index could be loaded in the background so that the UI remains responsive during startup.  
  
### 2. Tiered Caching  
  
A two-tier strategy could improve startup speed further:  
  
- Load the most frequently used products immediately.  
- Load the rest of the catalog lazily on first access.  
  
This would optimize for real user behavior instead of treating every product as equally likely to be scanned.  
  
### 3. Client-Side Catalog Cache  
  
For repeat users, selected catalog data could be cached in browser storage or another local mechanism to reduce server round-trips.  
  
### 4. Scanner-Friendly Input Handling  
  
Barcode scanners often behave like keyboards, which means focus management becomes important. Improving scan input handling could make the workflow smoother for high-volume use.  
  
### 5. Direct Print Integration  
  
Instead of generating a PDF and requiring a manual print step, future versions could explore direct print workflows or browser print integration with pre-formatted templates.  
  
### 6. Product Image Support  
  
Adding product images to labels would require thumbnail optimization and a dedicated image caching strategy.  
  
### 7. Automated Data Refresh  
  
The current workflow can be improved by connecting the label generator to a controlled data refresh process, ensuring product and pricing updates are reflected without manual file replacement.  
  
## Key Takeaways  
  
1. **Do not use spreadsheets as runtime databases**    
   Spreadsheets are useful interchange formats, but they are poor choices for repeated application lookups.  
  
2. **Choose the right storage format**    
   Columnar formats are excellent for compact, read-heavy reference data.  
  
3. **Cache at the right layer**    
   Caching a fully initialized service can be more effective than caching raw data alone.  
  
4. **Use in-memory indexes for static reference data**    
   If the dataset fits comfortably in memory, dictionary-style lookups can outperform repeated database or file queries.  
  
5. **Understand your framework’s execution model**    
   Reactive frameworks are productive, but they require careful handling of state, caching, and widget refresh behavior.  
  
6. **Design for batch workflows**    
   Perceived performance improves when users can scan continuously and process results in one step.  
  
This optimization transformed a slow internal utility into a responsive operational tool. The biggest lesson was simple: performance problems are often not solved by adding more hardware, but by putting the right data in the right format at the right time.  
