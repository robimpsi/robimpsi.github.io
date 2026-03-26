---
title: "Surviving the Ramadan Retail Rush: Building Lightweight Systems to
  Prevent Revenue Loss"
date: 2026-03-26
description: Here is how I contribute on my work for the recent festive season.
tags: Festive Season, Analysis
---
Ramadan in Indonesia isn’t just a festive season; it’s a massive retail event driven by the *mudik* (homecoming) phenomenon and Eid al-Fitr preparations. Across the country, the retail sector often sees consumption spikes of up to 30%.

At our store—the largest non-franchise retail center in Bengkulu Province—the impact is even more extreme. Based on our internal data, transaction volumes surge by **120%** compared to a regular month.

While this surge in demand is a massive opportunity, it also tests the absolute limits of retail infrastructure. Last year, we found out exactly what happens when those limits break.

## **The Catalyst: A Peak-Season Server Crash**

Last year, on the busiest night of the season, our ERP system crashed. The server simply couldn't handle the transaction capacity, which was operating at a multiple of our normal load.

Our IT consultants fought to keep the system alive and process transactions as best they could, but the continuous influx of customers created a massive bottleneck at the cash registers. Lines stopped moving. Frustrated customers began abandoning their carts. By the time the night was over, that single outage had cost us an estimated **20% of our target revenue** for the evening.

Going into this year’s peak season, I had one operational goal: **Keep transactions flowing, even if the primary ERP fails.**

To achieve this, I built three lightweight, highly accessible tools to support our frontline staff.

## **1. A Cloud-Based Backup POS (Point of Sale) System**

If the ERP went down again, we needed a fully functional fallback that cashiers could switch to immediately.

I initially built a macro-heavy spreadsheet, but quickly realized a major constraint: our POS terminal machines do not have spreadsheet software installed. To solve this, I migrated the build to **Google Sheets combined with Google Apps Script**.

### **Why Google Sheets?**

Because every POS terminal has a web browser. As long as the terminals had internet access, they could load the Google Sheet backend. By utilizing Apps Script and an HTML-based frontend, I built a UI that looked and behaved like standard POS software, drastically reducing the learning curve for cashiers.

**Key Features of the Backup POS:**

- **Cashier Authentication:** Secure login using assigned usernames and PINs.
- **Full Transaction Capability:** Supports dual-payment methods (e.g., split cash/card), returns, subtotaling, and change calculation.
- **Operational Logging:** Dedicated backend worksheets for product data, payment logs, and end-of-day cashier reconciliation.

![login page](/images/image-1.png)

![tampilan pos](/images/image-2.png)

![support multiple payments](/images/image-3.png)

![image.png](/images/image-4.png)

**The Trade-off:** Because it is browser-based, it cannot trigger the receipt printer directly (receipts have to be downloaded as PDFs first). However, during simulation testing, we found that because it bypasses the live ERP server entirely, product scanning and operational speeds were actually *faster* than our primary system.

While we didn’t suffer an ERP crash this year, having this fallback ready gave our team immense peace of mind.

&nbsp;

## 2. **A Custom Price Checker for Manual Discount Campaigns.**

Peak seasons are the perfect time to liquidate slow-moving inventory. To do this, we strategically placed slow-moving items in high-traffic center aisles and applied aggressive, manual discounts to rotate them out for new stock.

**The Problem:** We assigned extra sales clerks to the floor to help customers, but with a massive number of SKUs, they struggled to memorize the special discount prices. They had to rely on printed price lists, which were slow to navigate during rushes. While our primary ERP has a price-checker module, it hard-coded primary prices and couldn’t support the manual discount logic we were using for this specific campaign.

**The Solution:** I built a customized, mobile-friendly Price Checker. Like the backup POS, it is powered by Google Sheets and Apps Script, displaying product names and discounted prices in a clean, fashionable UI.

![image.png](/images/image-5.png)

&nbsp;

**The Best Feature: Fuzzy Search** In retail, barcodes get damaged all the time. If a barcode scan failed, I implemented a fuzzy search function. Clerks could type in a partial product name, and the UI would instantly return a list of probable SKU matches.

&nbsp;

![image.png](/images/image-6.png)

![image.png](/images/image-7.png)

&nbsp;

### The Result

It's always feel great to be helpful. The tool was a massive hit. Both sales clerk and cashier using constantly to verify sale items, and they felt it's more fast and convenient than looking at a printed price list.

&nbsp;

## 3. **Proactive Stock Depletion Alerts**

When demand for a product increases, inventory moves more frequently, and items in the sales area tend to run out faster. To address this, we need a reliable way to detect when stock is running low.

**Our Approach:**

1. **Inventory Tracking by Location** – Our management system categorizes each SKU (Stock Keeping Unit) by its location: either the **sales area** (where customers shop) or the **warehouse** (where backup stock is stored).
2. **Monitoring Sales Area Stock** – For each item in the sales area, I track its remaining quantity and compare it to its **sales frequency** (how quickly it sells).
3. **Alerts for Restocking** – If the available stock falls below the expected sales rate, I notifies the responsible employee to **refill the item** from the warehouse.

&nbsp;

## **The Outcome & Looking Forward**

This season, the returns exceeded our highest expectations. We handled the historic surge in demand gracefully. Customers were served quickly, shelves stayed stocked, and both our staff and management were highly satisfied.

For me, building these tools reinforced a critical operational lesson: **Resilience in retail doesn't always require expensive software; it requires identifying the exact points of failure and building accessible, targeted workarounds.**

&nbsp;

### **Next Steps for Continuous Improvement**

While these tools were successful, I am already looking at ways to iterate for the next peak season:

- **Local Print Bridging:** Exploring cloud-print alternatives or local scripts to allow the Google Sheets POS to fire the thermal receipt printer automatically.
- **Automated ERP Syncing:** Writing a script to automatically queue and push the backup POS transaction logs back into the primary ERP database once the server recovers.
- **Automated Alert Routing:** Pushing the low-stock alerts directly to staff via automated WhatsApp or Telegram bot messages for faster response times.

&nbsp;

&nbsp;

&nbsp;