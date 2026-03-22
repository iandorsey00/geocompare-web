import type {
  ApiConfig,
  GeoResolveResult,
  GeographyProfile,
  LocalAverageParams,
  LocalAverageResponse,
  NearestResponse,
  RankingResponse,
  RemotenessParams,
  RemotenessResponse,
  ResolveResponse,
  SearchParams,
  SearchResponse,
  SourcesResponse,
} from "./types";

type Primitive = string | number | boolean | undefined;
type RequestTimeoutName =
  | "health"
  | "search"
  | "profile"
  | "resolve"
  | "remoteness"
  | "localAverage"
  | "top"
  | "bottom"
  | "nearest"
  | "georesolve"
  | "sources";

const REQUEST_TIMEOUT_MS: Record<RequestTimeoutName, number> = {
  health: 10_000,
  search: 20_000,
  profile: 20_000,
  resolve: 10_000,
  remoteness: 20_000,
  localAverage: 20_000,
  top: 20_000,
  bottom: 20_000,
  nearest: 20_000,
  georesolve: 20_000,
  sources: 10_000,
};

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
  private readonly georesolveBaseUrl: string;
  private readonly authHeader?: string;

  constructor(config: ApiConfig) {
    this.baseUrl = withTrailingSlashRemoved(config.baseUrl);
    this.georesolveBaseUrl = withTrailingSlashRemoved(config.georesolveBaseUrl);
    this.authHeader = toAuthHeader(config.username, config.password);
  }

  private async request<T>(
    baseUrl: string,
    path: string,
    params: Record<string, Primitive> = {},
    timeoutName: RequestTimeoutName,
    options: { signal?: AbortSignal } = {},
  ) {
    const query = buildQuery(params);
    const url = `${baseUrl}${path}${query ? `?${query}` : ""}`;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort("timeout"), REQUEST_TIMEOUT_MS[timeoutName]);
    const abortFromOutside = () => controller.abort("superseded");

    if (options.signal) {
      if (options.signal.aborted) {
        abortFromOutside();
      } else {
        options.signal.addEventListener("abort", abortFromOutside, { once: true });
      }
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers: this.authHeader ? { Authorization: this.authHeader } : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        if (controller.signal.reason === "superseded") {
          throw new Error("Request canceled.");
        }
        throw new Error("This request took too long. Please try again.");
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
      if (options.signal) {
        options.signal.removeEventListener("abort", abortFromOutside);
      }
    }

    if (!response.ok) {
      const rawBody = await response.text();
      let detail = `Request failed with status ${response.status}`;

      if (rawBody.trim()) {
        try {
          const maybeJson = JSON.parse(rawBody);
          if (typeof maybeJson?.detail === "string" && maybeJson.detail.trim()) {
            detail = maybeJson.detail;
          } else {
            detail = rawBody;
          }
        } catch {
          detail = rawBody;
        }
      }

      throw new Error(detail);
    }

    return (await response.json()) as T;
  }

  health() {
    return this.request<{ status: string; repository: string }>(this.baseUrl, "/health", {}, "health");
  }

  search(params: SearchParams, signal?: AbortSignal) {
    return this.request<SearchResponse>(this.baseUrl, "/search", params, "search", { signal });
  }

  profile(name: string, officialLabels = false) {
    return this.request<GeographyProfile>(
      this.baseUrl,
      "/profile",
      {
        name,
        official_labels: officialLabels,
      },
      "profile",
    );
  }

  profileByGeoid(geoid: string, officialLabels = false) {
    return this.request<GeographyProfile>(
      this.baseUrl,
      "/profile",
      {
        geoid,
        official_labels: officialLabels,
      },
      "profile",
    );
  }

  resolve(query: string, n = 5) {
    return this.request<ResolveResponse>(this.baseUrl, "/resolve", { query, n }, "resolve");
  }

  georesolve(address: string) {
    return this.request<GeoResolveResult>(this.georesolveBaseUrl, "/resolve", { address }, "georesolve");
  }

  georesolveCurrentLocation(latitude: number, longitude: number) {
    return this.request<GeoResolveResult>(
      this.georesolveBaseUrl,
      "/resolve-current-location",
      { latitude, longitude },
      "georesolve",
    );
  }

  remoteness(params: RemotenessParams) {
    return this.request<RemotenessResponse>(this.baseUrl, "/remoteness", params, "remoteness");
  }

  localAverage(params: LocalAverageParams) {
    return this.request<LocalAverageResponse>(this.baseUrl, "/local-average", params, "localAverage");
  }

  top(params: { data_identifier: string; scope: string; where?: string; n: number; official_labels?: boolean }) {
    return this.request<RankingResponse>(this.baseUrl, "/top", params, "top");
  }

  bottom(params: { data_identifier: string; scope: string; where?: string; n: number; official_labels?: boolean }) {
    return this.request<RankingResponse>(this.baseUrl, "/bottom", params, "bottom");
  }

  nearest(params: {
    name: string;
    scope?: string;
    where?: string;
    n?: number;
    official_labels?: boolean;
    kilometers?: boolean;
  }) {
    return this.request<NearestResponse>(this.baseUrl, "/nearest", params, "nearest");
  }

  sources() {
    return this.request<SourcesResponse>(this.baseUrl, "/sources", {}, "sources");
  }
}
