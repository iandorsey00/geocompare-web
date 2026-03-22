import { useState } from "react";
import type { ApiConfig } from "../lib/types";
import { SectionCard } from "./SectionCard";

type ApiSettingsPanelProps = {
  config: ApiConfig;
  onChange: (config: ApiConfig) => void;
  healthStatus: string;
  onCheckHealth: () => void;
  isCheckingHealth: boolean;
};

export function ApiSettingsPanel({
  config,
  onChange,
  healthStatus,
  onCheckHealth,
  isCheckingHealth,
}: ApiSettingsPanelProps) {
  const [showPassword, setShowPassword] = useState(false);

  function updateField<K extends keyof ApiConfig>(key: K, value: ApiConfig[K]) {
    onChange({
      ...config,
      [key]: value,
    });
  }

  return (
    <SectionCard
      eyebrow="Connection"
      title="API settings"
      subtitle="Point the UI at the deployed API now, then switch to same-origin later without rewriting the client."
      actions={
        <button className="secondary-button" onClick={onCheckHealth} type="button">
          {isCheckingHealth ? "Checking..." : "Check health"}
        </button>
      }
    >
      <div className="settings-grid">
        <label>
          <span>Base URL</span>
          <input
            type="url"
            placeholder="https://api.example.com"
            value={config.baseUrl}
            onChange={(event) => updateField("baseUrl", event.target.value)}
          />
        </label>
        <label>
          <span>Basic auth username</span>
          <input
            type="text"
            placeholder="Optional"
            value={config.username}
            onChange={(event) => updateField("username", event.target.value)}
          />
        </label>
        <label>
          <span>Basic auth password</span>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Optional"
            value={config.password}
            onChange={(event) => updateField("password", event.target.value)}
          />
        </label>
        <label className="inline-toggle">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
          />
          <span>Show password</span>
        </label>
      </div>
      <p className="status-line">{healthStatus}</p>
    </SectionCard>
  );
}
