import { useEffect, useState } from "react";
import { ApiSettingsPanel } from "./components/ApiSettingsPanel";
import { DetailPanel } from "./components/DetailPanel";
import { ResultsTable } from "./components/ResultsTable";
import { SearchPanel } from "./components/SearchPanel";
import { TopBottomPanel } from "./components/TopBottomPanel";
import { GeoCompareApi } from "./lib/api";
import type {
  ApiConfig,
  GeographyProfile,
  GeographySummary,
  SearchParams,
  SelectedRow,
} from "./lib/types";

const STORAGE_KEY = "geocompare-web-config";

const defaultConfig: ApiConfig = {
  baseUrl: import.meta.env.VITE_GEOCOMPARE_API_BASE_URL ?? "/api",
  username: import.meta.env.VITE_GEOCOMPARE_AUTH_USERNAME ?? "",
  password: import.meta.env.VITE_GEOCOMPARE_AUTH_PASSWORD ?? "",
};

function selectedName(selected: SelectedRow | null) {
  if (!selected) {
    return null;
  }

  if (selected.kind === "search") {
    return selected.item.name;
  }

  return selected.item.candidate.name;
}

export default function App() {
  const [surface, setSurface] = useState<"search" | "top" | "bottom">("search");
  const [config, setConfig] = useState<ApiConfig>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultConfig;
    }

    try {
      return { ...defaultConfig, ...JSON.parse(stored) };
    } catch {
      return defaultConfig;
    }
  });
  const [healthStatus, setHealthStatus] = useState(
    "Use /api with the Vite proxy for local development, or enter a direct URL plus credentials if CORS is enabled.",
  );
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [searchRows, setSearchRows] = useState<GeographySummary[]>([]);
  const [selected, setSelected] = useState<SelectedRow | null>(null);
  const [profile, setProfile] = useState<GeographyProfile | null>(null);
  const [feedback, setFeedback] = useState(
    "Search for a geography, or switch into a ranking mode.",
  );

  const api = new GeoCompareApi(config);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  async function loadProfile(name: string) {
    setIsLoadingProfile(true);
    try {
      const nextProfile = await api.profile(name, true);
      setProfile(nextProfile);
    } catch (error) {
      setProfile(null);
      setFeedback(error instanceof Error ? error.message : "Profile request failed.");
    } finally {
      setIsLoadingProfile(false);
    }
  }

  async function handleCheckHealth() {
    setIsCheckingHealth(true);
    try {
      const response = await api.health();
      setHealthStatus(`Connected. Repository: ${response.repository}.`);
    } catch (error) {
      setHealthStatus(error instanceof Error ? error.message : "Health check failed.");
    } finally {
      setIsCheckingHealth(false);
    }
  }

  async function handleSearch(params: SearchParams) {
    setIsSearching(true);
    setFeedback("Searching geographies...");
    try {
      const response = await api.search(params);
      setSurface("search");
      setSearchRows(response.results);
      setFeedback(`Found ${response.count} result${response.count === 1 ? "" : "s"} for “${response.query}”.`);

      if (response.results[0]) {
        const nextSelection: SelectedRow = {
          kind: "search",
          item: response.results[0],
        };
        setSelected(nextSelection);
        void loadProfile(nextSelection.item.name);
      } else {
        setSelected(null);
        setProfile(null);
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Search request failed.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="minimal-shell">
        <header className="minimal-header">
          <p className="brand-mark">GeoCompare</p>
          <p className="status-copy">{feedback}</p>
        </header>

        {surface === "search" ? (
          <section className="search-home">
            <SearchPanel onSearch={handleSearch} isLoading={isSearching} compact />
            <nav className="action-links" aria-label="Primary actions">
              <button className="text-link" onClick={() => setSurface("top")} type="button">
                Top
              </button>
              <button className="text-link" onClick={() => setSurface("bottom")} type="button">
                Bottom
              </button>
            </nav>
          </section>
        ) : (
          <TopBottomPanel mode={surface} onBack={() => setSurface("search")} />
        )}

        {surface === "search" ? (
          <div className="content-grid">
            <ResultsTable
              resultKind="search"
              rows={searchRows}
              selected={selected}
              onSelect={(nextSelection) => {
                setSelected(nextSelection);
                void loadProfile(selectedName(nextSelection)!);
              }}
              title="Geographies"
              subtitle="Choose a result to open its profile."
            />
            <DetailPanel selected={selected} profile={profile} isLoading={isLoadingProfile} />
          </div>
        ) : null}

        <details className="settings-drawer">
          <summary>Connection settings</summary>
          <ApiSettingsPanel
            config={config}
            onChange={setConfig}
            healthStatus={healthStatus}
            onCheckHealth={handleCheckHealth}
            isCheckingHealth={isCheckingHealth}
          />
        </details>
      </main>
    </div>
  );
}
