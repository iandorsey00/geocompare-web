import { useMemo, useState } from "react";
import { GeoCompareApi } from "../lib/api";
import { formatMetricValue } from "../lib/format";
import { countiesByState, stateOptions } from "../lib/geo-options";
import type {
  ApiConfig,
  GeographyProfile,
  NearestRow,
  RankingRow,
  RemotenessRow,
  SelectedRow,
  SimilarityRow,
} from "../lib/types";
import { DetailPanel } from "./DetailPanel";
import { NearestPanel } from "./NearestPanel";
import { ResultsTable } from "./ResultsTable";
import { SectionCard } from "./SectionCard";
import { SimilarityPanel } from "./SimilarityPanel";

type TopBottomPanelProps = {
  config: ApiConfig;
  comparedGeoids: Set<string>;
  onAddCompareProfile: (profile: GeographyProfile) => void;
  onBack: () => void;
};

type QueryMode = "ranking" | "remoteness";

type RankingFormState = {
  direction: "top" | "bottom";
  dataIdentifier: string;
  geographyScope: string;
  areaMode: "all" | "state" | "county" | "zctaPrefix";
  stateValue: string;
  countyValue: string;
  zctaPrefixValue: string;
  wherePreset: string;
  customWhere: string;
  n: number;
  officialLabels: boolean;
};

function parseOptionalNumber(value: string) {
  const normalized = value.replace(/,/g, "").trim();

  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const METRIC_OPTIONS = [
  { value: "median_household_income", label: "Median household income" },
  { value: "per_capita_income", label: "Per capita income" },
  { value: "median_rent", label: "Median rent" },
  { value: "median_value", label: "Median home value" },
  { value: "population", label: "Population" },
  { value: "population_density", label: "Population density" },
  { value: "median_age", label: "Median age" },
  { value: "under_18_pct", label: "Population under 18" },
  { value: "age_65_plus_pct", label: "Population 65 and over" },
  { value: "white_alone_pct", label: "White alone" },
  { value: "black_alone_pct", label: "Black population" },
  { value: "asian_alone_pct", label: "Asian population" },
  { value: "hispanic_or_latino_pct", label: "Hispanic or Latino" },
  { value: "bachelors_degree_or_higher_pct", label: "Bachelor's degree or higher" },
  { value: "graduate_degree_or_higher_pct", label: "Graduate degree or higher" },
  { value: "poverty_rate_pct", label: "Population below poverty level" },
  { value: "unemployment_rate_pct", label: "Unemployment rate" },
  { value: "homeownership_rate_pct", label: "Homeownership rate" },
  { value: "households", label: "Households" },
  { value: "average_household_size", label: "Average household size" },
  { value: "median_year_structure_built", label: "Median year built" },
  { value: "median_rooms", label: "Median rooms" },
  { value: "property_crime_rate", label: "Property crime rate" },
  { value: "total_crime_rate", label: "Total crime rate" },
  { value: "violent_crime_rate", label: "Violent crime rate" },
  { value: "registered_voters_pct", label: "Registered voters" },
  { value: "democratic_voters_pct", label: "Democratic voters" },
  { value: "republican_voters_pct", label: "Republican voters" },
];

const GEOGRAPHY_SCOPE_OPTIONS = [
  { value: "tracts+", label: "Census tracts" },
  { value: "zctas+", label: "ZCTAs" },
  { value: "places+", label: "Places" },
  { value: "counties+", label: "Counties" },
  { value: "states+", label: "States" },
  { value: "urbanareas+", label: "Urban areas" },
  { value: "cbsas+", label: "Metro areas" },
];

const FILTER_OPTIONS = [
  { value: "population>=10000", label: "Population >= 10,000" },
  { value: "population>=50000", label: "Population >= 50,000" },
  { value: "population>=100000", label: "Population >= 100,000" },
  { value: "population>=1000000", label: "Population >= 1,000,000" },
  { value: "__custom__", label: "Custom filter" },
  { value: "", label: "No filter" },
];

const COUNT_OPTIONS = [10, 15, 25, 50];

const initialState: RankingFormState = {
  direction: "top",
  dataIdentifier: "median_household_income",
  geographyScope: "places+",
  areaMode: "all",
  stateValue: "",
  countyValue: "",
  zctaPrefixValue: "",
  wherePreset: "",
  customWhere: "",
  n: 15,
  officialLabels: false,
};

function buildScope(form: RankingFormState) {
  if (form.areaMode === "all") {
    return form.geographyScope;
  }

  if (form.areaMode === "state" && form.stateValue) {
    return `${form.geographyScope}${form.stateValue.toLowerCase()}`;
  }

  if (form.areaMode === "county" && form.countyValue) {
    return `${form.geographyScope}${form.countyValue}`;
  }

  if (form.areaMode === "zctaPrefix" && form.zctaPrefixValue.trim()) {
    return `${form.geographyScope}${form.zctaPrefixValue.trim()}`;
  }

  return form.geographyScope;
}

export function TopBottomPanel({ config, comparedGeoids, onAddCompareProfile, onBack }: TopBottomPanelProps) {
  const [mode, setMode] = useState<QueryMode>("ranking");
  const [showAdvancedRemoteness, setShowAdvancedRemoteness] = useState(false);
  const [form, setForm] = useState<RankingFormState>(initialState);
  const [remotenessThreshold, setRemotenessThreshold] = useState("100000");
  const [remotenessTarget, setRemotenessTarget] = useState<"below" | "above">("below");
  const [remotenessCountyPopulationMin, setRemotenessCountyPopulationMin] = useState("");
  const [remotenessCountyDensityMin, setRemotenessCountyDensityMin] = useState("");
  const [remotenessOnePerCounty, setRemotenessOnePerCounty] = useState(false);
  const [remotenessKilometers, setRemotenessKilometers] = useState(false);
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [remotenessRows, setRemotenessRows] = useState<RemotenessRow[]>([]);
  const [resultMetricLabel, setResultMetricLabel] = useState("");
  const [feedback, setFeedback] = useState("Choose a metric and scope to start exploring.");
  const [selected, setSelected] = useState<SelectedRow | null>(null);
  const [profile, setProfile] = useState<GeographyProfile | null>(null);
  const [nearestRows, setNearestRows] = useState<NearestRow[]>([]);
  const [nearestStatus, setNearestStatus] = useState("");
  const [similarRows, setSimilarRows] = useState<SimilarityRow[]>([]);
  const [similarStatus, setSimilarStatus] = useState("");
  const [view, setView] = useState<"results" | "profile">("results");
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingNearest, setIsLoadingNearest] = useState(false);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);

  const api = useMemo(() => new GeoCompareApi(config), [config]);
  const effectiveWhere = form.wherePreset === "__custom__" ? form.customWhere.trim() : form.wherePreset;
  const countyOptions = form.stateValue ? countiesByState[form.stateValue] ?? [] : [];

  const withinOptions = useMemo(() => {
    switch (form.geographyScope) {
      case "states+":
      case "urbanareas+":
      case "cbsas+":
        return [{ value: "all", label: "Everywhere" }];
      case "counties+":
        return [
          { value: "all", label: "Everywhere" },
          { value: "state", label: "Within state" },
        ];
      case "zctas+":
        return [
          { value: "all", label: "Everywhere" },
          { value: "zctaPrefix", label: "ZIP prefix" },
        ];
      default:
        return [
          { value: "all", label: "Everywhere" },
          { value: "state", label: "Within state" },
          { value: "county", label: "Within county" },
        ];
    }
  }, [form.geographyScope]);

  async function runRanking() {
    if (form.areaMode === "state" && !form.stateValue) {
      setFeedback("Choose a state to run a state-scoped ranking.");
      return;
    }

    if (form.areaMode === "county" && (!form.stateValue || !form.countyValue)) {
      setFeedback("Choose a valid state and county to run a county-scoped ranking.");
      return;
    }

    if (form.areaMode === "zctaPrefix" && !form.zctaPrefixValue.trim()) {
      setFeedback("Enter a ZIP prefix to run a ZIP-prefixed ZCTA ranking.");
      return;
    }

    setIsRunning(true);
    setFeedback(`Loading ${form.direction} geographies...`);
    setSelected(null);
    setProfile(null);
    setNearestRows([]);
    setNearestStatus("");
    setRemotenessRows([]);
    setView("results");

    const scope = buildScope(form);

    try {
      const response =
        form.direction === "top"
          ? await api.top({
              data_identifier: form.dataIdentifier,
              scope,
              where: effectiveWhere,
              n: form.n,
              official_labels: form.officialLabels,
            })
          : await api.bottom({
              data_identifier: form.dataIdentifier,
              scope,
              where: effectiveWhere,
              n: form.n,
              official_labels: form.officialLabels,
            });

      setRows(response.results);
      setResultMetricLabel(response.metric_label);
      setFeedback(
        `Showing ${response.count} ${form.direction === "top" ? "highest" : "lowest"} geographies for ${response.metric_label}.`,
      );
    } catch (error) {
      setRows([]);
      setResultMetricLabel("");
      setFeedback(error instanceof Error ? error.message : "Ranking request failed.");
    } finally {
      setIsRunning(false);
    }
  }

  async function runRemoteness() {
    if (!remotenessThreshold.trim()) {
      setFeedback("Enter a threshold to run a remoteness query.");
      return;
    }

    if (form.areaMode === "state" && !form.stateValue) {
      setFeedback("Choose a state to run a state-scoped remoteness query.");
      return;
    }

    if (form.areaMode === "county" && (!form.stateValue || !form.countyValue)) {
      setFeedback("Choose a valid state and county to run a county-scoped remoteness query.");
      return;
    }

    if (form.areaMode === "zctaPrefix" && !form.zctaPrefixValue.trim()) {
      setFeedback("Enter a ZIP prefix to run a ZIP-prefixed ZCTA remoteness query.");
      return;
    }

    setIsRunning(true);
    setFeedback("Loading remoteness results...");
    setSelected(null);
    setProfile(null);
    setRows([]);
    setNearestRows([]);
    setNearestStatus("");
    setView("results");

    const scope = buildScope(form);

    try {
      const response = await api.remoteness({
        data_identifier: form.dataIdentifier,
        threshold: remotenessThreshold.trim(),
        target: remotenessTarget,
        scope,
        where: effectiveWhere,
        n: form.n,
        county_population_min: parseOptionalNumber(remotenessCountyPopulationMin),
        county_density_min: parseOptionalNumber(remotenessCountyDensityMin),
        official_labels: form.officialLabels,
        one_per_county: remotenessOnePerCounty,
        kilometers: remotenessKilometers,
      });

      setRemotenessRows(response.results);
      setResultMetricLabel(response.results[0]?.metric_label ?? "");
      setFeedback(
        response.results.length > 0
          ? `Showing ${response.count} most remote geographies ${remotenessTarget} the ${response.results[0]?.metric_label ?? "selected metric"} threshold.`
          : "No geographies matched that remoteness query.",
      );
    } catch (error) {
      setRemotenessRows([]);
      setFeedback(error instanceof Error ? error.message : "Remoteness request failed.");
    } finally {
      setIsRunning(false);
    }
  }

  async function openProfileFromSummary(summary: RankingRow["geography"] | NearestRow["geography"] | RemotenessRow["candidate"]) {
    const attempts = [summary.display_name, summary.name, summary.canonical_name].filter(
      (value, index, values) => Boolean(value) && values.indexOf(value) === index,
    );

    setSelected({ kind: "search", item: summary });
    setIsLoadingProfile(true);
    setProfile(null);
    setNearestRows([]);
    setNearestStatus("");
    setSimilarRows([]);
    setSimilarStatus("");
    setView("profile");

    if (summary.geoid) {
      try {
        const nextProfile = await api.profileByGeoid(summary.geoid, form.officialLabels);
        setProfile(nextProfile);
        setFeedback(`Opened ${nextProfile.name}.`);
        setIsLoadingProfile(false);
        return;
      } catch {
        // Fall back to name-based lookup below.
      }
    }

    for (const attempt of attempts) {
      try {
        const nextProfile = await api.profile(attempt, form.officialLabels);
        setProfile(nextProfile);
        setFeedback(`Opened ${nextProfile.name}.`);
        setIsLoadingProfile(false);
        return;
      } catch {
        continue;
      }
    }

    setIsLoadingProfile(false);
    setFeedback("Profile unavailable.");
  }

  return (
    <div className="top-bottom-shell">
      <SectionCard
        eyebrow="Ranking"
        title={mode === "ranking" ? "Rank geographies" : "Find remote geographies"}
        subtitle={
          mode === "ranking"
            ? "Use ranking mode to explore highest or lowest values, then open any geography as a profile."
            : "Find geographies furthest from the nearest match above or below a threshold."
        }
        actions={
          <div className="panel-action-links">
            <div className="action-links" aria-label="Explore modes">
              <button
                className={`surface-link${mode === "ranking" ? " is-active" : ""}`}
                onClick={() => setMode("ranking")}
                type="button"
              >
                Ranking
              </button>
              <button
                className={`surface-link${mode === "remoteness" ? " is-active" : ""}`}
                onClick={() => setMode("remoteness")}
                type="button"
              >
                Remoteness
              </button>
            </div>
            <button className="secondary-button" onClick={onBack} type="button">
              Back to search
            </button>
          </div>
        }
      >
        <form
          className="ranking-form"
          onSubmit={(event) => {
            event.preventDefault();
            void (mode === "ranking" ? runRanking() : runRemoteness());
          }}
        >
          {mode === "ranking" ? (
            <label>
              <span>Direction</span>
              <select
                value={form.direction}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    direction: event.target.value as RankingFormState["direction"],
                  }))
                }
              >
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </select>
            </label>
          ) : (
            <label>
              <span>Target side</span>
              <select
                value={remotenessTarget}
                onChange={(event) => setRemotenessTarget(event.target.value as "below" | "above")}
              >
                <option value="below">Below threshold</option>
                <option value="above">Above threshold</option>
              </select>
            </label>
          )}
          <label>
            <span>Metric</span>
            <select
              value={form.dataIdentifier}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  dataIdentifier: event.target.value,
                }))
              }
            >
              {METRIC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {mode === "remoteness" ? (
            <label>
              <span>Threshold</span>
              <input
                placeholder="100000"
                value={remotenessThreshold}
                onChange={(event) => setRemotenessThreshold(event.target.value)}
              />
            </label>
          ) : null}
          <label>
            <span>Geography</span>
            <select
              value={form.geographyScope}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  geographyScope: event.target.value,
                  areaMode: (() => {
                    const nextScope = event.target.value;
                    if (nextScope === "states+") {
                      return "all";
                    }
                    if (nextScope === "counties+" && current.areaMode === "county") {
                      return "state";
                    }
                    if (nextScope !== "zctas+" && current.areaMode === "zctaPrefix") {
                      return "all";
                    }
                    return current.areaMode;
                  })(),
                  stateValue:
                    event.target.value === "states+" ? "" : current.stateValue,
                  countyValue:
                    event.target.value === "states+" || event.target.value === "counties+"
                      ? ""
                      : current.countyValue,
                }))
              }
            >
              {GEOGRAPHY_SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Within</span>
            <select
              value={form.areaMode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  areaMode: event.target.value as RankingFormState["areaMode"],
                  stateValue: event.target.value === "all" ? "" : current.stateValue,
                  countyValue: event.target.value === "county" ? current.countyValue : "",
                  zctaPrefixValue: event.target.value === "zctaPrefix" ? current.zctaPrefixValue : "",
                }))
              }
            >
              {withinOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {form.areaMode !== "all" && form.areaMode !== "zctaPrefix" ? (
            <label>
              <span>State</span>
              <select
                value={form.stateValue}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stateValue: event.target.value,
                    countyValue:
                      current.areaMode === "county" && current.stateValue !== event.target.value ? "" : current.countyValue,
                  }))
                }
              >
                <option value="">Select a state</option>
                {stateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {form.areaMode === "county" ? (
            <label>
              <span>County</span>
              <select
                value={form.countyValue}
                disabled={!form.stateValue}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    countyValue: event.target.value,
                  }))
                }
              >
                <option value="">{form.stateValue ? "Select a county" : "Select a state first"}</option>
                {countyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {form.areaMode === "zctaPrefix" ? (
            <label className="ranking-zcta-prefix-field">
              <span>ZIP prefix</span>
              <input
                className="ranking-zcta-prefix-input"
                inputMode="numeric"
                maxLength={5}
                pattern="[0-9]*"
                placeholder="9, 92, 926..."
                value={form.zctaPrefixValue}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    zctaPrefixValue: event.target.value.replace(/\D/g, "").slice(0, 5),
                  }))
                }
              />
            </label>
          ) : null}
          <label>
            <span>Filter</span>
            <select
              value={form.wherePreset}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  wherePreset: event.target.value,
                }))
              }
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Count</span>
            <select
              value={String(form.n)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  n: Number(event.target.value),
                }))
              }
            >
              {COUNT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {form.wherePreset === "__custom__" ? (
            <label className="ranking-form-wide">
              <span>Custom filter</span>
              <input
                placeholder="population>=100000"
                value={form.customWhere}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    customWhere: event.target.value,
                  }))
                }
              />
            </label>
          ) : null}
          {mode === "remoteness" ? (
            <button
              className="text-link search-advanced-toggle"
              onClick={() => setShowAdvancedRemoteness((current) => !current)}
              type="button"
            >
              {showAdvancedRemoteness ? "Hide advanced" : "Advanced"}
            </button>
          ) : null}
          {mode === "remoteness" && showAdvancedRemoteness ? (
            <label>
              <span>Min county population</span>
              <input
                inputMode="numeric"
                placeholder="Optional"
                value={remotenessCountyPopulationMin}
                onChange={(event) =>
                  setRemotenessCountyPopulationMin(event.target.value.replace(/[^\d,]/g, ""))
                }
              />
            </label>
          ) : null}
          {mode === "remoteness" && showAdvancedRemoteness ? (
            <label>
              <span>Min county density</span>
              <input
                inputMode="decimal"
                placeholder="Optional"
                value={remotenessCountyDensityMin}
                onChange={(event) =>
                  setRemotenessCountyDensityMin(event.target.value.replace(/[^0-9.,]/g, ""))
                }
              />
            </label>
          ) : null}
          {mode === "remoteness" && showAdvancedRemoteness ? (
            <label className="inline-toggle">
              <input
                type="checkbox"
                checked={remotenessOnePerCounty}
                onChange={(event) => setRemotenessOnePerCounty(event.target.checked)}
              />
              <span>One result per county</span>
            </label>
          ) : null}
          {mode === "remoteness" && showAdvancedRemoteness ? (
            <label className="inline-toggle">
              <input
                type="checkbox"
                checked={remotenessKilometers}
                onChange={(event) => setRemotenessKilometers(event.target.checked)}
              />
              <span>Show distance in kilometers</span>
            </label>
          ) : null}
          <label className="inline-toggle">
            <input
              type="checkbox"
              checked={form.officialLabels}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  officialLabels: event.target.checked,
                }))
              }
            />
            <span>Official tract labels</span>
          </label>
          <div className="ranking-actions">
            <button className="primary-button" disabled={isRunning} type="submit">
              {isRunning ? "Loading..." : mode === "ranking" ? "Run ranking" : "Run remoteness"}
            </button>
          </div>
        </form>
      </SectionCard>

      {view === "results" ? (
        mode === "ranking" ? (
          <SectionCard eyebrow="" title="" subtitle="">
            <div className="plain-state">
              <p>{feedback}</p>
            </div>
            {rows.length > 0 ? (
              <div className="ranking-results">
                <p className="section-label">Results</p>
                <div className="metrics-list">
                  {rows.map((row, index) => {
                    const countyLabel = row.geography.counties_display.join(", ");
                    const populationValue =
                      row.geography.population !== null && typeof row.geography.population !== "undefined"
                        ? formatMetricValue("population", row.geography.population)
                        : "";

                    return (
                      <button
                        className="ranking-row"
                        key={`${row.geography.geoid ?? row.geography.name}-${index}`}
                        onClick={() => {
                          void openProfileFromSummary(row.geography);
                        }}
                        type="button"
                      >
                        <span className="ranking-rank">{index + 1}</span>
                        <strong className="ranking-name">{row.geography.name}</strong>
                        <span className="ranking-population-value">
                          {populationValue || "—"}
                        </span>
                        <strong className="ranking-metric-value">
                          {formatMetricValue(form.dataIdentifier, row.metric_value)}
                        </strong>
                        <span className="ranking-county">{countyLabel || row.geography.canonical_name}</span>
                        <span className="ranking-population-label">Population</span>
                        <span className="ranking-metric-label">{resultMetricLabel || row.metric_label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </SectionCard>
        ) : (
          <ResultsTable
            resultKind="remoteness"
            rows={remotenessRows}
            selected={selected}
            onSelect={(nextSelection) => {
              setSelected(nextSelection);
              setView("profile");
              if (nextSelection.kind === "remoteness") {
                void openProfileFromSummary(nextSelection.item.candidate);
              }
            }}
            title=""
            subtitle={feedback}
          />
        )
      ) : (
        <div className="profile-view">
          <button
            className="text-link back-link"
            onClick={() => {
              setView("results");
              setNearestRows([]);
              setNearestStatus("");
            }}
            type="button"
          >
            Back to {mode === "ranking" ? "ranking" : "remoteness"} results
          </button>
          <DetailPanel
            selected={selected}
            profile={profile}
            isLoading={isLoadingProfile}
            actions={
              profile ? (
                <div className="profile-actions">
                  <button className="text-link" onClick={() => onAddCompareProfile(profile)} type="button">
                    {profile.geoid && comparedGeoids.has(profile.geoid) ? "Added to compare" : "Add to compare"}
                  </button>
                </div>
              ) : null
            }
          />
          {profile ? (
            <NearestPanel
              profile={profile}
              rows={nearestRows}
              isLoading={isLoadingNearest}
              statusText={nearestStatus}
              onRun={({ scope, where, n }) => {
                void (async () => {
                  setIsLoadingNearest(true);
                  setNearestStatus("Finding closest geographies...");
                  try {
                    const response = await api.nearest({
                      name: profile.display_name,
                      scope,
                      where,
                      n,
                      official_labels: form.officialLabels,
                    });
                    setNearestRows(response.results);
                    setNearestStatus(
                      response.results.length > 0
                        ? `Showing ${response.results.length} closest geographies.`
                        : "No nearby geographies matched that filter.",
                    );
                  } catch (error) {
                    setFeedback(error instanceof Error ? error.message : "Nearest request failed.");
                    setNearestStatus(error instanceof Error ? error.message : "Nearest request failed.");
                  } finally {
                    setIsLoadingNearest(false);
                  }
                })();
              }}
              onOpen={(row) => {
                void openProfileFromSummary(row.geography);
              }}
            />
          ) : null}
          {profile ? (
            <SimilarityPanel
              profile={profile}
              rows={similarRows}
              isLoading={isLoadingSimilar}
              statusText={similarStatus}
              officialLabels={form.officialLabels}
              onRun={({ mode: similarityMode, universe, universes, n, officialLabels }) => {
                void (async () => {
                  setIsLoadingSimilar(true);
                  setSimilarStatus("Finding similar geographies...");
                  try {
                    const response =
                      similarityMode === "similar-form"
                        ? await api.similarForm({
                            name: profile.display_name,
                            universe,
                            universes,
                            n,
                            official_labels: officialLabels,
                          })
                        : await api.similar({
                            name: profile.display_name,
                            universe,
                            universes,
                            n,
                            official_labels: officialLabels,
                          });
                    setSimilarRows(response.results);
                    setSimilarStatus(
                      response.results.length > 0
                        ? `Showing ${response.results.length} ${
                            similarityMode === "similar-form" ? "built-form" : "demographically"
                          } similar geographies.`
                        : "No similar geographies matched that query.",
                    );
                  } catch (error) {
                    const message =
                      error instanceof Error ? error.message : "Similarity request failed.";
                    setFeedback(message);
                    setSimilarStatus(
                      message.includes("404")
                        ? "Similarity support is not live on the backend yet."
                        : message,
                    );
                  } finally {
                    setIsLoadingSimilar(false);
                  }
                })();
              }}
              onOpen={(row) => {
                void openProfileFromSummary(row.geography);
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
