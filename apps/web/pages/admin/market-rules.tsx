import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type MarketRules = {
  liquidityGoodThreshold: number;
  liquidityMidThreshold: number;
  liquidityLookbackDays: number;
  liquidityTradeWeight: number;
  liquidityTimeWeight: number;
  liquidityDeviationWeight: number;
  liquidityTradeCountCap: number;
  liquidityTimeToFillMaxHours: number;
  referenceWeightPrimary: number;
  referenceWeightSecondary: number;
  referenceWeightNav: number;
  strategyMultiplierFastExit: number;
  strategyMultiplierBalanced: number;
  strategyMultiplierMaxPrice: number;
  maxPriceCapMultiplier: number;
};

const defaultRules: MarketRules = {
  liquidityGoodThreshold: 70,
  liquidityMidThreshold: 50,
  liquidityLookbackDays: 14,
  liquidityTradeWeight: 40,
  liquidityTimeWeight: 35,
  liquidityDeviationWeight: 25,
  liquidityTradeCountCap: 10,
  liquidityTimeToFillMaxHours: 168,
  referenceWeightPrimary: 0.4,
  referenceWeightSecondary: 0.4,
  referenceWeightNav: 0.2,
  strategyMultiplierFastExit: 0.95,
  strategyMultiplierBalanced: 1,
  strategyMultiplierMaxPrice: 1.03,
  maxPriceCapMultiplier: 1.2,
};

export default function MarketRulesPage() {
  const [rules, setRules] = useState<MarketRules>(defaultRules);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<MarketRules>("/admin/market-rules")
      .then(setRules)
      .catch((error) => {
        setIsError(true);
        setMessage(error.message || "Failed to load market rules.");
      });
  }, []);

  function updateField<K extends keyof MarketRules>(key: K, value: string) {
    const numeric = Number(value);
    setRules((prev) => ({
      ...prev,
      [key]: Number.isFinite(numeric) ? numeric : 0,
    }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setIsError(false);
    try {
      const updated = await apiFetch<MarketRules>("/admin/market-rules", {
        method: "PUT",
        body: JSON.stringify(rules),
      });
      setRules(updated);
      setMessage("Market rules updated.");
    } catch (error: any) {
      setIsError(true);
      setMessage(error.message || "Failed to update market rules.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <h1 className="section-title">Market Rules</h1>
      <div className="targeting-layout">
        <div className="card">
          <p className="muted">
            Configure liquidity scoring, reference pricing, and strategy
            multipliers.
          </p>
          <div className="banner">
            <strong>Validation rules</strong>
            <ul>
              <li>Reference price weights must sum to 1.0</li>
              <li>Liquidity weights must sum to 100</li>
              <li>Good threshold must be greater than mid threshold</li>
            </ul>
          </div>
          {message && (
            <p className={isError ? "status-error" : "status-success"}>
              {message}
            </p>
          )}
          <form className="form" onSubmit={handleSave}>
            <h3 className="section-title">Liquidity Thresholds</h3>
            <label className="label">
              Good Threshold
              <input
                className="input"
                type="number"
                value={rules.liquidityGoodThreshold}
                onChange={(event) =>
                  updateField("liquidityGoodThreshold", event.target.value)
                }
                min={0}
                max={100}
              />
            </label>
            <label className="label">
              Mid Threshold
              <input
                className="input"
                type="number"
                value={rules.liquidityMidThreshold}
                onChange={(event) =>
                  updateField("liquidityMidThreshold", event.target.value)
                }
                min={0}
                max={100}
              />
            </label>
            <label className="label">
              Lookback Days
              <input
                className="input"
                type="number"
                value={rules.liquidityLookbackDays}
                onChange={(event) =>
                  updateField("liquidityLookbackDays", event.target.value)
                }
                min={1}
              />
            </label>
            <label className="label">
              Trade Weight
              <input
                className="input"
                type="number"
                value={rules.liquidityTradeWeight}
                onChange={(event) =>
                  updateField("liquidityTradeWeight", event.target.value)
                }
                min={0}
              />
            </label>
            <label className="label">
              Time-to-Fill Weight
              <input
                className="input"
                type="number"
                value={rules.liquidityTimeWeight}
                onChange={(event) =>
                  updateField("liquidityTimeWeight", event.target.value)
                }
                min={0}
              />
            </label>
            <label className="label">
              Deviation Weight
              <input
                className="input"
                type="number"
                value={rules.liquidityDeviationWeight}
                onChange={(event) =>
                  updateField("liquidityDeviationWeight", event.target.value)
                }
                min={0}
              />
            </label>
            <label className="label">
              Trade Count Cap
              <input
                className="input"
                type="number"
                value={rules.liquidityTradeCountCap}
                onChange={(event) =>
                  updateField("liquidityTradeCountCap", event.target.value)
                }
                min={1}
              />
            </label>
            <label className="label">
              Max Time-to-Fill Hours
              <input
                className="input"
                type="number"
                value={rules.liquidityTimeToFillMaxHours}
                onChange={(event) =>
                  updateField("liquidityTimeToFillMaxHours", event.target.value)
                }
                min={1}
              />
            </label>

            <h3 className="section-title">Reference Price Weights</h3>
            <label className="label">
              Primary Reference Weight
              <input
                className="input"
                type="number"
                value={rules.referenceWeightPrimary}
                onChange={(event) =>
                  updateField("referenceWeightPrimary", event.target.value)
                }
                min={0}
                step="0.01"
              />
            </label>
            <label className="label">
              Secondary Trades Weight
              <input
                className="input"
                type="number"
                value={rules.referenceWeightSecondary}
                onChange={(event) =>
                  updateField("referenceWeightSecondary", event.target.value)
                }
                min={0}
                step="0.01"
              />
            </label>
            <label className="label">
              NAV Proxy Weight
              <input
                className="input"
                type="number"
                value={rules.referenceWeightNav}
                onChange={(event) =>
                  updateField("referenceWeightNav", event.target.value)
                }
                min={0}
                step="0.01"
              />
            </label>

            <h3 className="section-title">Strategy Multipliers</h3>
            <label className="label">
              FAST_EXIT Multiplier
              <input
                className="input"
                type="number"
                value={rules.strategyMultiplierFastExit}
                onChange={(event) =>
                  updateField("strategyMultiplierFastExit", event.target.value)
                }
                min={0.1}
                step="0.01"
              />
            </label>
            <label className="label">
              BALANCED Multiplier
              <input
                className="input"
                type="number"
                value={rules.strategyMultiplierBalanced}
                onChange={(event) =>
                  updateField("strategyMultiplierBalanced", event.target.value)
                }
                min={0.1}
                step="0.01"
              />
            </label>
            <label className="label">
              MAX_PRICE Multiplier
              <input
                className="input"
                type="number"
                value={rules.strategyMultiplierMaxPrice}
                onChange={(event) =>
                  updateField("strategyMultiplierMaxPrice", event.target.value)
                }
                min={0.1}
                step="0.01"
              />
            </label>
            <label className="label">
              Max Price Cap Multiplier
              <input
                className="input"
                type="number"
                value={rules.maxPriceCapMultiplier}
                onChange={(event) =>
                  updateField("maxPriceCapMultiplier", event.target.value)
                }
                min={1}
                step="0.01"
              />
            </label>

            <button className="button" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Rules"}
            </button>
          </form>
        </div>
        <aside className="card targeting-help">
          <h2 className="section-title">Definitions</h2>
          <table className="definition-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Liquidity Thresholds</td>
                <td>
                  Controls how scores map to Good/Mid/Low badges on the
                  dashboard.
                </td>
              </tr>
              <tr>
                <td>Lookback Days</td>
                <td>Window used to calculate trade activity and VWAP.</td>
              </tr>
              <tr>
                <td>Liquidity Weights</td>
                <td>
                  Weights for trade volume, time-to-fill, and bid-ask deviation.
                  Must sum to 100.
                </td>
              </tr>
              <tr>
                <td>Trade Count Cap</td>
                <td>Maximum trades counted toward liquidity trade score.</td>
              </tr>
              <tr>
                <td>Max Time-to-Fill Hours</td>
                <td>Upper bound used to normalize time-to-fill scoring.</td>
              </tr>
              <tr>
                <td>Reference Price Weights</td>
                <td>
                  Blends primary reference, secondary VWAP, and NAV proxy. Must
                  sum to 1.0.
                </td>
              </tr>
              <tr>
                <td>Strategy Multipliers</td>
                <td>
                  Multipliers applied to optimized prices by strategy.
                </td>
              </tr>
              <tr>
                <td>Max Price Cap</td>
                <td>
                  Upper cap for MAX_PRICE strategy as a multiple of reference.
                </td>
              </tr>
            </tbody>
          </table>
        </aside>
      </div>
    </main>
  );
}
