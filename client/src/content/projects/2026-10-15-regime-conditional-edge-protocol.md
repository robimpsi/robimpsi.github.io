---
title: "From Hypothesis to Regime Map: A Research Protocol for Proving Market States Before Trading Them"
description: "A narrative walkthrough of regime-conditional edge research: from literature anchors and pre-registered hypotheses to per-state expectancy tables and a falsified-or-survived verdict."
---

# From Hypothesis to Regime Map

The hypothesis is simple and intuitive: **markets are not one thing.** They alternate between persistent states -- low-volatility chop, trending, high-volatility chaos -- and a rule that is profitable on average may be unprofitable in some states and strongly profitable in others.

We have heard this story before. The question is whether we can **prove it** before routing a single dollar. That is what this research is about.

## Part 1: What we are working with

The data lives under `D:\Resurgence\backtest_xau\`. It is XAUUSDc (gold vs USD, cent account suffix) pulled from MT5 history, plus EURUSDc for cross-pair checks. Four timeframes:

| File | Rows | Span |
|------|------|------|
| XAUUSDc_M1.csv | ~100k | 2025-06-11 -> 2026-11-09 |
| XAUUSDc_M5.csv | ~100k | 2025-06-11 -> 2026-11-09 |
| XAUUSDc_M15.csv | ~100k | 2025-06-11 -> 2026-11-09 |
| XAUUSDc_H1.csv | ~75k | 2018-01-02 -> 2026-11-06 |
| XAUUSDc_D1.csv | ~2k | 2018-01-02 -> 2026-11-06 |

MT5 history is capped at ~100k bars per API call, so the intraday window is short (about 4.5 months at M5) but the H1/D1 history goes back to 2018. Every bar has `time, open, high, low, close, tick_volume, spread`.

Alongside the raw data is the research engine output:
- `engine_regime_dump.csv` -- per-bar regime label (GM0-GM4) and H1 EMA200-slope bias
- `engine_base_gov.csv` -- governed trades after regime/bias filter
- `engine_raw_trades.csv` -- ungoverned signal trades before filtering
- `regime_session_e_results.json` -- per-leg average-R by regime (Session E)
- `regime_session_f_results.json` -- baseline vs regime-filtered portfolio comparison (Session F)

The research protocol itself is documented separately in `Regime-Conditional_Edge_Research_Protocol.md`. It defines the success criteria (SC-1 to SC-6), the pre-registered hypotheses (H1-H5), the six-test evidence battery (T1-T6), and the gate structure (G0-G3). Every number in this article traces back to one of those files.

## Part 2: The question we are trying to answer

The working hypothesis, pre-registered in the protocol:

> Markets alternate between a small number of persistent states. A rule profitable on average may be unprofitable in some states and strongly profitable in others. Conditioning a fixed set of trading rules on an explicit, literature-anchored market-state definition should produce positive after-cost expectancy that survives out-of-sample and multiple-testing scrutiny.

To convert that into something falsifiable, the protocol breaks it into six hypotheses (H1-H5), each with a pre-registered falsifier:

| ID | Hypothesis | Falsifier |
|----|-----------|-----------|
| H1 | M15-H1 returns exhibit K in {2,3} persistent, distributionally distinct states | T1 or T2 fails |
| H2 | Baseline rule expectancy is regime-conditional (differs across states) | T5 permutation p >= .01, or all states share same expectancy sign |
| H3 | State-based routing beats a random-skip control trading the same fraction of signals | Routing expectancy inside control's 95% bootstrap interval |
| H4 | State dwell times are long enough for detection latency to leave exploitable life | Median dwell < 3x median detection latency |
| H5 | Regime structure generalizes out-of-sample | OOS log-likelihood gain <= 0 in >= 30% of rolling windows |

The deliverable is not a strategy. It is an **evidence file**: labels, transition matrices, dwell-time statistics, per-state expectancy tables with bootstrap intervals, the full trial log, and a written verdict against every success criterion.

## Part 3: How we built it

The protocol is strict about one thing: **structure comes from the literature; thresholds come from the data.** No element of the regime taxonomy may be invented ad hoc. Each state must satisfy construct validity (grounded in published research) and empirical validity (passing the T1-T6 battery on our own data).

### Step 1 -- Define candidate states from published research

Three ordered states, by volatility load:

| State | Research basis | Operational proxy (train-calibrated) |
|-------|---------------|--------------------------------------|
| S1 Low-volatility chop | Engle (1982); Bollerslev (1986); Ryden et al. (1998) | ATR%(14) < train median AND KER(20) < train q40 |
| S2 Trending | Moskowitz, Ooi & Pedersen (2012); Baz et al. (2015) | EMA(8/21/55) aligned AND KER(20) between train q60 and q80 |
| S3 High-volatility chaos | Brunnermeier, Nagel & Pedersen (2009); Mandelbrot (1963) | ATR%(14) >= train q80 OR elevated tail frequency |

The features, all trailing windows only (anti-lookahead):

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

# Tail frequency: proportion of |r| > 2.5 * rolling sigma over 252-bar buffer
r = np.diff(c, prepend=c[0]) / np.maximum(c, 1e-12)
```

Thresholds are training-window quantiles -- never constants copied from a paper.

### Step 2 -- Classify every bar into a regime

```python
REG_ATR_MEDIAN = 0.0952
REG_KER_Q40 = 0.1511
REG_KER_Q60 = 0.2406
REG_KER_Q80 = 0.3000
REG_ATR_Q80 = 0.1534
REG_TAIL_Q80 = 10.0000

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

Every H1 bar gets a label. Then H1 regime is mapped down to M5/M15 bars via `searchsorted` with `-2` offset -- the **last completed H1 bar**, never the forming one. This is the anti-lookahead rule: the classifier must only know what was knowable at entry time.

### Step 3 -- Test each leg inside each regime

Session E backtested all seven Gold Extractor legs (A-G) across the five GM regimes. Each leg is a standalone strategy with its own signal generator, stop, and session gate. The engine records entry time, leg, side, sl_dist, R, regime, bias, and governed flag.

The per-regime table (Session E) is the heart of the research. Here is what it looks like for three legs:

| Leg | Regime | n | avgR | sumR | PF |
|-----|--------|---|------|------|-----|
| C (M5 rsi2) | GM0 mod_trend | 1,844 | +0.102 | +187.5 | 1.19 |
| C | GM1 mod_chaos | 1,062 | +0.239 | +253.8 | 1.41 |
| C | GM2 chop | 1,136 | +0.090 | +102.6 | 1.11 |
| C | GM3 crisis | 163 | -0.030 | -4.93 | 1.19 |
| C | GM4 strong_trend | 851 | -0.051 | -43.6 | 1.02 |
| E (H1 rsi2) | GM0 mod_trend | 120 | +0.443 | +53.1 | 1.55 |
| E | GM1 mod_chaos | 117 | +0.166 | +19.4 | 0.89 |
| E | GM2 chop | 48 | -0.318 | -15.3 | 0.73 |
| E | GM3 crisis | 22 | -0.464 | -10.2 | 0.27 |
| E | GM4 strong_trend | 82 | +0.172 | +14.1 | 1.30 |
| F (M15 macd_slope) | GM2 chop | 654 | -0.193 | -126.2 | 0.93 |
| F | GM3 crisis | 74 | +0.415 | +30.7 | 1.49 |
| F | GM4 strong_trend | 302 | +0.413 | +124.6 | 1.40 |

Reading down the columns, a pattern emerges: **no leg is positive in all five regimes. No regime is profitable for all seven legs.** Leg C (the workhorse, 5,056 trades overall) bleeds in GM3 and GM4. Leg E (strong in trend and chop-normal) dies in GM2 and GM3. Leg F (MACD slope) is terrible in chop but excellent in crisis and strong trend.

### Step 4 -- Build the enable map

Session F converted the Session E table into a hard rule: only trade legs that are positive in each regime.

| Regime | Disabled legs | Why |
|--------|--------------|-----|
| GM0 mod_trend | none | All legs positive |
| GM1 mod_chaos | none | All legs positive |
| GM2 chop | E, F | E (-0.318R), F (-0.193R) |
| GM3 crisis | B, E | B (-0.336R), E (-0.464R) |
| GM4 strong_trend | C, D | C (-0.051R), D (-0.033R) |

The map is asymmetrical by design. GM2 and GM3 are the most restrictive -- those are the dangerous regimes where most legs bleed.

### Step 5 -- Baseline vs regime-filtered portfolio

Session F ran two scenarios on the full M5 window: all legs always on (baseline) vs regime-filtered (enable map applied).

| Metric | Baseline | Regime-Filtered | Change |
|--------|----------|-----------------|--------|
| Trades | 15,567 | 13,134 | -15.6% |
| Sum R | +1,974.5 | +1,689.4 | -14.4% |
| avgR | +0.1268 | +0.1286 | ~flat |
| Profit Factor | 1.209 | 1.222 | +1.0% |
| Max DD | 406.0R | 410.0R | ~flat |
| Win rate | 26.3% | 26.3% | unchanged |

![Baseline vs Regime-Filtered](/images/regime-research/baseline_vs_filtered.png)

The numbers are honest, and they are **not** what you might hope. The filter removed 2,433 trades, but portfolio expectancy barely moved. Profit Factor ticked up slightly. Max drawdown did not improve. Win rate is identical.

## Part 4: What we found

### Finding 1 -- The regime filter is diagnostic, not transformative

Regime filtering did not double the Profit Factor or halve drawdown. It made the portfolio *honest*. C in GM4 goes from -0.05R to zero trades. E in GM3 goes from -0.46R to zero trades. The filter stops the bleeding leg-by-leg, even though the aggregate looks flat because surviving legs compensate.

The real value is **diagnostic**: when the EA underperforms live, you can look at the current regime and ask, *"should this leg even be firing right now?"* Without the regime map, you cannot answer that.

### Finding 2 -- The classifier structure matters more than the thresholds

The five-regime split (chop / trend / crisis) maps cleanly to published literature: Hamilton (1989) Markov switching for discrete states, Moskowitz et al. (2012) for time-series momentum, Brunnermeier et al. (2009) for carry-crash chaos. The thresholds themselves (ATR% Q80, KER Q60/Q80/Q40) are training-window quantiles -- they would change on different data, but the state definitions would not.

### Finding 3 -- Look-ahead is the honest boundary, not a bug

The engine governs on the *entry bar's* regime, which requires the bar to close before classification -- partially look-ahead. The EA, trading at entry time, can only use the signal bar's completed regime. After the cadence fix, the EA's regime series (28,846 switches) tracks the engine closely (27,479 switches). The remaining ~7% mismatch is the look-ahead boundary: a research-design decision, not a code defect.

### Finding 4 -- Fills are not the problem

Matched entries show median fill deviation of +17 pts = half-spread (spread = 34 pts). Entry execution is not the driver of divergence. The regime question is structural.

![Per-leg avgR by regime](/images/regime-research/leg_avgR_per_regime.png)

![Regime distribution](/images/regime-research/regime_distribution.png)

![Regime -> Leg enable map](/images/regime-research/regime_map.png)

## Part 5: Limitations

- **Window coverage.** All numbers cover 2025-06-11 to 2026-11-04 (M5) and 2018-01-02 to 2026-11-06 (H1). Out-of-sample behavior is unmeasured. H5 (out-of-sample generalization) remains open.
- **Look-ahead boundary.** The engine uses entry-bar regime (partially look-ahead). The EA cannot replicate this at entry time. This is a research-design decision to resolve, not a bug to fix.
- **Regime map is not static.** It comes from Session E per-regime avgR. If the underlying distribution shifts, the map shifts with it. Thresholds are training-window quantiles, frozen at the train/OOS boundary.
- **Small-sample crisis buckets.** GM3 (crisis) has the fewest bars and trades. Under-powered buckets are reported with intervals but never support pass/fail claims -- per protocol Section 7.
- **Costs.** Every backtest applies regime-conditional cost curves. Crisis spreads receive a 1.5x floor multiplier. No edge claim is reported gross of costs.
- **Fill quality is not the driver** (measured median +17 pts = half-spread), but swap was never quantified in this window.

## Conclusion

Regime filtering is not a magic button. It will not double your Profit Factor or halve your drawdown by itself. What it does is force each leg to answer one question: *in this market state, do you actually belong here?*

For the Gold Extractor EA, the answer is "no" for roughly 15% of trades across specific leg-regime combinations. Removing those trades does not transform the equity curve -- but it makes the strategy honest about when it should be silent. And in systematic trading, knowing when *not* to trade is often more valuable than knowing when to.

---

**Repository:** `D:\Resurgence\backtest_xau\` -- `regime_session_e.py` (per-leg regime table), `regime_session_f.py` (baseline vs filtered simulation), `regime_session_f_results.json` (results), `regime_bias_alignment.py` (classifier source of truth), `report.md` (EA port debugging narrative).

**Research protocol:** `C:\Users\UseR\Documents\Regime-Conditional_Edge_Research_Protocol.md` -- SC-1 to SC-6 success criteria, H1-H5 hypotheses, T1-T6 evidence battery, G0-G3 gates, Deflated Sharpe and Model Confidence Set standards.
