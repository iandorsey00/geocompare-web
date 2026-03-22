import { type FormEvent, useState } from "react";
import { SectionCard } from "./SectionCard";

type SearchPanelProps = {
  onSearch: (params: { q: string; n: number }) => Promise<void>;
  isLoading: boolean;
  compact?: boolean;
};

export function SearchPanel({ onSearch, isLoading, compact = false }: SearchPanelProps) {
  const [query, setQuery] = useState("San Francisco");
  const [count, setCount] = useState(10);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSearch({ q: query, n: count });
  }

  return (
    <SectionCard
      eyebrow=""
      title=""
      subtitle=""
    >
      <form className={compact ? "search-inline" : "stack"} onSubmit={handleSubmit}>
        <label>
          <span>Search term</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="San Francisco, Queens County, Bethesda, tract..."
          />
        </label>
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
        <button className="primary-button search-submit" disabled={isLoading || !query.trim()} type="submit">
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>
    </SectionCard>
  );
}
