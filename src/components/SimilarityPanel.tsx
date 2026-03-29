import { useState } from "react";
import { formatNumber } from "../lib/format";
import type { GeographyProfile, SimilarityMode, SimilarityRow } from "../lib/types";
import { SectionCard } from "./SectionCard";

type SimilarityPanelProps = {
  profile: GeographyProfile;
  rows: SimilarityRow[];
  isLoading: boolean;
  statusText?: string;
  officialLabels?: boolean;
  onRun: (params: {
    mode: SimilarityMode;
    universe?: string;
    universes?: string;
    n: number;
    officialLabels?: boolean;
  }) => void;
  onOpen: (row: SimilarityRow) => void;
};

const MODE_OPTIONS: Array<{ value: SimilarityMode; label: string }> = [
  { value: "similar", label: "Demographic" },
  { value: "similar-form", label: "Built form" },
];

const UNIVERSE_OPTIONS = [
  { value: "tracts", label: "Census tracts" },
  { value: "zctas", label: "ZCTAs" },
  { value: "places", label: "Places" },
  { value: "counties", label: "Counties" },
  { value: "states", label: "States" },
  { value: "urbanareas", label: "Urban areas" },
  { value: "cbsas", label: "Metro areas" },
];

const COUNT_OPTIONS = [5, 10, 15, 25];

type ScopeMode = "peer" | "single" | "multiple" | "all";

export function SimilarityPanel({
  profile,
  rows,
  isLoading,
  statusText,
  officialLabels,
  onRun,
  onOpen,
}: SimilarityPanelProps) {
  const [mode, setMode] = useState<SimilarityMode>("similar");
  const [scopeMode, setScopeMode] = useState<ScopeMode>("peer");
  const [universe, setUniverse] = useState("places");
  const [selectedUniverses, setSelectedUniverses] = useState<string[]>(["places", "tracts"]);
  const [count, setCount] = useState(10);

  function toggleUniverse(nextValue: string) {
    setSelectedUniverses((current) =>
      current.includes(nextValue) ? current.filter((value) => value !== nextValue) : [...current, nextValue],
    );
  }

  const metricLabel = mode === "similar-form" ? "Built form distance" : "Similarity distance";

  return (
    <SectionCard
      eyebrow="Similarity"
      title="Find similar geographies"
      subtitle={`Compare ${profile.name} to peer places or broader GeoVector universes.`}
    >
      <form
        className="nearest-form similarity-form"
        onSubmit={(event) => {
          event.preventDefault();
          onRun({
            mode,
            universe: scopeMode === "single" ? universe : undefined,
            universes:
              scopeMode === "multiple"
                ? selectedUniverses.join(",")
                : scopeMode === "all"
                  ? "All"
                  : undefined,
            n: count,
            officialLabels,
          });
        }}
      >
        <label>
          <span>Mode</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as SimilarityMode)}>
            {MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Universe</span>
          <select value={scopeMode} onChange={(event) => setScopeMode(event.target.value as ScopeMode)}>
            <option value="peer">Peer geographies</option>
            <option value="single">One geography type</option>
            <option value="multiple">Multiple geography types</option>
            <option value="all">All supported geographies</option>
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
        {scopeMode === "single" ? (
          <label className="nearest-form-wide">
            <span>Geography type</span>
            <select value={universe} onChange={(event) => setUniverse(event.target.value)}>
              {UNIVERSE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {scopeMode === "multiple" ? (
          <fieldset className="nearest-form-wide checkbox-grid-fieldset">
            <legend>Geography types</legend>
            <div className="checkbox-grid">
              {UNIVERSE_OPTIONS.map((option) => (
                <label className="inline-toggle" key={option.value}>
                  <input
                    type="checkbox"
                    checked={selectedUniverses.includes(option.value)}
                    onChange={() => toggleUniverse(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <div className="ranking-actions">
          <button className="secondary-button" disabled={isLoading} type="submit">
            {isLoading ? "Loading..." : "Find similar"}
          </button>
        </div>
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
                <strong className="ranking-metric-value">{formatNumber(row.distance)}</strong>
                <span className="ranking-population-label">Population</span>
                <span className="ranking-metric-label">{metricLabel}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
