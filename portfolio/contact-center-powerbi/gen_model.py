"""Generate Power BI star-schema model from the contact-center simulation dataset."""
import pandas as pd, numpy as np, os
base = r"D:\FREELANCING\Contact Center Operations"
out  = r"D:\FREELANCING\Contact Center Operations\powerbi_model"
os.makedirs(out, exist_ok=True)

calls   = pd.read_csv(f"{base}\\calls.csv", parse_dates=["timestamp"])
agents  = pd.read_csv(f"{base}\\agents.csv")
outages = pd.read_csv(f"{base}\\outage_events.csv", parse_dates=["date"])
calls["date"] = pd.to_datetime(calls["time"].dt.date) if "time" in calls else pd.to_datetime(calls["timestamp"].dt.date)
calls["time_hour"] = calls["timestamp"].dt.hour

# ---- FACT_CALLS ----
fact = calls[["call_id","date","time_hour","queue","wait_sec","talk_sec",
              "hold_sec","acw_sec","abandoned","sla_hit","agent_id","outage_id"]].copy()
fact["aht_sec"]        = fact[["talk_sec","hold_sec","acw_sec"]].sum(axis=1, min_count=1)
fact["is_answered"]    = (1 - fact["abandoned"]).astype(int)
fact["is_sla"]         = fact["sla_hit"].astype(int)
fact["is_outage_call"] = fact["outage_id"].notna().astype(int)
fact.to_csv(f"{out}\\fact_calls.csv", index=False)

# ---- DIM_DATE ----
dates = pd.DataFrame({"date": pd.date_range("2024-01-01", "2024-02-29")})
dates["date_key"]   = dates["date"].dt.strftime("%Y%m%d").astype(int)
dates["day"]        = dates["date"].dt.day
dates["day_name"]   = dates["date"].dt.day_name()
dates["weekday"]    = dates["date"].dt.weekday
dates["month"]      = dates["date"].dt.month
dates["month_name"] = dates["date"].dt.month_name()
dates["quarter"]    = dates["date"].dt.quarter
dates["is_weekend"] = (dates["weekday"] >= 5).astype(int)
outage_days = pd.to_datetime(outages["date"]).dt.normalize()
dates["is_outage"] = dates["date"].isin(outage_days)
dates["is_promo"]  = dates["date"].isin(pd.to_datetime(["2024-01-28","2024-02-14"]))
dates.to_csv(f"{out}\\dim_date.csv", index=False)

# ---- DIM_AGENT ----
# agent_id in calls.csv is "AGT-NNN"; agents.csv has team+tenure+shift per agent_id
da = agents[["agent_id","team","tenure_years","hire_date","shift_pattern"]].copy()
da.to_csv(f"{out}\\dim_agent.csv", index=False)

# ---- DIM_QUEUE ----
dq = pd.DataFrame({"queue_key":["tech","billing","sales","care"],
                   "queue_name":["Tech Support","Billing","Sales","Customer Care"]})
dq.to_csv(f"{out}\\dim_queue.csv", index=False)

# ---- AGG_DAILY ----
g = fact.groupby("date").agg(
    calls=("call_id","count"),
    answered=("is_answered","sum"),
    abandoned=("abandoned","sum"),
    sla_hits=("is_sla","sum"),
    wait_sum=("wait_sec","sum"),
    aht_sum=("aht_sec","sum"),
    outage_calls=("is_outage_call","sum"),
).reset_index()
g["sla_pct"]      = (g["sla_hits"]/g["calls"]*100).round(2)
g["aband_pct"]    = (g["abandoned"]/g["calls"]*100).round(2)
g["asa_sec"]      = (g["wait_sum"]/g["answered"]).round(1)
g["aht_min"]      = (g["aht_sum"]/g["answered"]/60).round(2)
g["date_key"]     = g["date"].dt.strftime("%Y%m%d").astype(int)
g["date"]         = g["date"].dt.strftime("%Y-%m-%d")
g.to_csv(
    f"{out}\\agg_daily.csv", columns=["date","date_key","calls","answered",
    "abandoned","sla_pct","asa_sec","aht_min","aband_pct","outage_calls"], index=False)

# ---- DAX MEASURES ----
dax = """// =============================================
// Contact Center - DAX Measures
// =============================================
SLA % = DIVIDE(SUM(fact_calls[is_sla]), COUNTROWS(fact_calls))
ASA (sec) = DIVIDE(SUM(fact_calls[wait_sec]), SUM(fact_calls[is_answered]))
Abandon % = DIVIDE(SUM(fact_calls[abandoned]), COUNTROWS(fact_calls))
AHT (min) = DIVIDE(SUM(fact_calls[aht_sec]), SUM(fact_calls[is_answered])) / 60
Total Calls = COUNTROWS(fact_calls)
Answered Calls = SUM(fact_calls[is_answered])
Calls per Agent = DIVIDE([Total Calls], DISTINCTCOUNT(fact_calls[agent_id]))
Outage SLA % = IF(SUM(fact_calls[is_outage_call]) > 0,
    DIVIDE(CALCULATE(SUM(fact_calls[is_sla]), fact_calls[is_outage_call]=1),
           CALCULATE(COUNTROWS(fact_calls), fact_calls[is_outage_call]=1)))
Outage Share = DIVIDE(SUM(fact_calls[is_outage_call]), [Total Calls])
Operator Score =
VAR _tenure = SELECTEDVALUE(dim_agent[tenure_years])
RETURN IF(_tenure < 1, "new", IF(_tenure > 5, "senior", "mid"))
"""
with open(f"{out}\\measures.dax", "w", encoding="utf-8") as f:
    f.write(dax)

# ---- README ----
readme = """Power BI Model - Contact Center Operations
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
"""
with open(f"{out}\\README.md", "w", encoding="utf-8") as f:
    f.write(readme)

print("=== Generated files ===")
for f in sorted(os.listdir(out)):
    p = os.path.join(out, f)
    print(f"  {f}: {os.path.getsize(p):,} bytes")
print(f"Rows in fact_calls.csv: {len(fact):,}")
print(f"Rows in dim_date.csv: {len(dates)}")
print("\n=== agg_daily head ===")
print(pd.read_csv(f"{out}\\agg_daily.csv").head(3).to_string(index=False))
