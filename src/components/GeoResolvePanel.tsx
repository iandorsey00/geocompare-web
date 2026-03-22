import { type FormEvent, useMemo, useState } from "react";
import { GeoCompareApi } from "../lib/api";
import type { ApiConfig, GeoResolveResult, GeographyProfile, SelectedRow } from "../lib/types";
import { DetailPanel } from "./DetailPanel";
import { SectionCard } from "./SectionCard";

type GeoResolvePanelProps = {
  config: ApiConfig;
  comparedGeoids: Set<string>;
  onAddCompareProfile: (profile: GeographyProfile) => void;
  onBack: () => void;
  onFeedback: (message: string) => void;
};

type ResolvedItem = {
  key: string;
  label: string;
  geoid: string | null;
  summaryLevel: string;
  sourceLayer: string;
};

function toSelection(profile: GeographyProfile): SelectedRow {
  return {
    kind: "search",
    item: {
      name: profile.name,
      display_name: profile.display_name,
      canonical_name: profile.canonical_name,
      sumlevel: profile.sumlevel,
      state: profile.state,
      geoid: profile.geoid,
      counties: profile.counties,
      counties_display: profile.counties_display,
    },
  };
}

function buildResolvedItems(result: GeoResolveResult | null) {
  if (!result) {
    return [];
  }

  const preferredOrder = ["tract", "place", "county", "state", "zcta"];

  return preferredOrder
    .map((kind) => {
      const geography = result.geographies[kind];
      if (!geography) {
        return null;
      }

      const geoid = geography.geoid ?? null;
      if (!geography.name && !geoid) {
        return null;
      }

      return {
        key: kind,
        label: geography.name || geoid || kind,
        geoid,
        summaryLevel: geography.summary_level,
        sourceLayer: geography.source_layer,
      } satisfies ResolvedItem;
    })
    .filter((item): item is ResolvedItem => Boolean(item));
}

function humanizeKind(kind: string) {
  switch (kind) {
    case "tract":
      return "Tract";
    case "place":
      return "Place";
    case "county":
      return "County";
    case "state":
      return "State";
    case "zcta":
      return "ZCTA";
    default:
      return kind;
  }
}

function describeGeoResolveError(error: unknown) {
  const fallback = "GeoResolve is unavailable right now.";
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error.message === "Request failed with status 502") {
    return "GeoResolve is unavailable right now. The georesolve API may not be deployed yet.";
  }

  return error.message || fallback;
}

function candidateProfileNames(item: ResolvedItem, resolved: GeoResolveResult | null) {
  const stateName = resolved?.geographies.state?.name ?? "";
  const countyName = resolved?.geographies.county?.name ?? "";
  const names = [item.label];

  if (item.key === "tract") {
    names.unshift(
      [item.label, countyName, stateName].filter(Boolean).join(", "),
      [item.label, stateName].filter(Boolean).join(", "),
    );
  } else if (item.key === "place") {
    names.unshift(
      [item.label, stateName].filter(Boolean).join(", "),
      [`${item.label} city`, stateName].filter(Boolean).join(", "),
    );
  } else if (item.key === "county") {
    names.unshift([`${item.label} County`, stateName].filter(Boolean).join(", "));
  } else if (item.key === "state") {
    names.unshift(stateName || item.label);
  } else if (item.key === "zcta") {
    names.unshift(`ZCTA5 ${item.label}`);
  }

  return names.filter((value, index, items) => Boolean(value) && items.indexOf(value) === index);
}

export function GeoResolvePanel({
  config,
  comparedGeoids,
  onAddCompareProfile,
  onBack,
  onFeedback,
}: GeoResolvePanelProps) {
  const api = useMemo(() => new GeoCompareApi(config), [config]);
  const [query, setQuery] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [resolved, setResolved] = useState<GeoResolveResult | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedRow | null>(null);
  const [profile, setProfile] = useState<GeographyProfile | null>(null);
  const [statusText, setStatusText] = useState("Resolve an address into profile-ready geographies.");

  const items = buildResolvedItems(resolved);

  async function loadResolvedProfile(item: ResolvedItem) {
    setSelectedKey(item.key);
    setSelected(null);
    setProfile(null);
    setIsLoadingProfile(true);

    try {
      if (item.geoid) {
        try {
          const nextProfile = await api.profileByGeoid(item.geoid, true);
          setProfile(nextProfile);
          setSelected(toSelection(nextProfile));
          const message = `Opened ${nextProfile.name}.`;
          setStatusText(message);
          onFeedback(message);
          return nextProfile;
        } catch (error) {
          if (item.key === "tract" || item.key === "county" || item.key === "state") {
            throw error;
          }
          // Fall back to name-based lookups for rows where GeoCompare may still
          // prefer a human label over the bare GeoResolve geography name.
        }
      }

      for (const name of candidateProfileNames(item, resolved)) {
        try {
          const nextProfile = await api.profile(name, true);
          setProfile(nextProfile);
          setSelected(toSelection(nextProfile));
          const message = `Opened ${nextProfile.name}.`;
          setStatusText(message);
          onFeedback(message);
          return nextProfile;
        } catch {
          continue;
        }
      }

      throw new Error(`GeoCompare could not find a profile-ready match for ${item.label}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Profile unavailable.";
      setStatusText(message);
      onFeedback(message);
      return null;
    } finally {
      setIsLoadingProfile(false);
    }
  }

  async function handleResolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsResolving(true);
    setResolved(null);
    setProfile(null);
    setSelected(null);
    setSelectedKey(null);
    setStatusText("Resolving address...");
    onFeedback("Resolving address...");

    try {
      const response = await api.georesolve(query);
      setResolved(response);
      const resolvedItems = buildResolvedItems(response);
      const message =
        resolvedItems.length > 0
          ? `Resolved ${resolvedItems.length} geograph${resolvedItems.length === 1 ? "y" : "ies"} from that address.`
          : "GeoResolve returned coordinates, but no profile-ready geographies.";
      setStatusText(message);
      onFeedback(message);
    } catch (error) {
      const message = describeGeoResolveError(error);
      setStatusText(message);
      onFeedback(message);
    } finally {
      setIsResolving(false);
    }
  }

  return (
    <div className="top-bottom-shell">
      <SectionCard
        eyebrow="GeoResolve"
        title="Resolve an address"
        subtitle="Turn an address into Census geographies you can open or compare."
        actions={
          <button className="text-link" onClick={onBack} type="button">
            Back to search
          </button>
        }
      >
        <form className="search-inline" onSubmit={handleResolve}>
          <label>
            <span>Address</span>
            <div className="input-with-clear">
              <input
                autoFocus
                className={query ? "has-clear" : ""}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="1600 Pennsylvania Ave NW, Washington, DC 20500"
              />
              {query ? (
                <button
                  aria-label="Clear address"
                  className="clear-field"
                  onClick={() => setQuery("")}
                  type="button"
                >
                  X
                </button>
              ) : null}
            </div>
          </label>
          <div className="resolve-meta-block">
            <span className="eyebrow">Service</span>
            <p>{config.georesolveBaseUrl}</p>
          </div>
          <button className="primary-button search-submit search-submit-inline" disabled={isResolving || !query.trim()} type="submit">
            {isResolving ? "Resolving..." : "Resolve"}
          </button>
        </form>
      </SectionCard>

      {resolved ? (
        <SectionCard
          eyebrow=""
          title="Resolved geographies"
          subtitle={resolved.matched_address}
        >
          <div className="resolve-summary">
            <p>
              <strong>Coordinates</strong> {resolved.coordinates.latitude.toFixed(6)},{" "}
              {resolved.coordinates.longitude.toFixed(6)}
            </p>
            <p>
              <strong>Provider</strong> {resolved.metadata.geocoder}
            </p>
          </div>
          <div className="resolve-results">
            {items.map((item) => (
              <div className="resolve-row" key={item.key}>
                <button
                  className={`resolve-open ${selectedKey === item.key ? "active" : ""}`.trim()}
                  onClick={() => {
                    void loadResolvedProfile(item);
                  }}
                  type="button"
                >
                  <span className="resolve-main">{item.label}</span>
                  <span className="resolve-meta">
                    {humanizeKind(item.key)} · {item.sourceLayer}
                  </span>
                </button>
                <button
                  className="text-link"
                  onClick={() => {
                    void (async () => {
                      const nextProfile = await loadResolvedProfile(item);
                      if (nextProfile) {
                        onAddCompareProfile(nextProfile);
                      }
                    })();
                  }}
                  type="button"
                >
                  {profile?.geoid && selectedKey === item.key && comparedGeoids.has(profile.geoid)
                    ? "Added to compare"
                    : "Add to compare"}
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : (
        <SectionCard eyebrow="" title="" subtitle="">
          <div className="plain-state">
            <p>{statusText}</p>
          </div>
        </SectionCard>
      )}

      {selectedKey ? (
        <div className="profile-view">
          <button
            className="text-link back-link"
            onClick={() => {
              setSelectedKey(null);
              setSelected(null);
              setProfile(null);
              if (resolved) {
                const resolvedItems = buildResolvedItems(resolved);
                setStatusText(
                  `Resolved ${resolvedItems.length} geograph${resolvedItems.length === 1 ? "y" : "ies"} from that address.`,
                );
              }
            }}
            type="button"
          >
            Back to resolved geographies
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
        </div>
      ) : null}
    </div>
  );
}
