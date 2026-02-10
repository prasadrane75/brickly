import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type TargetingConfig = {
  ownsPropertyWeight: number;
  viewScorePerCount: number;
  maxViewScore: number;
  similarHoldingsWeight: number;
  recentBuyerWeight: number;
  minScoreToTarget: number;
  maxBuyersPerOrder: number;
  cooldownHours: number;
};

const defaultConfig: TargetingConfig = {
  ownsPropertyWeight: 40,
  viewScorePerCount: 6,
  maxViewScore: 30,
  similarHoldingsWeight: 20,
  recentBuyerWeight: 10,
  minScoreToTarget: 1,
  maxBuyersPerOrder: 20,
  cooldownHours: 0,
};

export default function TargetingConfigPage() {
  const [config, setConfig] = useState<TargetingConfig>(defaultConfig);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<TargetingConfig>("/admin/targeting/config")
      .then(setConfig)
      .catch((error) => {
        setIsError(true);
        setMessage(error.message || "Failed to load targeting config.");
      });
  }, []);

  function updateField<K extends keyof TargetingConfig>(
    key: K,
    value: string
  ) {
    const numeric = Number(value);
    setConfig((prev) => ({
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
      const updated = await apiFetch<TargetingConfig>(
        "/admin/targeting/config",
        {
          method: "PUT",
          body: JSON.stringify(config),
        }
      );
      setConfig(updated);
      setIsError(false);
      setMessage("Targeting rules updated.");
    } catch (error: any) {
      setIsError(true);
      setMessage(error.message || "Failed to update targeting config.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <h1 className="section-title">Targeting Rules</h1>
      <div className="targeting-layout">
        <div className="card">
          <p className="muted">
            Adjust how buyers are scored for targeted sell-order alerts.
          </p>
          {message && (
            <p className={isError ? "status-error" : "status-success"}>
              {message}
            </p>
          )}
          <form className="form" onSubmit={handleSave}>
          <label className="label">
            Owns Property Weight
            <input
              className="input"
              type="number"
              value={config.ownsPropertyWeight}
              onChange={(event) =>
                updateField("ownsPropertyWeight", event.target.value)
              }
              min={0}
            />
          </label>
          <label className="label">
            View Score Per Count
            <input
              className="input"
              type="number"
              value={config.viewScorePerCount}
              onChange={(event) =>
                updateField("viewScorePerCount", event.target.value)
              }
              min={0}
            />
          </label>
          <label className="label">
            Max View Score
            <input
              className="input"
              type="number"
              value={config.maxViewScore}
              onChange={(event) =>
                updateField("maxViewScore", event.target.value)
              }
              min={0}
            />
          </label>
          <label className="label">
            Similar Holdings Weight
            <input
              className="input"
              type="number"
              value={config.similarHoldingsWeight}
              onChange={(event) =>
                updateField("similarHoldingsWeight", event.target.value)
              }
              min={0}
            />
          </label>
          <label className="label">
            Recent Buyer Weight
            <input
              className="input"
              type="number"
              value={config.recentBuyerWeight}
              onChange={(event) =>
                updateField("recentBuyerWeight", event.target.value)
              }
              min={0}
            />
          </label>
          <label className="label">
            Minimum Score To Target
            <input
              className="input"
              type="number"
              value={config.minScoreToTarget}
              onChange={(event) =>
                updateField("minScoreToTarget", event.target.value)
              }
              min={0}
            />
          </label>
          <label className="label">
            Max Buyers Per Order
            <input
              className="input"
              type="number"
              value={config.maxBuyersPerOrder}
              onChange={(event) =>
                updateField("maxBuyersPerOrder", event.target.value)
              }
              min={1}
            />
          </label>
          <label className="label">
            Cooldown Hours (per buyer/property)
            <input
              className="input"
              type="number"
              value={config.cooldownHours}
              onChange={(event) =>
                updateField("cooldownHours", event.target.value)
              }
              min={0}
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
                <td>Owns Property Weight</td>
                <td>Points added if buyer already owns shares in this property.</td>
              </tr>
              <tr>
                <td>View Score Per Count</td>
                <td>Points added per recent view of the property.</td>
              </tr>
              <tr>
                <td>Max View Score</td>
                <td>Maximum points from views (cap).</td>
              </tr>
              <tr>
                <td>Similar Holdings Weight</td>
                <td>
                  Points added if buyer owns shares in properties in the same
                  city/state.
                </td>
              </tr>
              <tr>
                <td>Recent Buyer Weight</td>
                <td>Points added if buyer purchased any shares in last 14 days.</td>
              </tr>
              <tr>
                <td>Minimum Score To Target</td>
                <td>Minimum total score required to receive an alert.</td>
              </tr>
              <tr>
                <td>Max Buyers Per Order</td>
                <td>Maximum number of buyers alerted for a sell order.</td>
              </tr>
              <tr>
                <td>Cooldown Hours</td>
                <td>
                  Minimum hours between alerts per buyer/property combination.
                </td>
              </tr>
            </tbody>
          </table>
        </aside>
      </div>
    </main>
  );
}
