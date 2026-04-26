import { type FormEvent, useState } from "react";
import type { GeographySummary } from "../lib/types";
import { CircleXIcon } from "./CircleXIcon";
import { SectionCard } from "./SectionCard";

type SearchPanelProps = {
  onSearch: (params: { q: string; n: number; includeTracts: boolean }) => Promise<void>;
  isLoading: boolean;
  compact?: boolean;
  query: string;
  suggestions: GeographySummary[];
  onQueryChange: (value: string) => void;
};

export function SearchPanel({
  onSearch,
  isLoading,
  compact = false,
  query,
  suggestions,
  onQueryChange,
}: SearchPanelProps) {
  const [count, setCount] = useState(10);
  const [includeTracts, setIncludeTracts] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSearch({ q: query, n: count, includeTracts });
    setShowSuggestions(false);
  }

  const formClassName = compact
    ? showAdvanced
      ? "search-inline-expanded"
      : "search-inline-compact"
    : "stack";
  const visibleSuggestions = showSuggestions && query.trim() ? suggestions : [];

  return (
    <SectionCard
      eyebrow=""
      title=""
      subtitle=""
    >
      <form className={formClassName} onSubmit={handleSubmit}>
        <label>
          <span>Search term</span>
          <div className="input-with-clear">
            <input
              autoFocus
              className={query ? "has-clear" : ""}
              type="text"
              value={query}
              onBlur={() => {
                window.setTimeout(() => setShowSuggestions(false), 120);
              }}
              onChange={(event) => {
                onQueryChange(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="San Francisco, Queens County, Bethesda, tract..."
            />
            {query ? (
              <button
                aria-label="Clear search term"
                className="clear-field"
                onClick={() => {
                  onQueryChange("");
                  setShowSuggestions(false);
                }}
                type="button"
              >
                <CircleXIcon />
              </button>
            ) : null}
            {visibleSuggestions.length > 0 ? (
              <div
                className="search-suggestions"
                role="listbox"
                aria-label="Search suggestions"
              >
                {visibleSuggestions.map((suggestion) => (
                  <button
                    className="search-suggestion"
                    key={suggestion.geoid ?? suggestion.name}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={async () => {
                      const nextQuery = suggestion.display_name || suggestion.name;
                      onQueryChange(nextQuery);
                      setShowSuggestions(false);
                      await onSearch({ q: nextQuery, n: count, includeTracts });
                    }}
                    type="button"
                  >
                    <strong>{suggestion.name}</strong>
                    <span>{suggestion.canonical_name !== suggestion.name ? suggestion.canonical_name : suggestion.display_name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </label>
        {showAdvanced ? (
          <label>
            <span>Max results</span>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </label>
        ) : null}
        {showAdvanced ? (
          <label className="inline-toggle search-inline-toggle">
            <input
              type="checkbox"
              checked={includeTracts}
              onChange={(event) => setIncludeTracts(event.target.checked)}
            />
            <span>Include census tracts</span>
          </label>
        ) : null}
        <button
          className="text-link search-advanced-toggle"
          onClick={() => setShowAdvanced((current) => !current)}
          type="button"
        >
          {showAdvanced ? "Hide" : "Advanced"}
        </button>
        <button className="primary-button search-submit search-submit-inline" disabled={isLoading || !query.trim()} type="submit">
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>
    </SectionCard>
  );
}
