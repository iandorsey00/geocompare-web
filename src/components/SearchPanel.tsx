import { type FormEvent, useState } from "react";
import { SectionCard } from "./SectionCard";

type SearchPanelProps = {
  onSearch: (params: { q: string; n: number; includeTracts: boolean }) => Promise<void>;
  isLoading: boolean;
  compact?: boolean;
};

export function SearchPanel({ onSearch, isLoading, compact = false }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(10);
  const [includeTracts, setIncludeTracts] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSearch({ q: query, n: count, includeTracts });
  }

  const formClassName = compact
    ? showAdvanced
      ? "search-inline-expanded"
      : "search-inline-compact"
    : "stack";

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
              onChange={(event) => setQuery(event.target.value)}
              placeholder="San Francisco, Queens County, Bethesda, tract..."
            />
            {query ? (
              <button
                aria-label="Clear search term"
                className="clear-field"
                onClick={() => setQuery("")}
                type="button"
              >
                X
              </button>
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
