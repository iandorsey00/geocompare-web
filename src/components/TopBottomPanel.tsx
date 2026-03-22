import { useState } from "react";
import { SectionCard } from "./SectionCard";

type TopBottomPanelProps = {
  mode: "top" | "bottom";
  onBack: () => void;
};

export function TopBottomPanel({ mode, onBack }: TopBottomPanelProps) {
  const [metric, setMetric] = useState("median_household_income");
  const [scope, setScope] = useState("tracts+");
  const [where, setWhere] = useState("population>=4000 population_density>=2500");
  const [count, setCount] = useState(15);

  return (
    <SectionCard
      eyebrow="Ranking"
      title={mode === "top" ? "Top geographies" : "Bottom geographies"}
      subtitle="The simplified ranking flow is ready here, but the live API does not expose /top or /bottom yet."
      actions={
        <button className="secondary-button" onClick={onBack} type="button">
          Back to search
        </button>
      }
    >
      <form className="stack" onSubmit={(event) => event.preventDefault()}>
        <label>
          <span>Metric identifier</span>
          <input value={metric} onChange={(event) => setMetric(event.target.value)} />
        </label>
        <div className="field-row two-up">
          <label>
            <span>Scope</span>
            <input value={scope} onChange={(event) => setScope(event.target.value)} />
          </label>
          <label>
            <span>Result count</span>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </label>
        </div>
        <label>
          <span>Where filter</span>
          <input value={where} onChange={(event) => setWhere(event.target.value)} />
        </label>
        <div className="empty-state">
          <p>
            This view is intentionally minimal, but the backend still needs matching API endpoints before these
            controls can run.
          </p>
        </div>
      </form>
    </SectionCard>
  );
}
