import { useState } from "react";
import { formatNumber } from "../lib/format";
import type { GeographyProfile, NearestRow } from "../lib/types";
import { SectionCard } from "./SectionCard";

type NearestPanelProps = {
  profile: GeographyProfile;
  rows: NearestRow[];
  isLoading: boolean;
  statusText?: string;
  onRun: (params: { scope: string; where: string; n: number }) => void;
  onOpen: (row: NearestRow) => void;
};

const SCOPE_OPTIONS = [
  { value: "places+", label: "Places" },
  { value: "tracts+", label: "Census tracts" },
  { value: "counties+", label: "Counties" },
];

const COUNT_OPTIONS = [5, 10, 15, 25];
const FILTER_OPTIONS = [
  { value: "", label: "No filter" },
  { value: "population>=4000 population_density>=2500", label: "Urban geographies" },
  { value: "population>=100000", label: "Population 100k+" },
  { value: "population_density>=5000", label: "Density 5,000+" },
  { value: "median_household_income>=100000", label: "Median household income 100k+" },
  { value: "__custom__", label: "Custom filter" },
];

export function NearestPanel({ profile, rows, isLoading, statusText, onRun, onOpen }: NearestPanelProps) {
  const [scope, setScope] = useState("places+");
  const [count, setCount] = useState(10);
  const [wherePreset, setWherePreset] = useState("");
  const [customWhere, setCustomWhere] = useState("");

  return (
    <SectionCard
      eyebrow="Nearest"
      title="Closest geographies"
      subtitle={`Find nearby places starting from ${profile.name}.`}
    >
      <form
        className="nearest-form"
        onSubmit={(event) => {
          event.preventDefault();
          onRun({
            scope,
            where: wherePreset === "__custom__" ? customWhere.trim() : wherePreset,
            n: count,
          });
        }}
      >
        <label>
          <span>Geography</span>
          <select value={scope} onChange={(event) => setScope(event.target.value)}>
            {SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Filter</span>
          <select value={wherePreset} onChange={(event) => setWherePreset(event.target.value)}>
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Count</span>
          <select value={String(count)} onChange={(event) => setCount(Number(event.target.value))}>
            {COUNT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="ranking-actions">
          <button className="secondary-button" disabled={isLoading} type="submit">
            {isLoading ? "Loading..." : "Find closest"}
          </button>
        </div>
        {wherePreset === "__custom__" ? (
          <label className="nearest-form-wide">
            <span>Custom filter</span>
            <input
              placeholder="population>=100000"
              value={customWhere}
              onChange={(event) => setCustomWhere(event.target.value)}
            />
          </label>
        ) : null}
      </form>

      {statusText ? (
        <div className="plain-state">
          <p>{statusText}</p>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="ranking-results">
          <div className="metrics-list">
            {rows.map((row, index) => (
              <button
                className="ranking-row"
                key={`${row.geography.geoid ?? row.geography.name}-${index}`}
                onClick={() => onOpen(row)}
                type="button"
              >
                <span className="ranking-rank">{index + 1}</span>
                <strong className="ranking-name">{row.geography.name}</strong>
                <span className="ranking-county">
                  {row.geography.counties_display.join(", ") || row.geography.canonical_name}
                </span>
                <strong className="ranking-population-value">
                  {row.geography.population != null ? formatNumber(row.geography.population) : "—"}
                </strong>
                <strong className="ranking-metric-value">
                  {formatNumber(row.distance)} {row.distance_unit}
                </strong>
                <span className="ranking-population-label">Population</span>
                <span className="ranking-metric-label">Distance</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
