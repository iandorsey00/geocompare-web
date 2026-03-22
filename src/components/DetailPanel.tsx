import { formatMetricKey, formatNumber, friendlySumlevel } from "../lib/format";
import type { GeographyProfile, SelectedRow } from "../lib/types";
import { SectionCard } from "./SectionCard";

type DetailPanelProps = {
  selected: SelectedRow | null;
  profile: GeographyProfile | null;
  isLoading: boolean;
};

function renderSelectionMeta(selected: SelectedRow) {
  if (selected.kind === "search") {
    return null;
  }

  if (selected.kind === "remoteness") {
    return (
      <div className="detail-callout">
        <p>
          Nearest match: <strong>{selected.item.nearest_match.name}</strong>
        </p>
        <p>
          Distance:{" "}
          <strong>
            {formatNumber(selected.item.distance)} {selected.item.distance_unit}
          </strong>
        </p>
      </div>
    );
  }

  return (
    <div className="detail-callout">
      <p>
        Local average: <strong>{formatNumber(selected.item.local_average)}</strong>
      </p>
      <p>
        Neighbor span:{" "}
        <strong>
          {formatNumber(selected.item.neighbor_span)} {selected.item.span_unit}
        </strong>
      </p>
    </div>
  );
}

export function DetailPanel({ selected, profile, isLoading }: DetailPanelProps) {
  const highlightedMetrics = profile
    ? Object.entries(profile.metrics).filter(([key]) =>
        [
          "population",
          "population_density",
          "median_household_income",
          "median_home_value",
          "median_rent",
          "bachelors_degree_or_higher_pct",
        ].includes(key),
      )
    : [];

  return (
    <SectionCard
      eyebrow="Detail"
      title="Current selection"
      subtitle="Keep just enough context visible to support the action you are doing."
    >
      {!selected ? (
        <div className="empty-state">
          <p>No geography selected.</p>
          <p>Click a result row to inspect metrics and metadata.</p>
        </div>
      ) : isLoading ? (
        <div className="empty-state">
          <p>Loading profile...</p>
        </div>
      ) : !profile ? (
        <div className="empty-state">
          <p>Profile unavailable.</p>
        </div>
      ) : (
        <div className="detail-stack">
          <div>
            <h3>{profile.name}</h3>
            <p className="panel-subtitle">{friendlySumlevel(profile.sumlevel)}</p>
          </div>
          <div className="meta-grid">
            <div>
              <span className="meta-label">Canonical name</span>
              <strong>{profile.canonical_name}</strong>
            </div>
            <div>
              <span className="meta-label">State</span>
              <strong>{profile.state ?? "—"}</strong>
            </div>
            <div>
              <span className="meta-label">GEOID</span>
              <strong>{profile.geoid ?? "—"}</strong>
            </div>
            <div>
              <span className="meta-label">Counties</span>
              <strong>{profile.counties_display.join(", ") || "—"}</strong>
            </div>
          </div>
          {renderSelectionMeta(selected)}
          <div className="metrics-list compact-metrics">
            {(highlightedMetrics.length > 0 ? highlightedMetrics : Object.entries(profile.metrics).slice(0, 8))
              .map(([key, value]) => (
                <div className="metric-row" key={key}>
                  <span>{formatMetricKey(key)}</span>
                  <strong>{formatNumber(value)}</strong>
                </div>
              ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
