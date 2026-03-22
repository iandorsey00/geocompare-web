export type ApiConfig = {
  baseUrl: string;
  username: string;
  password: string;
};

export type GeographySummary = {
  name: string;
  display_name: string;
  canonical_name: string;
  sumlevel: string | null;
  state: string | null;
  geoid: string | null;
  counties: string[];
  counties_display: string[];
};

export type GeographyProfile = GeographySummary & {
  metrics: Record<string, number | string | null>;
};

export type SearchResponse = {
  query: string;
  count: number;
  results: GeographySummary[];
};

export type RankingRow = {
  geography: GeographySummary;
  metric_label: string;
  metric_value: number | string | null;
};

export type RankingResponse = {
  data_identifier: string;
  metric_label: string;
  scope: string;
  count: number;
  results: RankingRow[];
};

export type NearestRow = {
  geography: GeographySummary;
  distance_miles: number;
  distance: number;
  distance_unit: string;
};

export type NearestResponse = {
  query: string;
  scope: string;
  count: number;
  results: NearestRow[];
};

export type ResolveResponse = {
  query: string;
  count: number;
  results: string[];
};

export type RemotenessRow = {
  candidate: GeographySummary;
  nearest_match: GeographySummary;
  metric_label: string;
  candidate_value: number;
  nearest_match_value: number;
  distance_miles: number;
  distance: number;
  distance_unit: string;
};

export type RemotenessResponse = {
  data_identifier: string;
  threshold: string;
  target: "below" | "above";
  scope: string;
  count: number;
  results: RemotenessRow[];
};

export type LocalAverageRow = {
  candidate: GeographySummary;
  metric_label: string;
  candidate_value: number;
  local_average: number;
  neighbor_span_miles: number;
  neighbor_span: number;
  span_unit: string;
};

export type LocalAverageResponse = {
  data_identifier: string;
  scope: string;
  neighbors: number;
  count: number;
  results: LocalAverageRow[];
};

export type SearchParams = {
  q: string;
  n: number;
};

export type RemotenessParams = {
  data_identifier: string;
  threshold: string;
  target: "below" | "above";
  scope: string;
  where: string;
  n: number;
  county_population_min?: number;
  county_density_min?: number;
  one_per_county: boolean;
  official_labels: boolean;
  kilometers: boolean;
};

export type LocalAverageParams = {
  data_identifier: string;
  scope: string;
  where: string;
  n: number;
  neighbors: number;
  county_population_min?: number;
  county_density_min?: number;
  one_per_county: boolean;
  official_labels: boolean;
  kilometers: boolean;
};

export type ResultKind = "search" | "remoteness" | "local-average";

export type SearchSelection = {
  kind: "search";
  item: GeographySummary;
};

export type RemotenessSelection = {
  kind: "remoteness";
  item: RemotenessRow;
};

export type LocalAverageSelection = {
  kind: "local-average";
  item: LocalAverageRow;
};

export type SelectedRow =
  | SearchSelection
  | RemotenessSelection
  | LocalAverageSelection;
