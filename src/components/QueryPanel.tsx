import { useState } from "react";
import type { LocalAverageParams, RemotenessParams } from "../lib/types";
import { SectionCard } from "./SectionCard";

type QueryPanelProps = {
  activeMode: "remoteness" | "local-average";
  onModeChange: (mode: "remoteness" | "local-average") => void;
  onRunRemoteness: (params: RemotenessParams) => Promise<void>;
  onRunLocalAverage: (params: LocalAverageParams) => Promise<void>;
  isRunningRemoteness: boolean;
  isRunningLocalAverage: boolean;
  selectedGeographyName: string | null;
};

const initialRemoteness: RemotenessParams = {
  data_identifier: "median_household_income",
  threshold: "100000",
  target: "below",
  scope: "tracts+",
  where: "population>=4000 population_density>=2500",
  n: 15,
  county_population_min: undefined,
  county_density_min: undefined,
  one_per_county: false,
  official_labels: true,
  kilometers: false,
};

const initialLocalAverage: LocalAverageParams = {
  data_identifier: "median_household_income",
  scope: "tracts+",
  where: "population>=4000 population_density>=2500",
  n: 15,
  neighbors: 20,
  county_population_min: undefined,
  county_density_min: undefined,
  one_per_county: false,
  official_labels: true,
  kilometers: false,
};

function parseNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function QueryPanel({
  activeMode,
  onModeChange,
  onRunRemoteness,
  onRunLocalAverage,
  isRunningRemoteness,
  isRunningLocalAverage,
  selectedGeographyName,
}: QueryPanelProps) {
  const [remoteness, setRemoteness] = useState(initialRemoteness);
  const [localAverage, setLocalAverage] = useState(initialLocalAverage);

  return (
    <SectionCard
      eyebrow="Action"
      title={activeMode === "remoteness" ? "Remoteness query" : "Local average query"}
      subtitle={
        selectedGeographyName
          ? `You can search again any time, but the current context is ${selectedGeographyName}.`
          : "Pick the action you want, adjust the scope, then inspect the ranked results."
      }
      actions={
        <div className="segmented-control" role="tablist" aria-label="Query mode">
          <button
            className={activeMode === "remoteness" ? "segment active" : "segment"}
            onClick={() => onModeChange("remoteness")}
            type="button"
          >
            Remoteness
          </button>
          <button
            className={activeMode === "local-average" ? "segment active" : "segment"}
            onClick={() => onModeChange("local-average")}
            type="button"
          >
            Local average
          </button>
        </div>
      }
    >
      <div className="query-shell">
        {activeMode === "remoteness" ? (
      <SectionCard
        eyebrow="Mode"
        title="Remoteness"
        subtitle="Find places furthest from the nearest geography across a threshold."
        className="subpanel"
      >
        <form
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault();
            await onRunRemoteness(remoteness);
          }}
        >
          <label>
            <span>Metric identifier</span>
            <input
              value={remoteness.data_identifier}
              onChange={(event) =>
                setRemoteness((current) => ({
                  ...current,
                  data_identifier: event.target.value,
                }))
              }
            />
          </label>
          <div className="field-row">
            <label>
              <span>Threshold</span>
              <input
                value={remoteness.threshold}
                onChange={(event) =>
                  setRemoteness((current) => ({
                    ...current,
                    threshold: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span>Target side</span>
              <select
                value={remoteness.target}
                onChange={(event) =>
                  setRemoteness((current) => ({
                    ...current,
                    target: event.target.value as RemotenessParams["target"],
                  }))
                }
              >
                <option value="below">Below threshold</option>
                <option value="above">Above threshold</option>
              </select>
            </label>
          </div>
          <label>
            <span>Scope</span>
            <input
              value={remoteness.scope}
              onChange={(event) =>
                setRemoteness((current) => ({
                  ...current,
                  scope: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>Where filter</span>
            <input
              value={remoteness.where}
              onChange={(event) =>
                setRemoteness((current) => ({
                  ...current,
                  where: event.target.value,
                }))
              }
            />
          </label>
          <div className="field-row">
            <label>
              <span>Result count</span>
              <input
                type="number"
                min={1}
                max={100}
                value={remoteness.n}
                onChange={(event) =>
                  setRemoteness((current) => ({
                    ...current,
                    n: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label>
              <span>County population min</span>
              <input
                type="number"
                value={remoteness.county_population_min ?? ""}
                onChange={(event) =>
                  setRemoteness((current) => ({
                    ...current,
                    county_population_min: parseNumber(event.target.value),
                  }))
                }
              />
            </label>
            <label>
              <span>County density min</span>
              <input
                type="number"
                step="any"
                value={remoteness.county_density_min ?? ""}
                onChange={(event) =>
                  setRemoteness((current) => ({
                    ...current,
                    county_density_min: parseNumber(event.target.value),
                  }))
                }
              />
            </label>
          </div>
          <div className="toggle-row">
            <label className="inline-toggle">
              <input
                type="checkbox"
                checked={remoteness.one_per_county}
                onChange={(event) =>
                  setRemoteness((current) => ({
                    ...current,
                    one_per_county: event.target.checked,
                  }))
                }
              />
              <span>One per county</span>
            </label>
            <label className="inline-toggle">
              <input
                type="checkbox"
                checked={remoteness.official_labels}
                onChange={(event) =>
                  setRemoteness((current) => ({
                    ...current,
                    official_labels: event.target.checked,
                  }))
                }
              />
              <span>Official tract labels</span>
            </label>
            <label className="inline-toggle">
              <input
                type="checkbox"
                checked={remoteness.kilometers}
                onChange={(event) =>
                  setRemoteness((current) => ({
                    ...current,
                    kilometers: event.target.checked,
                  }))
                }
              />
              <span>Use kilometers</span>
            </label>
          </div>
          <button
            className="primary-button"
            disabled={isRunningRemoteness || !remoteness.data_identifier.trim()}
            type="submit"
          >
            {isRunningRemoteness ? "Running..." : "Run remoteness"}
          </button>
        </form>
      </SectionCard>
        ) : (
      <SectionCard
        eyebrow="Mode"
        title="Local average"
        subtitle="Rank places by the distance-weighted average of nearby geographies."
        className="subpanel"
      >
        <form
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault();
            await onRunLocalAverage(localAverage);
          }}
        >
          <label>
            <span>Metric identifier</span>
            <input
              value={localAverage.data_identifier}
              onChange={(event) =>
                setLocalAverage((current) => ({
                  ...current,
                  data_identifier: event.target.value,
                }))
              }
            />
          </label>
          <div className="field-row">
            <label>
              <span>Scope</span>
              <input
                value={localAverage.scope}
                onChange={(event) =>
                  setLocalAverage((current) => ({
                    ...current,
                    scope: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span>Neighbors</span>
              <input
                type="number"
                min={1}
                max={250}
                value={localAverage.neighbors}
                onChange={(event) =>
                  setLocalAverage((current) => ({
                    ...current,
                    neighbors: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>
          <label>
            <span>Where filter</span>
            <input
              value={localAverage.where}
              onChange={(event) =>
                setLocalAverage((current) => ({
                  ...current,
                  where: event.target.value,
                }))
              }
            />
          </label>
          <div className="field-row">
            <label>
              <span>Result count</span>
              <input
                type="number"
                min={1}
                max={100}
                value={localAverage.n}
                onChange={(event) =>
                  setLocalAverage((current) => ({
                    ...current,
                    n: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label>
              <span>County population min</span>
              <input
                type="number"
                value={localAverage.county_population_min ?? ""}
                onChange={(event) =>
                  setLocalAverage((current) => ({
                    ...current,
                    county_population_min: parseNumber(event.target.value),
                  }))
                }
              />
            </label>
            <label>
              <span>County density min</span>
              <input
                type="number"
                step="any"
                value={localAverage.county_density_min ?? ""}
                onChange={(event) =>
                  setLocalAverage((current) => ({
                    ...current,
                    county_density_min: parseNumber(event.target.value),
                  }))
                }
              />
            </label>
          </div>
          <div className="toggle-row">
            <label className="inline-toggle">
              <input
                type="checkbox"
                checked={localAverage.one_per_county}
                onChange={(event) =>
                  setLocalAverage((current) => ({
                    ...current,
                    one_per_county: event.target.checked,
                  }))
                }
              />
              <span>One per county</span>
            </label>
            <label className="inline-toggle">
              <input
                type="checkbox"
                checked={localAverage.official_labels}
                onChange={(event) =>
                  setLocalAverage((current) => ({
                    ...current,
                    official_labels: event.target.checked,
                  }))
                }
              />
              <span>Official tract labels</span>
            </label>
            <label className="inline-toggle">
              <input
                type="checkbox"
                checked={localAverage.kilometers}
                onChange={(event) =>
                  setLocalAverage((current) => ({
                    ...current,
                    kilometers: event.target.checked,
                  }))
                }
              />
              <span>Use kilometers</span>
            </label>
          </div>
          <button
            className="primary-button"
            disabled={isRunningLocalAverage || !localAverage.data_identifier.trim()}
            type="submit"
          >
            {isRunningLocalAverage ? "Running..." : "Run local average"}
          </button>
        </form>
      </SectionCard>
        )}
      </div>
    </SectionCard>
  );
}
