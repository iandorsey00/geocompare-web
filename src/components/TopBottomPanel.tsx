import { useMemo, useState } from "react";
import { GeoCompareApi } from "../lib/api";
import { formatMetricValue } from "../lib/format";
import { countiesByState, stateOptions } from "../lib/geo-options";
import type { ApiConfig, GeographyProfile, NearestRow, RankingRow, SearchSelection } from "../lib/types";
import { DetailPanel } from "./DetailPanel";
import { NearestPanel } from "./NearestPanel";
import { SectionCard } from "./SectionCard";

type TopBottomPanelProps = {
  config: ApiConfig;
  comparedGeoids: Set<string>;
  onAddCompareProfile: (profile: GeographyProfile) => void;
  onBack: () => void;
};

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
];

const FILTER_OPTIONS = [
  { value: "population>=4000 population_density>=2500", label: "Urban geographies" },
  { value: "population>=100000", label: "Population 100k+" },
  { value: "population_density>=5000", label: "Density 5,000+" },
  { value: "median_household_income>=100000", label: "Median household income 100k+" },
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
  const [form, setForm] = useState<RankingFormState>(initialState);
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [resultMetricLabel, setResultMetricLabel] = useState("");
  const [feedback, setFeedback] = useState("Choose a metric and scope to start a ranking.");
  const [selected, setSelected] = useState<SearchSelection | null>(null);
  const [profile, setProfile] = useState<GeographyProfile | null>(null);
  const [nearestRows, setNearestRows] = useState<NearestRow[]>([]);
  const [nearestStatus, setNearestStatus] = useState("");
  const [view, setView] = useState<"results" | "profile">("results");
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingNearest, setIsLoadingNearest] = useState(false);

  const api = useMemo(() => new GeoCompareApi(config), [config]);
  const effectiveWhere = form.wherePreset === "__custom__" ? form.customWhere.trim() : form.wherePreset;
  const countyOptions = form.stateValue ? countiesByState[form.stateValue] ?? [] : [];

  const withinOptions = useMemo(() => {
    switch (form.geographyScope) {
      case "states+":
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

  async function openProfileFromSummary(summary: RankingRow["geography"] | NearestRow["geography"]) {
    const attempts = [summary.display_name, summary.name, summary.canonical_name].filter(
      (value, index, values) => Boolean(value) && values.indexOf(value) === index,
    );

    setSelected({ kind: "search", item: summary });
    setIsLoadingProfile(true);
    setProfile(null);
    setNearestRows([]);
    setNearestStatus("");
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
        title="Rank geographies"
        subtitle="Use ranking mode to explore highest or lowest values, then open any geography as a profile."
        actions={
          <button className="secondary-button" onClick={onBack} type="button">
            Back to search
          </button>
        }
      >
        <form
          className="ranking-form"
          onSubmit={(event) => {
            event.preventDefault();
            void runRanking();
          }}
        >
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
              {isRunning ? "Loading..." : "Run ranking"}
            </button>
          </div>
        </form>
      </SectionCard>

      {view === "results" ? (
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
            Back to ranking results
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
        </div>
      )}
    </div>
  );
}
