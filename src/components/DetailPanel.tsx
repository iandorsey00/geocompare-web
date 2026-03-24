import type { ReactNode } from "react";
import { formatMetricValue } from "../lib/format";
import type { GeographyProfile, SelectedRow } from "../lib/types";
import { MapPanel } from "./MapPanel";
import { SectionCard } from "./SectionCard";

type DetailPanelProps = {
  selected: SelectedRow | null;
  profile: GeographyProfile | null;
  isLoading: boolean;
  actions?: ReactNode;
};

type ProfileRow = {
  key: string;
  label: string;
  pctKey?: string;
  indent?: 0 | 1 | 2;
};

type ProfileSection = {
  title: string;
  rows: ProfileRow[];
};

const PROFILE_SECTIONS: ProfileSection[] = [
  {
    title: "Geography",
    rows: [{ key: "land_area", label: "Land area" }],
  },
  {
    title: "Population",
    rows: [
      { key: "population", label: "Total population" },
      { key: "population_density", label: "Population density" },
    ],
  },
  {
    title: "Age",
    rows: [
      { key: "median_age", label: "Median age" },
      { key: "under_18", label: "Population under 18", pctKey: "under_18_pct" },
      { key: "population_18_to_64", label: "Population 18 to 64", pctKey: "population_18_to_64_pct" },
      { key: "age_65_plus", label: "Population 65 and over", pctKey: "age_65_plus_pct" },
    ],
  },
  {
    title: "Race",
    rows: [
      { key: "white_alone", label: "White alone", pctKey: "white_alone_pct", indent: 1 },
      {
        key: "white_alone_not_hispanic_or_latino",
        label: "Not Hispanic or Latino",
        pctKey: "white_alone_not_hispanic_or_latino_pct",
        indent: 2,
      },
      { key: "black_alone", label: "Black or African American alone", pctKey: "black_alone_pct", indent: 1 },
      { key: "asian_alone", label: "Asian alone", pctKey: "asian_alone_pct", indent: 1 },
      { key: "other_race", label: "Other race", pctKey: "other_race_pct", indent: 1 },
      { key: "__text_hispanic", label: "Hispanic or Latino (of any race)" },
      { key: "hispanic_or_latino", label: "Hispanic or Latino", pctKey: "hispanic_or_latino_pct", indent: 1 },
    ],
  },
  {
    title: "Education",
    rows: [
      {
        key: "population_25_years_and_older",
        label: "Total population 25 years and older",
        pctKey: "population_25_years_and_older_pct",
      },
      {
        key: "bachelors_degree_or_higher",
        label: "Bachelor's degree or higher",
        pctKey: "bachelors_degree_or_higher_pct",
        indent: 1,
      },
      {
        key: "graduate_degree_or_higher",
        label: "Graduate degree or higher",
        pctKey: "graduate_degree_or_higher_pct",
        indent: 1,
      },
    ],
  },
  {
    title: "Income",
    rows: [
      { key: "per_capita_income", label: "Per capita income" },
      { key: "median_household_income", label: "Median household income" },
    ],
  },
  {
    title: "Economy",
    rows: [
      {
        key: "population_below_poverty_level",
        label: "Population below poverty level",
        pctKey: "poverty_rate_pct",
      },
      { key: "unemployed_population", label: "Unemployed population", pctKey: "unemployment_rate_pct" },
    ],
  },
  {
    title: "Housing",
    rows: [
      { key: "households", label: "Total households" },
      { key: "average_household_size", label: "Average household size" },
      { key: "occupied_housing_units", label: "Occupied housing units" },
      {
        key: "homeowner_occupied_housing_units",
        label: "Owner-occupied housing units",
        pctKey: "homeownership_rate_pct",
        indent: 1,
      },
      { key: "median_year_structure_built", label: "Median year unit built" },
      { key: "median_rooms", label: "Median rooms" },
      { key: "median_value", label: "Median value" },
      { key: "median_rent", label: "Median rent" },
    ],
  },
  {
    title: "Crime",
    rows: [
      { key: "property_crime_count", label: "Property crimes", pctKey: "property_crime_rate" },
      { key: "total_crime_count", label: "Total crimes", pctKey: "total_crime_rate" },
      { key: "violent_crime_count", label: "Violent crimes", pctKey: "violent_crime_rate" },
    ],
  },
  {
    title: "Voter registration",
    rows: [
      { key: "registered_voters", label: "Registered voters", pctKey: "registered_voters_pct" },
      { key: "democratic_voters", label: "Democratic voters", pctKey: "democratic_voters_pct", indent: 1 },
      { key: "republican_voters", label: "Republican voters", pctKey: "republican_voters_pct", indent: 1 },
      { key: "other_voters", label: "Other voters", pctKey: "other_voters_pct", indent: 1 },
    ],
  },
];

function parseNumericMetric(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  const normalized = value
    .replace(/[$,%]/g, "")
    .replace(/,/g, "")
    .replace(/\/sqmi/g, "")
    .replace(/\s*sqmi/g, "")
    .trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function derivePercent(profile: GeographyProfile, key: string) {
  const metrics = profile.metrics;
  const numerator = parseNumericMetric(metrics[key]);

  const denominators: Record<string, string> = {
    under_18: "population",
    population_18_to_64: "population",
    age_65_plus: "population",
    white_alone: "population",
    white_alone_not_hispanic_or_latino: "population",
    black_alone: "population",
    asian_alone: "population",
    other_race: "population",
    hispanic_or_latino: "population",
    population_25_years_and_older: "population",
    bachelors_degree_or_higher: "population_25_years_and_older",
    graduate_degree_or_higher: "population_25_years_and_older",
    population_below_poverty_level: "poverty_universe",
    unemployed_population: "labor_force",
    homeowner_occupied_housing_units: "occupied_housing_units",
    registered_voters: "population",
  };

  const denominatorKey = denominators[key];
  const denominator = denominatorKey ? parseNumericMetric(metrics[denominatorKey]) : undefined;

  if (typeof numerator === "number" && typeof denominator === "number" && denominator > 0) {
    return numerator / denominator;
  }

  return undefined;
}

function deriveMetricValue(profile: GeographyProfile, key: string) {
  const metrics = profile.metrics;

  if (key === "population_density") {
    const population = parseNumericMetric(metrics.population);
    const landArea = parseNumericMetric(metrics.land_area);
    if (typeof population === "number" && typeof landArea === "number" && landArea > 0) {
      return population / landArea;
    }
  }

  return undefined;
}

function getPercentValue(profile: GeographyProfile, row: ProfileRow) {
  if (!row.pctKey) {
    return undefined;
  }

  const derived = derivePercent(profile, row.key);
  if (typeof derived !== "undefined") {
    return derived;
  }

  const explicit = profile.metrics[row.pctKey];
  if (typeof explicit !== "undefined") {
    return explicit;
  }
  return undefined;
}

function renderMetricRow(profile: GeographyProfile, row: ProfileRow) {
  if (row.key.startsWith("__text_")) {
    return (
      <div className="profile-text-row" key={row.key}>
        {row.label}
      </div>
    );
  }

  const value =
    typeof profile.metrics[row.key] !== "undefined"
      ? profile.metrics[row.key]
      : deriveMetricValue(profile, row.key);
  if (typeof value === "undefined") {
    return null;
  }

  const pctValue = getPercentValue(profile, row);
  const indentClass = row.indent === 2 ? "indent-2" : row.indent === 1 ? "indent-1" : "";

  return (
    <div className={`metric-row ${indentClass}`.trim()} key={row.key}>
      <span className="metric-label">{row.label}</span>
      <strong className="metric-main">{formatMetricValue(row.key, value)}</strong>
      <span className="metric-pct">
        {typeof pctValue !== "undefined" ? formatMetricValue(row.pctKey ?? `${row.key}_pct`, pctValue) : ""}
      </span>
    </div>
  );
}

export function DetailPanel({ selected, profile, isLoading, actions }: DetailPanelProps) {
  if (!selected && !profile && !isLoading) {
    return null;
  }

  return (
    <SectionCard eyebrow="" title="" subtitle="">
      {isLoading ? <div className="plain-state"><p>Loading profile...</p></div> : null}
      {!isLoading && !profile ? <div className="plain-state"><p>Profile unavailable.</p></div> : null}
      {!isLoading && profile && selected ? (
        <div className="detail-stack">
          <div className="profile-header-block">
            <h3>{profile.name}</h3>
            <p className="profile-subhead">
              {profile.counties_display.join(", ") || profile.canonical_name}
            </p>
            {actions ? <div className="profile-actions">{actions}</div> : null}
          </div>
          <MapPanel profile={profile} />
          {PROFILE_SECTIONS.map((section) => {
            const rows = section.rows.map((row) => renderMetricRow(profile, row)).filter(Boolean);
            if (rows.length === 0) {
              return null;
            }

            return (
              <section className="metrics-section" key={section.title}>
                <p className="section-label">{section.title}</p>
                <div className="metrics-list compact-metrics">{rows}</div>
              </section>
            );
          })}
        </div>
      ) : null}
    </SectionCard>
  );
}
