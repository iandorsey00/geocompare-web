import { formatMetricValue } from "../lib/format";
import type { GeographyProfile } from "../lib/types";

type ComparePanelProps = {
  profiles: GeographyProfile[];
  onBack: () => void;
  onRemove: (profile: GeographyProfile) => void;
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
  { title: "Geography", rows: [{ key: "land_area", label: "Land area" }] },
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
      { key: "population_below_poverty_level", label: "Population below poverty level", pctKey: "poverty_rate_pct" },
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
  const normalized = value.replace(/[$,%]/g, "").replace(/,/g, "").replace(/\/sqmi/g, "").trim();
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
  const denominator = denominators[key] ? parseNumericMetric(metrics[denominators[key]]) : undefined;
  if (typeof numerator === "number" && typeof denominator === "number" && denominator > 0) {
    return (numerator / denominator) * 100;
  }
  return undefined;
}

function getPercentValue(profile: GeographyProfile, row: ProfileRow) {
  if (!row.pctKey || row.key.startsWith("__text_")) {
    return undefined;
  }
  return typeof profile.metrics[row.pctKey] !== "undefined"
    ? profile.metrics[row.pctKey]
    : derivePercent(profile, row.key);
}

export function ComparePanel({ profiles, onBack, onRemove }: ComparePanelProps) {
  if (profiles.length === 0) {
    return null;
  }

  function getCountyLabel(profile: GeographyProfile) {
    if (profile.counties_display.length > 0) {
      return profile.counties_display.join(", ");
    }
    if (profile.counties.length > 0) {
      return profile.counties.join(", ");
    }
    return "";
  }

  return (
    <div className="compare-view">
      <button className="text-link back-link" onClick={onBack} type="button">
        Back to results
      </button>
      <div className="compare-topbar">
        <table className="compare-table compare-head-table">
          <tbody>
            <tr>
              <th className="compare-label compare-top-label" scope="row">
                Geography
              </th>
              {profiles.map((profile) => (
                <td className="compare-name-cell" key={profile.geoid ?? profile.name}>
                  <div className="compare-name">{profile.name}</div>
                  {getCountyLabel(profile) ? (
                    <div className="compare-subname">{getCountyLabel(profile)}</div>
                  ) : null}
                  <button className="text-link" onClick={() => onRemove(profile)} type="button">
                    Remove
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="compare-sections">
        {PROFILE_SECTIONS.map((section) => (
          <section className="metrics-section" key={section.title}>
            <p className="section-label">{section.title}</p>
            <div className="compare-table-wrap">
              <table className="compare-table">
                <tbody>
                  {section.rows.map((row) => {
                    if (row.key.startsWith("__text_")) {
                      return (
                        <tr key={row.key}>
                          <td className="compare-text-row" colSpan={profiles.length + 1}>
                            {row.label}
                          </td>
                        </tr>
                      );
                    }

                    const anyValue = profiles.some((profile) => typeof profile.metrics[row.key] !== "undefined");
                    if (!anyValue) {
                      return null;
                    }

                    return (
                      <tr key={row.key}>
                        <td className={`compare-label indent-${row.indent ?? 0}`.trim()}>{row.label}</td>
                        {profiles.map((profile) => {
                          const value = profile.metrics[row.key];
                          const pctValue = getPercentValue(profile, row);
                          return (
                            <td className="compare-value-cell" key={`${profile.geoid ?? profile.name}-${row.key}`}>
                              <span className="compare-main">{formatMetricValue(row.key, value)}</span>
                              <span className="compare-pct">
                                {typeof pctValue !== "undefined"
                                  ? formatMetricValue(row.pctKey ?? `${row.key}_pct`, pctValue)
                                  : ""}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
