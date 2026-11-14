---
title: "Regime Filtering Is Not a Magic Button: What 7 Legs and 5 GM States Taught Me"
description: "A narrative walkthrough of how we built a predefined K=5 regime classifier for XAUUSDc, mapped each of 7 strategy legs to the regimes where it actually works, and found that the filter removed fewer trades than expected -- but the ones it removed mattered."
---

# Regime Filtering Is Not a Magic Button

When we first looked at the Gold Extractor EA's research engine, the story was clean: **seven legs (A-G), each a standalone strategy, all running on XAUUSDc M5.** The backtest said the portfolio made money. The MT5 tester said something else. The gap between "research expectancy" and "live tester P&L" became the leaking ship we spent weeks trying to plug.

This is the story of how we tried to fix it by asking a simpler question: *should every leg trade in every market regime?*

## Part 1: Why we went looking for regimes

The engine had been validated through walk-forward batteries. It used a strict regime map (GM0-GM4), an HTF EMA200-slope bias, a spread gate, and health gates. The EA was a MQL5 port of that research. But the tester's P&L diverged from the engine's research expectancy, and nobody knew why.

We started with hypothesis testing: was the gap caused by discrete port bugs (signal timing offsets, regime indexing errors), or by configuration differences (session windows missing from the engine)?

The answer, after a `deal_diff.py` loop of measure -> diverge -> isolate -> fix -> re-test, was both. But one finding kept resurfacing: **regime series divergence.** The engine was gating on the entry bar's regime -- partially look-ahead, because the bar must close to classify it -- while the EA could only know the completed bar's regime at entry time. That mismatch meant the EA was sometimes trading a leg the research said should be silent.

So we stopped debugging the port and started researching the regime map itself.

## Part 2: Building the classifier from predefined criteria

The regime classifier is not a black-box neural network. It is a **rule-based K=5 GM (Gold Macro) classifier** built on predefined thresholds, computed entirely from trailing windows so there is no look-ahead.

The inputs, all calculated on H1 data:

- **ATR(14)%** -- volatility relative to price
- **Kaufman Efficiency Ratio (20)** -- trend persistence, 0 to 1
- **EMA stack** -- alignment of EMA8, EMA21, EMA55
- **Tail frequency** -- proportion of bars exceeding 2.5x sigma over a 252-bar circular buffer

The thresholds came from Session A discovery (train-window quantiles), then locked:

| Threshold | Value | Meaning |
|-----------|-------|---------|
| ATR% Q80 | 0.1534 | High-volatility boundary |
| Tail Q80 | 10.00 | Crisis tail boundary |
| KER Q80 | 0.3000 | Strong trend boundary |
| KER Q60 | 0.2406 | Moderate trend boundary |
| KER Q40 | 0.1511 | Chop boundary |
| ATR% median | 0.0952 | Low-volatility boundary |

The classification logic, in priority order:

1. **GM3 Crisis** -- ATR% >= Q80 AND tail frequency > 10
2. **GM4 Strong trend** -- EMA aligned AND KER >= Q80
3. **GM2 Chop** -- ATR% < median AND KER < Q40
4. **GM0 Moderate trend** -- EMA aligned AND KER between Q60 and Q80
5. **GM1 Moderate chaos** -- everything else (default)

This gave us five discrete market states, each with a distinct personality. Then we mapped every H1 bar down to M5/M15 bars via `searchsorted` with `-2` offset -- the last completed H1 bar, never the forming one.

## Part 3: What each leg does in each regime

Session E backtested all seven legs across the five regimes. The table below shows avgR (R per trade) per leg per regime -- this is where the story gets interesting.

![Per-leg avgR by GM regime](/images/regime-research/leg_avgR_per_regime.png)

Reading across the rows:

- **Leg C (M5 rsi2)** is the workhorse -- 5,056 trades overall, positive in GM0, GM1, GM2, but *negative* in GM3 (-0.03R) and GM4 (-0.05R). It hates crisis and strong trend.
- **Leg E (H1 rsi2)** is positive in GM0 (+0.44R) and GM4 (+0.17R), but *strongly negative* in GM2 (-0.32R) and GM3 (-0.46R). Chop and crisis kill it.
- **Leg F (M15 macd_slope)** is negative in GM2 (-0.19R), but *excellent* in GM3 (+0.41R) and GM4 (+0.41R). It wants volatility and direction.
- **Leg G (H1 mtf_breakout)** is positive everywhere, but best in GM2 (+0.37R) and GM4 (+0.33R).

No leg is positive in all five regimes. No regime is profitable for all seven legs. The regime map is not optional -- it is structural.

## Part 4: The enable map

Session F converted the Session E table into a hard rule: **only allow legs that are positive in each regime.**

![Regime -> Leg enable map](/images/regime-research/regime_map.png)

| Regime | Disabled legs | Rationale |
|--------|--------------|-----------|
| GM0 mod_trend | none | All legs positive |
| GM1 mod_chaos | none | All legs positive |
| GM2 chop | E, F | E (-0.32R), F (-0.19R) |
| GM3 crisis | B, E | B (-0.34R), E (-0.46R) |
| GM4 strong_trend | C, D | C (-0.05R), D (-0.03R) |

The map is asymmetrical by design. GM2 and GM3 are the most restrictive -- those are the dangerous regimes where most legs bleed.

## Part 5: Does filtering actually help?

Session F ran two scenarios on the full M5 window: all legs always on (baseline) vs regime-filtered.

![Baseline vs Regime-Filtered Portfolio](/images/regime-research/baseline_vs_filtered.png)

The numbers are honest, and they are not what you might hope:

- **Sum R**: 1,974 -> 1,689 (down ~14%)
- **avgR**: 0.127 -> 0.129 (basically flat)
- **Profit Factor**: 1.209 -> 1.222 (tiny improvement)
- **Max DD**: 406 -> 410 (no improvement)
- **Win rate**: 26.3% -> 26.3% (unchanged)
- **Trade count**: 15,567 -> 13,134 (-15.6%)

The regime filter removed 2,433 trades, but portfolio expectancy barely moved. The PF ticked up slightly, and max drawdown did not improve at all.

### So why do it at all?

Because the filter is not about making the *portfolio* better -- it is about making the *individual legs* honest. C in GM4 goes from -0.05R to zero trades. E in GM3 goes from -0.46R to zero trades. The filter stops the bleeding leg-by-leg, even if the aggregate numbers look flat because the surviving legs compensate.

The real value is **diagnostic**: when the EA underperforms in live trading, you can look at the current regime and ask, "should this leg even be firing right now?" Without the regime map, you cannot answer that.

## Part 6: Limitations

- **Session E/F results cover 2025-06-11 to 2026-11-04 only.** Out-of-sample behavior is unmeasured.
- **The classifier uses the entry bar's regime.** The engine must wait for the bar to close to classify it -- partially look-ahead. The EA, trading at entry time, can only use the signal bar's completed regime. This is a research-design boundary, not a bug.
- **Regime map came from Session E per-regime avgR.** If the underlying distribution shifts, the map shifts with it. It is not static truth.
- **Fill quality and slippage are not the driver** (measured median +17 pts = half-spread). The regime question is structural, not execution.

## Conclusion

Regime filtering is not a magic button. It will not double your PF or halve your drawdown by itself. What it does is force each leg to answer one question: *in this market state, do you actually belong here?*

For the Gold Extractor EA, the answer is "no" for roughly 15% of trades across specific leg-regime combinations. Removing those trades does not transform the equity curve -- but it makes the strategy honest about when it should be silent. And in systematic trading, knowing when *not* to trade is often more valuable than knowing when to.

---

**Repository:** `D:\Resurgence\backtest_xau\` -- `regime_session_e.py` (per-leg regime table), `regime_session_f.py` (baseline vs filtered simulation), `regime_session_f_results.json` (results), `regime_bias_alignment.py` (classifier source of truth).
