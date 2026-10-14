---
title: "Testing Landing Pages, One Teddy Bear at a Time: A Fuzzy Factory Story"
description: "Three years of e-commerce data from a stuffed-animal shop: A/B-testing landing pages, finding the conversion winner, and learning who actually comes back."
date: "2026-10-14"
author: "Robi Maulana"
tags: [data-science, eda, ecommerce, conversion, ab-testing, python]
thumbnail: "/images/maven-fuzzy-factory/landing_page_cvr.png"
---

# Testing Landing Pages, One Teddy Bear at a Time: A Fuzzy Factory Story

## 1. Opening the shop doors

Picture a small online toy shop that sells exactly four stuffed animals. The Original Mr. Fuzzy, a beige teddy. The Forever Love Bear. The Birthday Sugar Panda. And later, a mini bear named after the Hudson River.

For three years, every visitor, every click, and every checkout was logged. When I opened the workbook, I found 472,871 website sessions, 1,188,124 pageviews, and 32,313 orders -- a complete diary of how a tiny bear store grew into a business grossing nearly $2 million.

But the most interesting story is hiding in the landing pages. Over three years, the shop tested five different home pages. Some flopped. One was a champion. The data lets us replay the whole experiment.

## 2. The database behind the store

Six tables, one relational story. A customer lands on the site (website_sessions), clicks through pages (website_pageviews), buys (orders), and sometimes asks for money back (order_item_refunds). The catalog has 4 products (products), and each line item is recorded (order_items).

| Table | Rows | Role |
|---|---|---|
| website_sessions | 472,871 | Each visit: device, UTM source/campaign, repeat or new |
| website_pageviews | 1,188,124 | Every page view, with URL path |
| orders | 32,313 | Order totals: items, price, COGS |
| order_items | 40,025 | Per-product lines inside orders |
| order_item_refunds | 1,731 | Refunds per item |
| products | 4 | The stuffed-animal catalog |

The time span is exactly three years: 19 March 2012 to 19 March 2015.

The data dictionary defines every field, and the joins are clean: sessions to orders via website_session_id, orders to items via order_id, items to refunds via order_item_id.

## 3. The goals

Three questions shaped this analysis:

1. Which landing page converts best -- and can we see the A/B tests in the data?
2. Do customers come back? How much is a repeat customer worth?
3. Where does the traffic come from, and which channels actually pay?

## 4. How I worked through it

**Step 1 - Land the session.** A session's landing page is simply its first pageview:

```python
first_pv = views.sort_values("created_at").groupby("website_session_id").first()
```

**Step 2 - Attach the order.** Merge sessions to orders, then compute conversion rate, average order value, and revenue per session for each landing page.

**Step 3 - Replay the tests fairly.** Comparing lander-2 to lander-3 overall is unfair if they served different time periods. So I compared them only in the months where both were live side by side.

**Step 4 - Follow the customer.** Number each customer's orders (first, second, third) and measure how many ever ordered again -- the repeat-purchase rate.

## 5. Finding 1: The landing page saga -- two failures before a champion

Here is the full ledger of landing pages, ranked by conversion rate:

| Landing page | Sessions | CVR | Revenue/session |
|---|---|---|---|
| /lander-5 | 68,166 | 10.17% | $6.43 |
| /lander-2 | 131,170 | 7.72% | $4.53 |
| /lander-4 | 9,385 | 7.54% | $4.84 |
| /home | 137,576 | 7.06% | $4.25 |
| /lander-1 | 47,574 | 4.53% | $2.29 |
| /lander-3 | 79,000 | 3.39% | $2.10 |

![Conversion rate by landing page](/images/maven-fuzzy-factory/landing_page_cvr.png)

Read it like a timeline. The shop launched on /home (7.06%) and in June 2012 tried /lander-1 -- a flop at 4.53%, half the home page's conversion. They kept it hidden in the data: it ran for a year before lander-2 replaced it.

In January 2013, lander-2 arrived and finally beat home: 7.72%. Then July 2013 brought lander-3, and it was a disaster -- 3.39%, less than half of lander-2. The side-by-side months tell the story without mercy:

| Month | lander-2 | lander-3 |
|---|---|---|
| Jul 2013 | 7.01% | 3.85% |
| Aug 2013 | 7.59% | 3.60% |
| Sep 2013 | 8.06% | 2.97% |
| Oct 2013 | 8.14% | 2.77% |
| Nov 2013 | 7.31% | 3.21% |
| Dec 2013 | 7.51% | 3.92% |
| Jan 2014 | 8.57% | 2.65% |

For seven straight months lander-2 converted at double or triple lander-3. A textbook losing test. Then came lander-4 (Feb 2014, 7.54%, about equal to lander-2) and finally lander-5 in August 2014: 10.17% conversion, $6.43 per session -- 45% better than the next best page and the clear champion.

The pattern is the insight: this shop tested relentlessly, killed losers quickly, and each successful iteration (lander-2, lander-5) was worth millions of incremental dollars. A single landing page decision separated 3.4% from 10.2% -- a 3x swing on the same traffic.

## 6. Finding 2: The repeat-customer question -- nobody comes back (almost)

This is the sobering chapter. Of 31,696 unique buyers:

| Metric | Value |
|---|---|
| Repeat buyers (2+ orders) | 591 (1.86%) |
| Repeat orders share | 1.91% of all orders |
| Repeat revenue share | $38,238 (1.97% of total) |
| Avg spend per buyer | $61.16 |
| Avg spend of repeat buyers | $125.81 |

Only 591 of 31,696 customers ever bought a second time. Repeat orders bring in less than 2% of revenue. This store lives or dies by first-time buyers -- which makes the landing page story in Finding 1 even more important: there is no loyalty cushion to absorb a bad page.

The one bright spot: when a customer does return, they spend about double ($126 vs $61). But 98% of revenue is acquisition-driven. Retention is the biggest untapped lever in this dataset.

## 7. Finding 3: Google is the front door -- and mobile is leaking

The traffic mix over three years:

| Channel | Sessions | Share | CVR |
|---|---|---|---|
| gsearch | 316,035 | 66.8% | 6.75% |
| direct | 83,328 | 17.6% | 7.34% |
| bsearch | 62,823 | 13.3% | 7.19% |
| socialbook | 10,685 | 2.3% | 3.21% |

![Conversion by channel](/images/maven-fuzzy-factory/channel_cvr.png)

Two-thirds of all traffic comes from Google search, and the biggest single campaign is "gsearch nonbrand" at 282,706 sessions (60% of everything). The store is one bid-price increase away from a traffic crisis.

Socialbook converts at 3.21% -- half of every other channel. Either the audience is wrong or the content is; either way, it is the clear candidate to cut.

The device split adds another leak: desktop converts at 8.50%, mobile at just 3.09%. Mobile is 31% of traffic but contributes far less than its share of orders. A mobile checkout audit would likely pay for itself.

## 8. Finding 4: The money story -- one bear carries the shop

Total revenue across three years: $1,938,510. Gross margin: 62.7% ($1,216,140). Average order value: $59.99, with 1.24 items per order.

![Revenue by product](/images/maven-fuzzy-factory/product_revenue.png)

But the product mix tells a concentration story:

| Product | Launched | Revenue | Share |
|---|---|---|---|
| The Original Mr. Fuzzy | Mar 2012 | $1,211,058 | 62% |
| The Forever Love Bear | Jan 2013 | $347,702 | 18% |
| The Birthday Sugar Panda | Dec 2013 | $229,260 | 12% |
| The Hudson River Mini bear | Feb 2014 | $150,490 | 8% |

Mr. Fuzzy, the very first product, still delivers 62% of all revenue three years later. Every new product added a new revenue stream, but none came close to the original. The growth curve (60 orders in month one, 1,254 in the final month, peaking at 2,314 in December 2014) came mostly from more customers, not more products per customer.

Refunds are a modest but real drain: 1,731 refunds (4.32% of order items) worth $85,339 (4.4% of revenue) -- about normal for online retail, but Mr. Fuzzy again dominates the count (1,237 of 1,731), simply because it sells the most.

## 9. The next chapter: recommendations

1. **Give lander-5 the whole stage.** It converts at 10.17% versus 7.72% for the runner-up -- on 68k sessions that is roughly 1,600 extra orders and ~$100k extra revenue. Kill every other landing page.
2. **Treat finding 3 as a crisis.** 60% of traffic from one non-brand Google campaign is fragile. Test paid social again with better creative, and fix the mobile checkout funnel -- 3.09% vs 8.50% desktop is a multi-hundred-thousand-dollar leak.
3. **Build a retention program from zero.** With 1.86% repeat buyers, a simple post-purchase email or a "second bear at a discount" offer could be the single highest-ROI lever available.
4. **Diversify the catalog pitch.** Mr. Fuzzy at 62% of revenue is a product risk. Cross-sell the Mini bear (cheaper, Feb 2014 launch) as an add-on to Mr. Fuzzy orders.
5. **Keep the testing culture.** The data shows a 3x conversion spread between the best and worst landing pages. The next lander-6 test should be run against lander-5, not the old losers.

## 10. Limitations

1. **Not a controlled experiment.** Landing pages changed over time along with campaigns, seasons, and product launches. The side-by-side month comparisons control for time, but not for traffic-mix shifts.
2. **No cost data.** Channels are ranked by revenue and conversion, but ad spend is missing, so true ROAS per channel cannot be computed.
3. **Attribution is last-click-ish.** Order revenue is credited to the session where it happened; a customer who came via gsearch, left, and returned via direct gets counted as direct.
4. **The cohort window ends in March 2015.** Repeat-purchase rates are measured over the observed period; the newest cohorts have less time to repeat.
5. **Refund linkage is partial.** Refunds track order items well, but the data does not include reason codes, so we cannot say why Mr. Fuzzy leads refund counts beyond volume.
6. **Small product catalog (4 SKUs).** Product-level patterns are suggestive; with four products, a single marketing push can dominate a product's numbers.