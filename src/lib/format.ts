export function formatNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
      maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
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
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(pctValue)}%`;
    }

    if (
      key === "violent_crime_rate" ||
      key === "property_crime_rate" ||
      key === "total_crime_rate"
    ) {
      return `${new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value)}/100k`;
    }

    if (key === "population_density") {
      return `${new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
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
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(pctValue)}%`;
    }
  }

  if (
    typeof value === "string" &&
    (key === "violent_crime_rate" || key === "property_crime_rate" || key === "total_crime_rate")
  ) {
    const trimmed = value.trim();
    if (trimmed.endsWith("/100k")) {
      return trimmed;
    }

    const parsed = Number(trimmed.replace(/,/g, ""));
    if (Number.isFinite(parsed)) {
      return `${new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(parsed)}/100k`;
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
    "400": "Urban area",
    "860": "ZCTA",
  };

  return labels[sumlevel] ?? `Summary level ${sumlevel}`;
}
