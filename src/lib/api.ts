import type {
  ApiConfig,
  GeographyProfile,
  LocalAverageParams,
  LocalAverageResponse,
  RemotenessParams,
  RemotenessResponse,
  ResolveResponse,
  SearchParams,
  SearchResponse,
} from "./types";

type Primitive = string | number | boolean | undefined;

function withTrailingSlashRemoved(value: string) {
  return value.replace(/\/+$/, "");
}

function toAuthHeader(username: string, password: string) {
  if (!username && !password) {
    return undefined;
  }

  return `Basic ${btoa(`${username}:${password}`)}`;
}

function buildQuery(params: Record<string, Primitive>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }
    searchParams.set(key, String(value));
  }

  return searchParams.toString();
}

export class GeoCompareApi {
  private readonly baseUrl: string;
  private readonly authHeader?: string;

  constructor(config: ApiConfig) {
    this.baseUrl = withTrailingSlashRemoved(config.baseUrl);
    this.authHeader = toAuthHeader(config.username, config.password);
  }

  private async request<T>(path: string, params: Record<string, Primitive> = {}) {
    const query = buildQuery(params);
    const url = `${this.baseUrl}${path}${query ? `?${query}` : ""}`;
    const response = await fetch(url, {
      headers: this.authHeader ? { Authorization: this.authHeader } : undefined,
    });

    if (!response.ok) {
      const maybeJson = await response
        .json()
        .catch(async () => ({ detail: await response.text() }));
      const detail =
        typeof maybeJson?.detail === "string"
          ? maybeJson.detail
          : `Request failed with status ${response.status}`;
      throw new Error(detail);
    }

    return (await response.json()) as T;
  }

  health() {
    return this.request<{ status: string; repository: string }>("/health");
  }

  search(params: SearchParams) {
    return this.request<SearchResponse>("/search", params);
  }

  profile(name: string, officialLabels = false) {
    return this.request<GeographyProfile>("/profile", {
      name,
      official_labels: officialLabels,
    });
  }

  resolve(query: string, n = 5) {
    return this.request<ResolveResponse>("/resolve", { query, n });
  }

  remoteness(params: RemotenessParams) {
    return this.request<RemotenessResponse>("/remoteness", params);
  }

  localAverage(params: LocalAverageParams) {
    return this.request<LocalAverageResponse>("/local-average", params);
  }
}
