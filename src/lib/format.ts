export function formatNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
    }).format(value);
  }

  return value;
}

export function formatMetricValue(key: string, value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "number") {
    if (
      key.includes("income") ||
      key === "median_rent" ||
      key === "median_value"
    ) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
    }

    if (key.endsWith("_pct")) {
      const pctValue = value <= 1 ? value * 100 : value;
      return `${new Intl.NumberFormat("en-US", {
        maximumFractionDigits: pctValue >= 10 ? 1 : 2,
      }).format(pctValue)}%`;
    }

    if (key === "population_density") {
      return `${new Intl.NumberFormat("en-US", {
        maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 1,
      }).format(value)}/sqmi`;
    }

    return formatNumber(value);
  }

  if (typeof value === "string" && key.endsWith("_pct")) {
    const trimmed = value.trim();
    if (trimmed.endsWith("%")) {
      return trimmed;
    }

    const parsed = Number(trimmed.replace(/,/g, ""));
    if (Number.isFinite(parsed)) {
      const pctValue = parsed <= 1 ? parsed * 100 : parsed;
      return `${new Intl.NumberFormat("en-US", {
        maximumFractionDigits: pctValue >= 10 ? 1 : 2,
      }).format(pctValue)}%`;
    }
  }

  return value;
}

export function formatMetricKey(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function friendlySumlevel(sumlevel: string | null) {
  if (!sumlevel) {
    return "Unknown geography";
  }

  const labels: Record<string, string> = {
    "040": "State",
    "050": "County",
    "140": "Census tract",
    "160": "Place",
    "310": "CBSA",
    "860": "ZCTA",
  };

  return labels[sumlevel] ?? `Summary level ${sumlevel}`;
}
