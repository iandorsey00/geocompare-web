import { formatNumber, friendlySumlevel } from "../lib/format";
import type {
  LocalAverageRow,
  RemotenessRow,
  ResultKind,
  SearchSelection,
  SelectedRow,
  GeographySummary,
} from "../lib/types";
import { SectionCard } from "./SectionCard";

type ResultsTableProps = {
  resultKind: ResultKind | null;
  rows: GeographySummary[] | RemotenessRow[] | LocalAverageRow[];
  selected: SelectedRow | null;
  onSelect: (row: SelectedRow) => void;
  onAddCompare?: (row: GeographySummary) => void;
  comparedGeoids?: Set<string>;
  title: string;
  subtitle: string;
};

function isSelected(selected: SelectedRow | null, rowName: string) {
  if (!selected) {
    return false;
  }

  if (selected.kind === "search") {
    return selected.item.name === rowName;
  }

  return selected.item.candidate.name === rowName;
}

function renderSearchCard(
  row: GeographySummary,
  selected: SelectedRow | null,
  onSelect: (row: SelectedRow) => void,
  onAddCompare?: (row: GeographySummary) => void,
  comparedGeoids?: Set<string>,
) {
  const nextSelection: SearchSelection = {
    kind: "search",
    item: row,
  };

  return (
    <button
      key={row.name}
      className={`mobile-result-card${isSelected(selected, row.name) ? " is-selected" : ""}`}
      onClick={() => onSelect(nextSelection)}
      type="button"
    >
      <div className="mobile-result-main">
        <strong>{row.name}</strong>
        <p>{row.canonical_name !== row.name ? row.canonical_name : friendlySumlevel(row.sumlevel)}</p>
      </div>
      <div className="mobile-result-meta">
        <span>{friendlySumlevel(row.sumlevel)}</span>
        <span>{row.state ?? "—"}</span>
        <span>Population {formatNumber(row.population ?? null)}</span>
      </div>
      {onAddCompare ? (
        <span className="mobile-result-action">
          {row.geoid && comparedGeoids?.has(row.geoid) ? "Added" : "Compare"}
        </span>
      ) : null}
    </button>
  );
}

function renderRemotenessCard(row: RemotenessRow, selected: SelectedRow | null, onSelect: (row: SelectedRow) => void) {
  return (
    <button
      key={`${row.candidate.name}-${row.nearest_match.name}`}
      className={`mobile-result-card${isSelected(selected, row.candidate.name) ? " is-selected" : ""}`}
      onClick={() =>
        onSelect({
          kind: "remoteness",
          item: row,
        })
      }
      type="button"
    >
      <div className="mobile-result-main">
        <strong>{row.candidate.name}</strong>
        <p>{friendlySumlevel(row.candidate.sumlevel)}</p>
      </div>
      <div className="mobile-result-meta">
        <span>{formatNumber(row.candidate_value)}</span>
        <span>{row.metric_label}</span>
        <span>Nearest {row.nearest_match.name}</span>
        <span>
          {formatNumber(row.distance)} {row.distance_unit}
        </span>
      </div>
    </button>
  );
}

function renderLocalAverageCard(row: LocalAverageRow, selected: SelectedRow | null, onSelect: (row: SelectedRow) => void) {
  return (
    <button
      key={row.candidate.name}
      className={`mobile-result-card${isSelected(selected, row.candidate.name) ? " is-selected" : ""}`}
      onClick={() =>
        onSelect({
          kind: "local-average",
          item: row,
        })
      }
      type="button"
    >
      <div className="mobile-result-main">
        <strong>{row.candidate.name}</strong>
        <p>{friendlySumlevel(row.candidate.sumlevel)}</p>
      </div>
      <div className="mobile-result-meta">
        <span>
          {formatNumber(row.candidate_value)} · {row.metric_label}
        </span>
        <span>Local average {formatNumber(row.local_average)}</span>
        <span>
          Neighbor span {formatNumber(row.neighbor_span)} {row.span_unit}
        </span>
      </div>
    </button>
  );
}

export function ResultsTable({
  resultKind,
  rows,
  selected,
  onSelect,
  onAddCompare,
  comparedGeoids,
  title,
  subtitle,
}: ResultsTableProps) {
  return (
    <SectionCard eyebrow="Results" title={title} subtitle={subtitle}>
      {rows.length === 0 || !resultKind ? (
        <div className="empty-state">
          <p>No results yet.</p>
          <p>Run a search or query to start exploring.</p>
        </div>
      ) : (
        <>
          <div className="mobile-results-list">
            {resultKind === "search"
              ? (rows as GeographySummary[]).map((row) =>
                  renderSearchCard(row, selected, onSelect, onAddCompare, comparedGeoids),
                )
              : resultKind === "remoteness"
                ? (rows as RemotenessRow[]).map((row) => renderRemotenessCard(row, selected, onSelect))
                : (rows as LocalAverageRow[]).map((row) => renderLocalAverageCard(row, selected, onSelect))}
          </div>
          <div className="table-wrap minimal-table-wrap">
          <table>
            <thead>
              {resultKind === "search" ? (
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>State</th>
                  <th>Population</th>
                  <th></th>
                </tr>
              ) : resultKind === "remoteness" ? (
                <tr>
                  <th>Candidate</th>
                  <th>Metric</th>
                  <th>Nearest match</th>
                  <th>Distance</th>
                </tr>
              ) : (
                <tr>
                  <th>Candidate</th>
                  <th>Metric</th>
                  <th>Local average</th>
                  <th>Neighbor span</th>
                </tr>
              )}
            </thead>
            <tbody>
              {resultKind === "search"
                ? (rows as GeographySummary[]).map((row) => {
                    const nextSelection: SearchSelection = {
                      kind: "search",
                      item: row,
                    };

                    return (
                      <tr
                        key={row.name}
                        className={isSelected(selected, row.name) ? "selected" : ""}
                        onClick={() => onSelect(nextSelection)}
                      >
                        <td>
                          <strong>{row.name}</strong>
                          <div className="table-subline">{row.canonical_name !== row.name ? row.canonical_name : ""}</div>
                        </td>
                        <td>{friendlySumlevel(row.sumlevel)}</td>
                        <td>{row.state ?? "—"}</td>
                        <td>{formatNumber(row.population ?? null)}</td>
                        <td>
                          {onAddCompare ? (
                            <button
                              className="row-action"
                              onClick={(event) => {
                                event.stopPropagation();
                                onAddCompare(row);
                              }}
                              type="button"
                            >
                              {row.geoid && comparedGeoids?.has(row.geoid) ? "Added" : "Compare"}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                : resultKind === "remoteness"
                  ? (rows as RemotenessRow[]).map((row) => (
                      <tr
                        key={`${row.candidate.name}-${row.nearest_match.name}`}
                        className={isSelected(selected, row.candidate.name) ? "selected" : ""}
                        onClick={() =>
                          onSelect({
                            kind: "remoteness",
                            item: row,
                          })
                        }
                      >
                        <td>
                          <strong>{row.candidate.name}</strong>
                          <div className="table-subline">{friendlySumlevel(row.candidate.sumlevel)}</div>
                        </td>
                        <td>
                          <strong>{formatNumber(row.candidate_value)}</strong>
                          <div className="table-subline">{row.metric_label}</div>
                        </td>
                        <td>{row.nearest_match.name}</td>
                        <td>
                          {formatNumber(row.distance)} {row.distance_unit}
                        </td>
                      </tr>
                    ))
                  : (rows as LocalAverageRow[]).map((row) => (
                      <tr
                        key={row.candidate.name}
                        className={isSelected(selected, row.candidate.name) ? "selected" : ""}
                        onClick={() =>
                          onSelect({
                            kind: "local-average",
                            item: row,
                          })
                        }
                      >
                        <td>
                          <strong>{row.candidate.name}</strong>
                          <div className="table-subline">{friendlySumlevel(row.candidate.sumlevel)}</div>
                        </td>
                        <td>
                          {formatNumber(row.candidate_value)}{" "}
                          <span className="muted">({row.metric_label})</span>
                        </td>
                        <td>{formatNumber(row.local_average)}</td>
                        <td>
                          {formatNumber(row.neighbor_span)} {row.span_unit}
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </SectionCard>
  );
}
