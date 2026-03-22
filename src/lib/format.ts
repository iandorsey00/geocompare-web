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
