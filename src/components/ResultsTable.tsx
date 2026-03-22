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

export function ResultsTable({
  resultKind,
  rows,
  selected,
  onSelect,
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
        <div className="table-wrap minimal-table-wrap">
          <table>
            <thead>
              {resultKind === "search" ? (
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>State</th>
                  <th>GEOID</th>
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
                        <td>{row.geoid ?? "—"}</td>
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
                          {formatNumber(row.candidate_value)}{" "}
                          <span className="muted">({row.metric_label})</span>
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
      )}
    </SectionCard>
  );
}
