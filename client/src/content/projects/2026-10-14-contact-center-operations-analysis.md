---
title: "79.2%: The Story of a Contact Center That Almost Made SLA"
description: "Simulating and analyzing 60 days of contact center operations -- SLA, ASA, AHT, shrinkage, and the outages that sent service levels off a cliff."
date: "2026-10-14"
author: "Robi Maulana"
tags: [data-science, eda, contact-center, operations, python]
thumbnail: "/images/contact-center/daily_sla_volume.png"
---

# 79.2%: The Story of a Contact Center That Almost Made SLA

## 1. The phone rings at 10:07

It is a Monday. The CRM integration just died at 10:00. A customer on hold for 78 seconds hangs up. Then another. By noon, 65% of callers have abandoned, service level has crashed from 79% to 20%, and every agent's handle time has stretched from 6.2 minutes to 8.3 -- because they are retyping everything by hand.

This is not a real company. I built it: a simulated contact center with 48 agents, four queues, 60 days of operations, and 47,441 calls. Why simulate? Because the skill set I want to demonstrate -- operational analytics, KPI forensics, anomaly detection -- needs a playground where the ground truth is known. In a simulated dataset I know exactly which days had outages and which had promo spikes. The job is to find them again through the numbers.

This is the story of what the numbers revealed.

## 2. The operation behind the data

The dataset has four tables, designed to mirror a real contact center's data warehouse:

| Table | Rows | Role |
|---|---|---|
| agents | 48 | Agent roster: team, tenure, hire date, shift pattern |
| schedule | 2,469 | Daily plan per agent: scheduled/logged minutes, break, lunch, training, meeting, other |
| calls | 47,441 | Every call: queue, wait, talk, hold, ACW, agent, abandoned flag, SLA hit, outage tag |
| outage_events | 3 | System incidents with start/end time |

**agents.csv** -- agent_id, team (Tech Support / Billing / Sales / Customer Care), tenure_years, hire_date, shift_pattern (morning/evening/mid).

**schedule.csv** -- one row per agent per day: scheduled_min (480 = 8-hour shift), logged_min (actual time logged in), then the shrinkage components: break, lunch, training, meeting, other minutes.

**calls.csv** -- one row per call: timestamp, queue, wait_sec (time to answer), talk_sec, hold_sec, acw_sec (after-call work), agent_id, abandoned flag, sla_hit (wait <= 20 seconds), and outage_id when the call landed inside a system outage.

**outage_events.csv** -- OUT-01 (CRM system outage, 15 Jan 10:00-12:00), OUT-02 (network failure, 3 Feb 14:30-16:00), OUT-03 (WFM tool bug, 21 Feb 09:30-10:45).

The time span: 1 January to 29 February 2024 (60 days). Call volume follows a realistic intraday curve (peak at 15:00), and 28 January and 14 February carry promo spikes. The seed is fixed, so the dataset is fully reproducible.

## 3. The goals

A contact center operations analyst's job is to answer three questions, over and over, for every spike and dip in the dashboard:

1. Are we hitting service level? If not, is it a volume problem, a staffing problem, or a system problem?
2. Who are the operators and queues -- and where does handle time really come from?
3. What do the operational KPIs (adherence, shrinkage, occupancy) say about the floor?

## 4. How the analysis works

**Step 1 - Define the KPIs.** Service level = share of calls answered within 20 seconds. ASA = average speed of answer. AHT = talk + hold + ACW. Shrinkage = off-phone minutes / logged minutes. Adherence = logged / scheduled.

```python
sla_rate = calls["sla_hit"].mean()          # wait <= 20s
asa      = calls["wait_sec"].mean()
aht      = ans[["talk_sec","hold_sec","acw_sec"]].sum(axis=1).mean() / 60
shrink   = sched["off_phone_min"].sum() / sched["logged_min"].sum()
adher    = sched["logged_min"].sum() / sched["scheduled_min"].sum()
```

**Step 2 - Slice by queue and by time.** Group calls by queue, by hour of day, and by date to find where the KPI fails.

**Step 3 - Attack the anomalies.** Two suspects are pre-seeded (outages, promo spikes). The analysis re-discovers them from the daily SLA series -- the same way it would on real data.

**Step 4 - Score the agents.** Aggregate AHT, volume, and tenure per agent, then look for patterns across tenure and team.

## 5. Finding 1: The 79.2% ceiling

The headline: over 60 days, service level sits at 79.2% -- just under the 80% target. Average speed of answer is 13.4 seconds (median 8.7s), and the abandon rate is 5.77% (2,739 of 47,441 calls).

![Daily call volume and SLA, with outages marked](/images/contact-center/daily_sla_volume.png)

The daily chart tells the real story: most days SLA hovers in the 75-84% band, a boring, healthy rhythm. Then three days collapse toward 40%. Each collapse has a name -- two promo spikes and three system outages (the red dotted lines overlay the three outage days).

The KPI summary across the whole center:

| KPI | Value | Target |
|---|---|---|
| Service level (<= 20s) | 79.2% | 80% |
| ASA | 13.4s (median 8.7s) | -- |
| Abandon rate | 5.77% | < 5% |
| AHT | 6.20 min (talk 264s, hold 45s, ACW 64s) | -- |
| Adherence | 99.5% | -- |
| Shrinkage | 23.4% | 20-25% |

Four queues run nearly identical service levels (78.8-79.5%) -- the center is balanced. But handle time is not balanced at all: Tech Support averages 7.3 minutes per call, Customer Care 5.1. That gap is queue complexity, not agent performance.

## 6. Finding 2: Outages are the sharpest anomaly

Compare what happens during a system outage versus the same day's baseline:

| Outage | Calls hit | SLA during | SLA baseline | Abandon during | ASA during |
|---|---|---|---|---|---|
| OUT-01 CRM outage (15 Jan) | 127 | 20% | 79% | 65% | 78s |
| OUT-02 Network failure (3 Feb) | 42 | 24% | 85% | 62% | 86s |
| OUT-03 WFM bug (21 Feb) | 92 | 11% | 80% | 66% | 111s |

![SLA collapse during outages vs same-day baseline](/images/contact-center/outage_impact.png)

Three outages, three SLA crashes: 11-24% during the incident versus 79-85% on the same day outside the window. Abandonment jumps to 62-66% (from ~5%), and AHT inflates by 30% -- during OUT-01, hold time alone ballooned because agents had to reconstruct customer records manually.

This is the cleanest possible anomaly-detection win: the daily SLA series flags these three days automatically, and the outage log explains all three. No volume spike, no staffing error -- pure system failure. In real operations, this is the difference between "agents are slow today" (wrong diagnosis) and "the CRM is down" (right diagnosis).

## 7. Finding 3: Promo days break the model too

Volume spikes behave differently from outages but hurt just as much:

- **14 February (Valentine's Day):** 1,615 calls -- 2.0x a normal weekday. SLA collapses to 43.1%, abandon spikes to 17.3%. This is the worst day in the entire dataset.
- **28 January (Sunday promo):** 396 calls -- 1.8x a normal Sunday. SLA falls to 44.9%, abandon 14.1%, even though 396 calls is a quiet number in absolute terms. Why? Because Sunday staffing is minimal. It is the ratio of volume to scheduled agents that kills SLA, not volume alone.

The correlation between daily volume and SLA is weak (r = -0.10) across the whole period -- because outages dominate the tail and volume dominates the middle. Both matter, but they are different failures: outages are binary events, volume is a staffing equation.

## 8. Finding 4: Handle time comes from the work, not the worker

The tenure story is the most counter-intuitive finding. Correlating agent tenure against their average handle time gives r = 0.009. Tenure does not predict speed at all:

| Tenure band | Calls | Avg AHT |
|---|---|---|
| 1-2 years | 951 | 7.6 min |
| 2-5 years | 10,708 | 5.9 min |
| 5+ years | 33,043 | 6.2 min |

![AHT vs tenure by team; bubble size = call volume](/images/contact-center/aht_vs_tenure.png)

The chart shows why: team membership explains AHT, tenure does not. Tech Support agents sit at 7+ minutes regardless of experience; Customer Care agents sit at ~5.0 minutes. The five fastest agents in the center (with meaningful volume) are all Customer Care at exactly 5.0 minutes. The queue determines the talk time.

For workforce management this means: AHT benchmarks must be built per queue, not per agent or tenure. A tech-support agent at 7 minutes is not slow; a care agent at 7 minutes is.

## 9. Finding 5: Evening shifts leak more time

Shrinkage sits at 23.4% overall -- within the normal 20-25% band. But it splits unevenly by shift:

| Shift | Shrinkage | Adherence | "Other" minutes |
|---|---|---|---|
| Evening | 24.2% | 99.5% | 30.7 min |
| Morning | 22.8% | 99.5% | 24.1 min |
| Mid | 22.8% | 99.5% | 24.5 min |

![Shrinkage components by shift](/images/contact-center/shrinkage_by_shift.png)

Adherence is uniformly excellent (99.5%) -- agents log in on time. The leak is inside the logged time: evening shifts lose 5-6 extra minutes per shift to the "other" bucket (30.7 min vs 24.1). Lunch and breaks are identical across shifts (30 + 45 min). The signature says evening agents are spending more time off-phone on unplanned activity -- the classic fatigue/punctuality pattern that a supervisor scorecard would catch.

## 10. Finding 6: The peak-hour occupancy math

The busiest hour is 15:00 (3,879 calls across 60 days, roughly 65 per day in that hour). With an average AHT of 6.2 minutes, peak-hour traffic is about 6.7 erlangs -- 6.7 lines busy simultaneously -- against roughly 41 ready agents. That is a comfortable 16% occupancy at the peak; the center is over-staffed. The SLA dips seen at 02:00 (77.6%, the weakest hour) are the opposite problem: near-zero volume against a skeleton night crew where one long call kills the hour's SLA.

![Hourly volume and SLA profile](/images/contact-center/hourly_profile.png)

The staffing insight: the center carries too many agents at peak (cheap SLA, low occupancy) and too few at night (fragile SLA). Classic rebalancing opportunity -- shift bodies from 15:00 to the night hours.

## 11. Recommendations

1. **Put outage detection on autopilot.** The daily SLA series alone flags all three outage days. A simple alert: "SLA < 50% for 30 minutes" triggers the incident bridge immediately. Root cause is already documented in the outage log.
2. **Staff Valentine's Day proactively.** The 2.0x promo spike is predictable (2013-01's calendar always repeats). Pre-schedule 1.5x agents for known promo dates; the Sunday promo should carry a skeleton-plus-one buffer.
3. **Rebalance agents from 15:00 to the night window.** Peak occupancy of ~16% means slack exists; night hours at 77.6% SLA mean it is needed. Even 4-5 agents shifted closes most of the gap.
4. **Rebuild AHT benchmarks per queue.** Tech Support 7.3 min vs Customer Care 5.1 min is structural, not personal. Scorecards comparing raw AHT across queues punish Tech Support unfairly.
5. **Investigate the evening "other" bucket.** 30.7 minutes per evening shift vs 24.1 elsewhere is 26% more unexplained time. Add a reason code to the other bucket in the WFM tool before judging agents.
6. **Keep the three-KPI triad in one dashboard.** Volume, service level, and occupancy together explain almost every anomaly in this dataset -- each KPI alone misleads (volume weak on its own, SLA strong on outage days, occupancy strong on staffing).

## 12. Limitations

1. **Simulated data.** The patterns are engineered, not observed. The KPI ranges are realistic, but real centers have seasonality, shrink-driven absenteeism, and multi-skill routing that this model simplifies.
2. **Occupancy is estimated, not measured.** Concurrency was derived from call counts and average AHT, not from a real switch's per-second state.
3. **No cost data.** Every recommendation trades agent-hours, but labor cost per hour is not modeled, so "rebalance" recommendations are directionally, not financially, precise.
4. **AHT attribution is last-queue-only.** A call routed through multiple queues is assigned to its final queue; real ACD data would allow partial attribution.
5. **Outage causality is by tag.** Calls inside an outage window are tagged as affected; calls just before or after the window may also have degraded, which understates the true impact.
6. **Tenure bands are uneven.** The 5+ year bucket holds 33,043 of 44,702 answered calls, so tenure effects are hard to isolate from cohort effects.