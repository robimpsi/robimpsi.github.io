Power BI Model - Contact Center Operations
===============================================
Star schema built from the simulated 60-day contact-center dataset.

FACT TABLES:
  fact_calls.csv   47,441 rows  (PK: call_id)
    date, time_hour, queue, wait_sec, talk_sec, hold_sec, acw_sec,
    abandoned, sla_hit, agent_id, outage_id, aht_sec, is_answered, is_sla,
    is_outage_call

DIMENSION TABLES:
  dim_date.csv      60 rows    (PK: date_key, YYYYMMDD)
    is_outage, is_promo, weekday, month, quarter
  dim_agent.csv     48 rows    (PK: agent_id)
    operator, team, tenure_years, hire_date
  dim_queue.csv      4 rows    (PK: queue_key)
    queue_name

AGGREGATION:
  agg_daily.csv     60 rows    (pre-summed KPI per day)

RELATIONSHIPS:
  fact_calls[date]      -> dim_date[date_key]
  fact_calls[agent_id]  -> dim_agent[agent_id]
  fact_calls[queue]     -> dim_queue[queue_key]

IMPORT (Power BI Desktop):
  1. Get Data -> Text/CSV -> select all 5 CSVs.
  2. Model view: connect fact_calls[date] -> dim_date, [agent_id] -> dim_agent,
     [queue] -> dim_queue (single direction).
  3. Paste measures from measures.dax.
  4. Report suggestions:
     - Page 1: Daily SLA trend line + outage day slicer
     - Page 2: Table visual -> operator scorecard (calls, AHT, SLA)
     - Page 3: Cards -> SLA %, ASA, Abandon %, Outage SLA %

Reproducible via gen_model.py (reads ../calls.csv, ../agents.csv, ../outage_events.csv).
