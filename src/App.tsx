import { useEffect, useMemo, useRef, useState } from "react";
import { ComparePanel } from "./components/ComparePanel";
import { DetailPanel } from "./components/DetailPanel";
import { GeoResolvePanel } from "./components/GeoResolvePanel";
import { NearestPanel } from "./components/NearestPanel";
import { ResultsTable } from "./components/ResultsTable";
import { SearchPanel } from "./components/SearchPanel";
import { SimilarityPanel } from "./components/SimilarityPanel";
import { TopBottomPanel } from "./components/TopBottomPanel";
import { GeoCompareApi } from "./lib/api";
import type {
  ApiConfig,
  GeographyProfile,
  GeographySummary,
  NearestRow,
  SearchSelection,
  SelectedRow,
  SimilarityRow,
  SourceRow,
} from "./lib/types";

const DEFAULT_FEEDBACK = "Search for a geography, or switch into a ranking mode.";

const defaultConfig: ApiConfig = {
  baseUrl: import.meta.env.VITE_GEOCOMPARE_API_BASE_URL ?? "/api",
  georesolveBaseUrl: import.meta.env.VITE_GEORESOLVE_API_BASE_URL ?? "/georesolve-api",
};

export default function App() {
  const [surface, setSurface] = useState<"search" | "ranking" | "resolve">("search");
  const [searchView, setSearchView] = useState<"results" | "profile" | "compare">("results");
  const [config] = useState<ApiConfig>(defaultConfig);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [searchRows, setSearchRows] = useState<GeographySummary[]>([]);
  const [selected, setSelected] = useState<SelectedRow | null>(null);
  const [profile, setProfile] = useState<GeographyProfile | null>(null);
  const [compareProfiles, setCompareProfiles] = useState<GeographyProfile[]>([]);
  const [nearestRows, setNearestRows] = useState<NearestRow[]>([]);
  const [isLoadingNearest, setIsLoadingNearest] = useState(false);
  const [nearestStatus, setNearestStatus] = useState("");
  const [similarRows, setSimilarRows] = useState<SimilarityRow[]>([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const [similarStatus, setSimilarStatus] = useState("");
  const [sourceRows, setSourceRows] = useState<SourceRow[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showApiInfo, setShowApiInfo] = useState(false);
  const [feedback, setFeedback] = useState(
    DEFAULT_FEEDBACK,
  );

  const api = useMemo(() => new GeoCompareApi(config), [config]);
  const activeSearchController = useRef<AbortController | null>(null);
  const currentYear = new Date().getFullYear();

  function handleReturnHome() {
    activeSearchController.current?.abort();
    setSurface("search");
    setSearchView("results");
    setSelected(null);
    setProfile(null);
    setSearchRows([]);
    setCompareProfiles([]);
    setNearestRows([]);
    setNearestStatus("");
    setSimilarRows([]);
    setSimilarStatus("");
    setFeedback(DEFAULT_FEEDBACK);
  }

  useEffect(() => {
    const baseTitle = "GeoCompare";

    if (surface === "resolve") {
      document.title = `GeoResolve - ${baseTitle}`;
      return;
    }

    if (surface === "ranking") {
      document.title = `Ranking - ${baseTitle}`;
      return;
    }

    if (searchView === "compare" && compareProfiles.length > 1) {
      document.title = `Compare ${compareProfiles.length} Geographies - ${baseTitle}`;
      return;
    }

    if (profile?.name) {
      document.title = `${profile.name} - ${baseTitle}`;
      return;
    }

    document.title = baseTitle;
  }, [compareProfiles.length, profile?.name, searchView, surface]);

  useEffect(() => {
    if (feedback === DEFAULT_FEEDBACK || isSearching || isLoadingProfile || isLoadingNearest) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback((current) => (current === feedback ? DEFAULT_FEEDBACK : current));
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [feedback, isSearching, isLoadingNearest, isLoadingProfile]);

  async function loadProfileForSelection(selection: SearchSelection) {
    const attempts = [
      selection.item.display_name,
      selection.item.name,
      selection.item.canonical_name,
    ].filter((value, index, items) => Boolean(value) && items.indexOf(value) === index);

    setIsLoadingProfile(true);
    setProfile(null);
    setNearestRows([]);
    setNearestStatus("");
    setSimilarRows([]);
    setSimilarStatus("");

    if (selection.item.geoid) {
      try {
        const nextProfile = await api.profileByGeoid(selection.item.geoid, true);
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
        const nextProfile = await api.profile(attempt, true);
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

  async function loadProfileForSummary(summary: GeographySummary) {
    if (summary.geoid) {
      try {
        return await api.profileByGeoid(summary.geoid, true);
      } catch {
        // Fall back to name-based lookup below.
      }
    }

    const attempts = [summary.display_name, summary.name, summary.canonical_name].filter(
      (value, index, items) => Boolean(value) && items.indexOf(value) === index,
    );

    for (const attempt of attempts) {
      try {
        return await api.profile(attempt, true);
      } catch {
        continue;
      }
    }

    return null;
  }

  async function hydrateSimilarityRows(rows: SimilarityRow[]) {
    const hydrated = await Promise.all(
      rows.map(async (row) => {
        if (row.geography.population !== null && typeof row.geography.population !== "undefined") {
          return row;
        }

        const nextProfile = await loadProfileForSummary(row.geography);
        if (!nextProfile) {
          return row;
        }

        return {
          ...row,
          geography: {
            name: nextProfile.name,
            display_name: nextProfile.display_name,
            canonical_name: nextProfile.canonical_name,
            sumlevel: nextProfile.sumlevel,
            state: nextProfile.state,
            geoid: nextProfile.geoid,
            population: nextProfile.metrics.population ?? row.geography.population ?? null,
            counties: nextProfile.counties,
            counties_display: nextProfile.counties_display,
          },
        };
      }),
    );

    return hydrated;
  }

  async function handleAddCompare(summary: GeographySummary) {
    if (summary.geoid && compareProfiles.some((profileItem) => profileItem.geoid === summary.geoid)) {
      return;
    }

    const nextProfile = await loadProfileForSummary(summary);
    if (!nextProfile) {
      setFeedback(`Unable to add ${summary.name} to compare.`);
      return;
    }

    setCompareProfiles((current) => [...current, nextProfile]);
    setFeedback(`Added ${nextProfile.name} to compare.`);
  }

  function handleAddCompareProfile(nextProfile: GeographyProfile) {
    if (nextProfile.geoid && compareProfiles.some((profileItem) => profileItem.geoid === nextProfile.geoid)) {
      return;
    }

    setCompareProfiles((current) => [...current, nextProfile]);
    setFeedback(`Added ${nextProfile.name} to compare.`);
  }

  function openProfileFromCompare(nextProfile: GeographyProfile) {
    setSelected({
      kind: "search",
      item: {
        name: nextProfile.name,
        display_name: nextProfile.display_name,
        canonical_name: nextProfile.canonical_name,
        sumlevel: nextProfile.sumlevel,
        state: nextProfile.state,
        geoid: nextProfile.geoid,
        counties: nextProfile.counties,
        counties_display: nextProfile.counties_display,
      },
    });
    setProfile(nextProfile);
    setNearestRows([]);
    setNearestStatus("");
    setSimilarRows([]);
    setSimilarStatus("");
    setSearchView("profile");
    setCompareProfiles([]);
    setFeedback(`Opened ${nextProfile.name}.`);
  }

  function handleRemoveCompare(profileToRemove: GeographyProfile) {
    const remainingProfiles = compareProfiles.filter(
      (profileItem) => profileItem.geoid !== profileToRemove.geoid,
    );

    if (remainingProfiles.length === 1) {
      openProfileFromCompare(remainingProfiles[0]);
      return;
    }

    setCompareProfiles(remainingProfiles);

    if (remainingProfiles.length === 0) {
      setSearchView("results");
      setFeedback("Compare list cleared.");
      return;
    }

    setFeedback(`Removed ${profileToRemove.name} from compare.`);
  }

  async function handleSearch(params: { q: string; n: number; includeTracts: boolean }) {
    activeSearchController.current?.abort();
    const nextController = new AbortController();
    activeSearchController.current = nextController;

    setIsSearching(true);
    setFeedback("Searching geographies...");
    try {
      const requestedCount = params.includeTracts ? params.n : Math.min(Math.max(params.n * 5, 25), 100);
      const runSearch = (query: string) => api.search({ q: query, n: requestedCount }, nextController.signal);
      const response = await runSearch(params.q);
      if (activeSearchController.current !== nextController) {
        return;
      }

      let nextRows = params.includeTracts
        ? response.results.slice(0, params.n)
        : response.results.filter((row) => row.sumlevel !== "140").slice(0, params.n);

      if (!params.includeTracts && nextRows.length === 0) {
        const fallbackQueries = [
          `${params.q} city`,
          `${params.q} county`,
          `${params.q} state`,
        ].filter((value, index, values) => values.indexOf(value) === index);

        for (const fallbackQuery of fallbackQueries) {
          const fallbackResponse = await runSearch(fallbackQuery);
          if (activeSearchController.current !== nextController) {
            return;
          }

          nextRows = fallbackResponse.results.filter((row) => row.sumlevel !== "140").slice(0, params.n);
          if (nextRows.length > 0) {
            break;
          }
        }
      }

      setSurface("search");
      setSearchRows(nextRows);
      setSelected(null);
      setProfile(null);
      setNearestRows([]);
      setNearestStatus("");
      setSimilarRows([]);
      setSimilarStatus("");

      if (nextRows.length === 1) {
        const nextSelection: SearchSelection = { kind: "search", item: nextRows[0] };
        setSelected(nextSelection);
        setSearchView("profile");
        setFeedback(`Opening ${nextRows[0].name}...`);
        void loadProfileForSelection(nextSelection);
      } else {
        setSearchView("results");
        setFeedback(
          `Found ${nextRows.length} result${nextRows.length === 1 ? "" : "s"} for “${params.q}”.`,
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Request canceled.") {
        return;
      }
      setFeedback(error instanceof Error ? error.message : "Search request failed.");
    } finally {
      if (activeSearchController.current === nextController) {
        activeSearchController.current = null;
        setIsSearching(false);
      }
    }
  }

  async function handleToggleSources() {
    if (!showSources) {
      setShowApiInfo(false);
    }

    if (showSources) {
      setShowSources(false);
      return;
    }

    setShowSources(true);
    if (sourceRows.length > 0 || isLoadingSources) {
      return;
    }

    setIsLoadingSources(true);
    try {
      const response = await api.sources();
      setSourceRows(response.results);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Sources request failed.");
    } finally {
      setIsLoadingSources(false);
    }
  }

  function handleToggleApiInfo() {
    if (!showApiInfo) {
      setShowSources(false);
    }

    setShowApiInfo((current) => !current);
  }

  return (
    <div className="app-shell">
      <main className="minimal-shell">
        <header className="minimal-header">
          <button className="brand-mark brand-button" onClick={handleReturnHome} type="button">
            GeoCompare
          </button>
          <p className="status-copy">{feedback}</p>
        </header>

        {compareProfiles.length > 1 ? (
          <div className="compare-launch">
            <button
              className="primary-button"
              onClick={() => {
                setSurface("search");
                setSearchView("compare");
              }}
              type="button"
            >
              Compare {compareProfiles.length} geographies
            </button>
          </div>
        ) : null}

        {surface === "search" ? (
          <section className="search-home">
            <nav className="action-links" aria-label="Primary actions">
              <button
                className="surface-link is-active"
                onClick={() => setSurface("search")}
                type="button"
              >
                Search
              </button>
              <button
                className="surface-link"
                onClick={() => setSurface("ranking")}
                type="button"
              >
                Ranking
              </button>
              <button
                className="surface-link"
                onClick={() => setSurface("resolve")}
                type="button"
              >
                GeoResolve
              </button>
            </nav>
            <SearchPanel onSearch={handleSearch} isLoading={isSearching} compact />
          </section>
        ) : surface === "resolve" ? (
          <GeoResolvePanel
            config={config}
            comparedGeoids={new Set(compareProfiles.map((profileItem) => profileItem.geoid ?? ""))}
            onAddCompareProfile={handleAddCompareProfile}
            onBack={() => setSurface("search")}
            onFeedback={setFeedback}
          />
        ) : (
          <TopBottomPanel
            config={config}
            comparedGeoids={new Set(compareProfiles.map((profileItem) => profileItem.geoid ?? ""))}
            onAddCompareProfile={handleAddCompareProfile}
            onBack={() => setSurface("search")}
          />
        )}

        {surface === "search" ? (
          <div className="results-stack">
            {searchView === "results" && compareProfiles.length > 0 ? (
              <div className="compare-launch">
                <button className="primary-button" onClick={() => setSearchView("compare")} type="button">
                  Compare {compareProfiles.length} geographies
                </button>
              </div>
            ) : null}
            {searchView === "results" && searchRows.length > 0 ? (
              <ResultsTable
                resultKind="search"
                rows={searchRows}
                selected={selected}
                onAddCompare={(row) => {
                  void handleAddCompare(row);
                }}
                comparedGeoids={new Set(compareProfiles.map((profileItem) => profileItem.geoid ?? ""))}
                onSelect={(nextSelection) => {
                  setSelected(nextSelection);
                  setSearchView("profile");
                  void loadProfileForSelection(nextSelection as SearchSelection);
                }}
                title=""
                subtitle=""
              />
            ) : null}
            {searchView === "profile" ? (
              <div className="profile-view">
                <button
                  className="text-link back-link"
                  onClick={() => {
                    setSearchView("results");
                    setNearestRows([]);
                    setNearestStatus("");
                    setSimilarRows([]);
                    setSimilarStatus("");
                  }}
                  type="button"
                >
                  Back to results
                </button>
                <DetailPanel
                  selected={selected}
                  profile={profile}
                  isLoading={isLoadingProfile}
                  actions={
                    profile ? (
                      <div className="profile-actions">
                        <button
                          className="text-link"
                          onClick={() => handleAddCompareProfile(profile)}
                          type="button"
                        >
                          {profile.geoid && compareProfiles.some((item) => item.geoid === profile.geoid)
                            ? "Added to compare"
                            : "Add to compare"}
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
                            official_labels: true,
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
                      const nextSelection: SearchSelection = { kind: "search", item: row.geography };
                      setSelected(nextSelection);
                      void loadProfileForSelection(nextSelection);
                    }}
                  />
                ) : null}
                {profile ? (
                  <SimilarityPanel
                    profile={profile}
                    rows={similarRows}
                    isLoading={isLoadingSimilar}
                    statusText={similarStatus}
                    officialLabels
                    onRun={({ mode, universe, universes, inState, inCounty, inZcta, n, officialLabels }) => {
                      void (async () => {
                        setIsLoadingSimilar(true);
                        setSimilarStatus("Finding similar geographies...");
                        try {
                          const response =
                            mode === "similar-form"
                              ? await api.similarForm({
                                  name: profile.display_name,
                                  universe,
                                  universes,
                                  in_state: inState,
                                  in_county: inCounty,
                                  in_zcta: inZcta,
                                  n,
                                  official_labels: officialLabels,
                                })
                              : await api.similar({
                                  name: profile.display_name,
                                  universe,
                                  universes,
                                  in_state: inState,
                                  in_county: inCounty,
                                  in_zcta: inZcta,
                                  n,
                                  official_labels: officialLabels,
                                });
                          const hydratedRows = await hydrateSimilarityRows(response.results);
                          setSimilarRows(hydratedRows);
                          setSimilarStatus(
                            hydratedRows.length > 0
                              ? `Showing ${hydratedRows.length} ${
                                  mode === "similar-form" ? "built-form" : "demographically"
                                } similar geographies.`
                              : "No similar geographies matched that query.",
                          );
                        } catch (error) {
                          const message =
                            error instanceof Error ? error.message : "Similarity request failed.";
                          setFeedback(message);
                          setSimilarStatus(message);
                        } finally {
                          setIsLoadingSimilar(false);
                        }
                      })();
                    }}
                    onOpen={(row) => {
                      const nextSelection: SearchSelection = { kind: "search", item: row.geography };
                      setSelected(nextSelection);
                      void loadProfileForSelection(nextSelection);
                    }}
                  />
                ) : null}
              </div>
            ) : null}
            {searchView === "compare" ? (
              <ComparePanel
                profiles={compareProfiles}
                onBack={() => setSearchView("results")}
                onRemove={handleRemoveCompare}
              />
            ) : null}
          </div>
        ) : null}

        {showSources ? (
          <section className="sources-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">References</p>
                <h2>Sources</h2>
                <p className="panel-subtitle">
                  Built-in data sources currently used by GeoCompare.
                </p>
              </div>
            </div>
            {isLoadingSources ? (
              <div className="plain-state"><p>Loading sources...</p></div>
            ) : (
              <div className="sources-list">
                {sourceRows.map((row) => (
                  <article className="source-row" key={row.key}>
                    <div className="source-heading">
                      <h3>{row.name}</h3>
                      <p>{row.used_for}</p>
                    </div>
                    <p className="source-provider">{row.provider}</p>
                    <p className="source-notes">{row.notes}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {showApiInfo ? (
          <section className="sources-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Reference</p>
                <h2>API</h2>
                <p className="panel-subtitle">
                  The current GeoCompare and GeoResolve web APIs are query-based and use HTTP GET.
                </p>
              </div>
            </div>
            <div className="sources-list">
              <article className="source-row">
                <div className="source-heading">
                  <h3>Versions</h3>
                  <p>GeoCompare Web v{__APP_VERSION__}</p>
                </div>
                <p className="source-provider">GeoCompare v{__GEOCOMPARE_VERSION__}</p>
                <p className="source-provider">GeoResolve v{__GEORESOLVE_VERSION__}</p>
                <p className="source-notes">
                  GeoCompare and GeoResolve are served separately behind <code>/api</code> and <code>/georesolve-api</code>.
                </p>
              </article>
              <article className="source-row">
                <div className="source-heading">
                  <h3>GeoCompare API</h3>
                  <p>Base path: <code>{config.baseUrl}</code></p>
                </div>
                <p className="source-notes">
                  GET endpoints currently include <code>/search</code>, <code>/profile</code>, <code>/map-links</code>, <code>/sources</code>, <code>/resolve</code>, <code>/nearest</code>, <code>/top</code>, <code>/bottom</code>, <code>/remoteness</code>, and <code>/local-average</code>.
                </p>
                <p className="source-link-row">
                  <span className="source-link-label">GitHub:</span>{" "}
                  <a className="text-link inline-text-link" href="https://github.com/iandorsey00/geocompare" rel="noreferrer" target="_blank">geocompare</a>
                </p>
              </article>
              <article className="source-row">
                <div className="source-heading">
                  <h3>GeoResolve API</h3>
                  <p>Base path: <code>{config.georesolveBaseUrl}</code></p>
                </div>
                <p className="source-notes">
                  GET endpoints currently include <code>/resolve?query=...</code> and <code>/resolve-current-location?latitude=...&amp;longitude=...</code>.
                </p>
                <p className="source-link-row">
                  <span className="source-link-label">GitHub:</span>{" "}
                  <a className="text-link inline-text-link" href="https://github.com/iandorsey00/georesolve" rel="noreferrer" target="_blank">georesolve</a>
                </p>
              </article>
            </div>
          </section>
        ) : null}

        <footer className="app-footer">
          <div className="footer-links">
            <button className="text-link" onClick={() => void handleToggleSources()} type="button">
              {showSources ? "Hide sources" : "Sources"}
            </button>
            <button className="text-link" onClick={handleToggleApiInfo} type="button">
              {showApiInfo ? "Hide API" : "API"}
            </button>
          </div>
          <p className="footer-copy">
            GeoCompare, GeoResolve, and GeoCompare Web &copy; {currentYear} Ian Dorsey. Open source under the MIT License.
          </p>
        </footer>
      </main>
    </div>
  );
}
