---
title: "From Hypothesis to Regime Map: Proving Market States Before Trading Them"
description: "A narrative walkthrough of regime-conditional edge research: what a market regime is, how we built a rule-based classifier, and what happened when we filtered seven trading strategies by regime."
---

# From Hypothesis to Regime Map

Markets are not one thing. Sometimes gold trades in a quiet sideways range. Sometimes it trends strongly in one direction. Sometimes it swings wildly in both directions.

These different conditions are called **market regimes**. A trading strategy that makes money in a trending regime can lose money in a sideways regime. The idea behind this project is simple: **identify the current market regime, then only run the strategies that work in that regime.**

This article walks through how we built and tested that idea using XAUUSDc (gold vs US dollar) data from MetaTrader 5. It is written for readers without a trading background: no prior knowledge of algorithmic trading is assumed.

---

## Part 1: Data description (EDA)

### What we worked with

The data lives under `D:\Resurgence\backtest_xau\`. It comes from MetaTrader 5 (MT5), a trading platform. We pulled historical price bars for XAUUSDc at five timeframes. Each bar represents a period of time and contains the open, high, low, and close prices for that period.

| File | Rows | Time span | Timeframe |
|------|------|-----------|-----------|
| XAUUSDc_M1.csv | ~100,000 | 2025-06-11 to 2026-11-09 | 1 minute |
| XAUUSDc_M5.csv | ~100,000 | 2025-06-11 to 2026-11-09 | 5 minutes |
| XAUUSDc_M15.csv | ~100,000 | 2025-06-11 to 2026-11-09 | 15 minutes |
| XAUUSDc_H1.csv | ~75,000 | 2018-01-02 to 2026-11-06 | 1 hour |
| XAUUSDc_D1.csv | ~2,000 | 2018-01-02 to 2026-11-06 | 1 day |

MT5 limits history to about 100,000 bars per API call, so the short timeframes (M1, M5, M15) cover about 4.5 months. The longer timeframes (H1, D1) go back to 2018.

### What each column means

Every price bar file has the same columns:

| Column | Meaning |
|--------|---------|
| time | Timestamp when the bar started |
| open | Price at the start of the bar |
| high | Highest price reached during the bar |
| low | Lowest price reached during the bar |
| close | Price at the end of the bar |
| tick_volume | Number of price ticks (price updates) during the bar |
| spread | Difference between buy and sell price, in points |

### Research engine output

Alongside the raw price data, the research engine produced several files:

| File | Content |
|------|---------|
| engine_regime_dump.csv | Regime label (GM0-GM4) for every bar, plus H1 trend bias |
| engine_base_gov.csv | Trades after regime and bias filtering |
| engine_raw_trades.csv | All signal trades before filtering |
| regime_session_e_results.json | Average return per strategy leg, broken down by regime |
| regime_session_f_results.json | Portfolio comparison: all strategies on vs regime-filtered |

---

## Part 2: Goal of the analysis

We wanted to answer one question: **does conditioning trading strategies on an explicit market-state definition produce better results than running all strategies all the time?**

To make this question testable, we pre-registered five hypotheses (H1-H5) in a research protocol. Each hypothesis comes with a pre-defined falsifier -- a condition that would prove the hypothesis wrong:

| ID | Hypothesis | Falsifier (what would kill it) |
|----|-----------|--------------------------------|
| H1 | Price returns show K in {2,3} persistent, distinct market states | Statistical test T1 or T2 fails |
| H2 | Strategy profitability differs across market states | All states show the same profit/loss sign |
| H3 | Routing by market state beats random skipping | Result falls inside random-skip control's range |
| H4 | Market states last long enough to detect and trade | Median state life is shorter than 3x detection time |
| H5 | The regime structure holds up out-of-sample | Out-of-sample gain is zero or negative in 30%+ of test windows |

The deliverable is not a trading strategy. It is an **evidence file**: labels, statistics, per-state tables, a full trial log, and a written verdict against each success criterion.

---

## Part 3: Process

### Step 1 -- Define market states from published research

We did not invent the market states from scratch. Each state is anchored in published quantitative research, then calibrated to our own data using training-window quantiles (never fixed constants copied from a paper).

Three ordered states by volatility:

| State | What it means | Research basis |
|-------|--------------|----------------|
| S1 Low-volatility chop | Quiet sideways market | Engle (1982); Bollerslev (1986) |
| S2 Trending | Price moves consistently in one direction | Moskowitz, Ooi & Pedersen (2012) |
| S3 High-volatility chaos | Wild swings in both directions | Brunnermeier, Nagel & Pedersen (2009) |

### Step 2 -- Build the classifier (code)

We used four features, all calculated from trailing windows only (no looking into the future):

1. **ATR%(14)** -- volatility relative to price
2. **KER(20)** -- Kaufman Efficiency Ratio, measures how directional price movement is (0 to 1)
3. **EMA stack** -- alignment of 8, 21, and 55 period exponential moving averages
4. **Tail frequency** -- how often extreme price moves happen over a 252-bar window

Here is the actual code used to compute the features:

```python
# ATR%(14) on H1 closes
pc = np.concatenate([[c[0]], c[:-1]])
tr = np.maximum(np.maximum(h - l, np.abs(h - pc)), np.abs(l - pc))
atr = pd.Series(tr).ewm(alpha=1/14, adjust=False).mean().values
atr_pct = atr / c * 100.0

# Kaufman Efficiency Ratio (20)
d_abs = np.abs(np.diff(c, prepend=c[0]))
path = pd.Series(d_abs).rolling(20).sum().values
net = np.abs(c - np.concatenate([np.full(20, c[0]), c[:-20]]))
ker20 = net / np.maximum(path, 1e-12)

# EMA stack (8/21/55)
ema8 = pd.Series(c).ewm(span=8, adjust=False).mean().values
ema21 = pd.Series(c).ewm(span=21, adjust=False).mean().values
ema55 = pd.Series(c).ewm(span=55, adjust=False).mean().values
ema_aligned = (ema8 > ema21) & (ema21 > ema55) | (ema8 < ema21) & (ema21 < ema55)
```

Thresholds come from the training data:

| Threshold | Value | Meaning |
|-----------|-------|---------|
| ATR% median | 0.0952 | Low volatility boundary |
| KER q40 | 0.1511 | Weak direction boundary |
| KER q60 | 0.2406 | Moderate direction boundary |
| KER q80 | 0.3000 | Strong direction boundary |
| ATR% q80 | 0.1534 | High volatility boundary |
| Tail freq q80 | 10.00 | Crisis tail boundary |

Classification rule (applied to every H1 bar):

```python
def classify_regime(atr_pct_i, ker20_i, ema_stack_i, tail_freq_i):
    if np.isnan(atr_pct_i) or np.isnan(ker20_i):
        return -1
    if atr_pct_i >= REG_ATR_Q80 and tail_freq_i > REG_TAIL_Q80:
        return 3  # GM3_crisis
    if ema_stack_i and ker20_i >= REG_KER_Q80:
        return 4  # GM4_strong_trend
    if atr_pct_i < REG_ATR_MEDIAN and ker20_i < REG_KER_Q40:
        return 2  # GM2_chop
    if ema_stack_i and REG_KER_Q60 <= ker20_i < REG_KER_Q80:
        return 0  # GM0_mod_trend
    return 1  # GM1_mod_chaos (default)
```

Every H1 bar receives one of five labels (GM0-GM4). The H1 label is then mapped down to M5/M15 bars using only completed bars (anti-lookahead rule).

### Step 3 -- Test each strategy leg in each regime

Session E backtested seven strategy legs (A-G) across the five regimes. Each leg is a standalone strategy with its own entry signal, stop loss, and session filter.

The per-regime table for three representative legs:

| Leg | Regime | Trades | avgR | sumR | Profit Factor |
|-----|--------|--------|------|------|---------------|
| C (M5 rsi2) | GM0 mod_trend | 1,844 | +0.102 | +187.5 | 1.19 |
| C | GM1 mod_chaos | 1,062 | +0.239 | +253.8 | 1.41 |
| C | GM2 chop | 1,136 | +0.090 | +102.6 | 1.11 |
| C | GM3 crisis | 163 | -0.030 | -4.93 | 1.19 |
| C | GM4 strong_trend | 851 | -0.051 | -43.6 | 1.02 |
| E (H1 rsi2) | GM0 mod_trend | 120 | +0.443 | +53.1 | 1.55 |
| E | GM2 chop | 48 | -0.318 | -15.3 | 0.73 |
| E | GM3 crisis | 22 | -0.464 | -10.2 | 0.27 |
| F (M15 macd_slope) | GM2 chop | 654 | -0.193 | -126.2 | 0.93 |
| F | GM3 crisis | 74 | +0.415 | +30.7 | 1.49 |
| F | GM4 strong_trend | 302 | +0.413 | +124.6 | 1.40 |

**Key pattern:** No leg is profitable in all five regimes. No regime is profitable for all seven legs. Leg C (the workhorse, 5,056 trades total) loses money in GM3 and GM4. Leg F loses money in chop but wins in crisis and strong trend.

### Step 4 -- Build the regime enable map

Session F converted the table into a hard rule: only trade legs that show positive expectancy in each regime.

| Regime | Disabled legs | Reason |
|--------|--------------|--------|
| GM0 mod_trend | none | All legs positive |
| GM1 mod_chaos | none | All legs positive |
| GM2 chop | E, F | E (-0.318R), F (-0.193R) |
| GM3 crisis | B, E | B (-0.336R), E (-0.464R) |
| GM4 strong_trend | C, D | C (-0.051R), D (-0.033R) |

### Step 5 -- Baseline vs regime-filtered portfolio

We compared two scenarios on the full M5 data: all legs always on (baseline) vs regime-filtered (enable map applied).

| Metric | Baseline | Regime-Filtered | Change |
|--------|----------|-----------------|--------|
| Trades | 15,567 | 13,134 | -15.6% |
| Sum R | +1,974.5 | +1,689.4 | -14.4% |
| avgR | +0.1268 | +0.1286 | ~flat |
| Profit Factor | 1.209 | 1.222 | +1.0% |
| Max drawdown | 406.0R | 410.0R | ~flat |
| Win rate | 26.3% | 26.3% | unchanged |

![Baseline vs Regime-Filtered Portfolio](/images/regime-research/baseline_vs_filtered.png)

---

## Part 4: Findings

### Finding 1 -- The regime filter is diagnostic, not transformative

The filter removed 2,433 trades (15.6%), but portfolio expectancy barely moved. Profit Factor improved only slightly (1.209 to 1.222). Max drawdown did not improve. Win rate is unchanged.

However, the filter stopped individual legs from bleeding in bad regimes. Leg C in GM4 goes from -0.05R to zero trades. Leg E in GM3 goes from -0.46R to zero trades. The filter makes the strategy honest about when it should stay silent.

### Finding 2 -- Classifier structure matters more than exact thresholds

The five-regime split (chop / trend / crisis) maps cleanly to published literature. The exact thresholds (ATR% Q80, KER Q60/Q80/Q40) are training-window quantiles -- they would change on different data, but the state definitions would not.

### Finding 3 -- Look-ahead is a design boundary, not a bug

The research engine classifies the entry bar's regime, which requires the bar to close first. The live trading bot can only use the last completed bar's regime. After fixing this mismatch, the bot's regime series tracks the engine closely. The remaining gap is a research-design decision, not a code defect.

### Finding 4 -- Entry execution is not the problem

Matched entries show median fill deviation of +17 points (half of the 34-point spread). Entry execution quality is not driving the divergence between research and live results. The regime question is structural.

![Per-leg avgR by regime](/images/regime-research/leg_avgR_per_regime.png)
![Regime distribution](/images/regime-research/regime_distribution.png)
![Regime to leg enable map](/images/regime-research/regime_map.png)

---

## Part 5: Limitations

- **Time window.** All numbers cover 2025-06-11 to 2026-11-04 for intraday data and 2018-01-02 to 2026-11-06 for H1/D1. Out-of-sample behavior beyond this window is unmeasured.
- **Look-ahead boundary.** The engine uses entry-bar regime (partially look-ahead). The live bot cannot replicate this at entry time. This is a research-design decision to resolve.
- **Regime map is not static.** It comes from Session E per-regime results. If the market distribution shifts, the map shifts with it. Thresholds are training-window quantiles, frozen at the train/out-of-sample boundary.
- **Small-sample crisis buckets.** GM3 (crisis) has the fewest bars and trades. These buckets are reported with intervals but never used for pass/fail claims.
- **Costs.** Every backtest applies regime-conditional cost curves. Crisis spreads receive a 1.5x floor multiplier. No edge claim is reported gross of costs.
- **Swap was never quantified** in this window.

---

## Conclusion

Regime filtering is not a magic button. It will not double your Profit Factor or halve drawdown by itself. What it does is force each trading strategy to answer one question: *in this market state, do you actually belong here?*

For the Gold Extractor system, the answer is "no" for roughly 15% of trades across specific strategy-regime combinations. Removing those trades does not transform the equity curve -- but it makes the strategy honest about when it should be silent. In systematic trading, knowing when **not** to trade is often more valuable than knowing when to.

---

**Repository:** `D:\Resurgence\backtest_xau\` -- `regime_session_e.py` (per-leg regime table), `regime_session_f.py` (baseline vs filtered simulation), `regime_session_f_results.json` (results), `regime_bias_alignment.py` (classifier source of truth), `report.md` (system port debugging narrative).

**Research protocol:** `C:\Users\UseR\Documents\Regime-Conditional_Edge_Research_Protocol.md` -- success criteria SC-1 to SC-6, hypotheses H1-H5, evidence battery T1-T6, gates G0-G3, Deflated Sharpe and Model Confidence Set standards.
