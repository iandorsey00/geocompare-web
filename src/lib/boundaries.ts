import type { GeographyProfile } from "./types";

type GeometryFeature = GeoJSON.Feature<GeoJSON.Geometry>;
type FeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry>;

type BoundarySource = {
  layerIds: number[];
  serviceUrl: string;
  queryField?: string;
};

const BOUNDARY_SOURCES: Record<string, BoundarySource> = {
  "040": {
    serviceUrl: "https://tigerweb.geo.census.gov/arcgis/rest/services/Generalized_ACS2022/State_County/MapServer",
    layerIds: [6, 7, 8, 9],
  },
  "050": {
    serviceUrl: "https://tigerweb.geo.census.gov/arcgis/rest/services/Generalized_ACS2022/State_County/MapServer",
    layerIds: [10, 11, 12, 13],
  },
  "140": {
    serviceUrl: "https://tigerweb.geo.census.gov/arcgis/rest/services/Generalized_ACS2022/Tracts_Blocks/MapServer",
    layerIds: [4, 5],
  },
  "160": {
    serviceUrl: "https://tigerweb.geo.census.gov/arcgis/rest/services/Generalized_ACS2022/Places_CouSub_ConCity_SubMCD/MapServer",
    layerIds: [10, 11, 9],
  },
  "310": {
    serviceUrl: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/CBSA/MapServer",
    layerIds: [15, 16],
    queryField: "CBSA",
  },
  "400": {
    serviceUrl: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Urban/MapServer",
    layerIds: [8],
  },
  "860": {
    serviceUrl: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer",
    layerIds: [0],
  },
};

const NATIONAL_BOUNDARY_SOURCE: BoundarySource = {
  serviceUrl: "https://tigerweb.geo.census.gov/arcgis/rest/services/Generalized_ACS2022/State_County/MapServer",
  layerIds: [6, 7, 8, 9],
};

function normalizedGeoid(geoid: string | null) {
  if (!geoid) {
    return "";
  }
  const usIndex = geoid.indexOf("US");
  return usIndex >= 0 ? geoid.slice(usIndex + 2) : geoid;
}

async function queryLayer(serviceUrl: string, layerId: number, geoid: string, queryField = "GEOID") {
  const params = new URLSearchParams({
    where: `${queryField}='${geoid}'`,
    outFields: `${queryField},NAME`,
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
  });
  const response = await fetch(`${serviceUrl}/${layerId}/query?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Boundary request failed with status ${response.status}`);
  }
  const json = (await response.json()) as FeatureCollection;
  return json.features ?? [];
}

async function queryNationalBoundary(serviceUrl: string, layerId: number) {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "GEOID,NAME",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
  });
  const response = await fetch(`${serviceUrl}/${layerId}/query?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Boundary request failed with status ${response.status}`);
  }
  const json = (await response.json()) as FeatureCollection;
  return json.features ?? [];
}

export async function fetchBoundary(profile: GeographyProfile) {
  const source = profile.sumlevel ? BOUNDARY_SOURCES[profile.sumlevel] : undefined;
  const geoid = normalizedGeoid(profile.geoid);

  if (profile.sumlevel === "010") {
    for (const layerId of NATIONAL_BOUNDARY_SOURCE.layerIds) {
      try {
        const features = await queryNationalBoundary(NATIONAL_BOUNDARY_SOURCE.serviceUrl, layerId);
        if (features.length > 0) {
          return {
            type: "FeatureCollection",
            features: features as GeometryFeature[],
          } satisfies FeatureCollection;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  if (!source || !geoid) {
    return null;
  }

  for (const layerId of source.layerIds) {
    try {
      const features = await queryLayer(source.serviceUrl, layerId, geoid, source.queryField);
      if (features.length > 0) {
        return {
          type: "FeatureCollection",
          features: features as GeometryFeature[],
        } satisfies FeatureCollection;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export function googleMapsUrl(profile: GeographyProfile) {
  const stateLabel = profile.state ? `, ${profile.state.toUpperCase()}` : "";
  const lat = profile.metrics.latitude;
  const lon = profile.metrics.longitude;
  const hasCoords = (typeof lat === "number" || typeof lat === "string") && (typeof lon === "number" || typeof lon === "string");

  if (profile.sumlevel === "140" && hasCoords) {
    const query = encodeURIComponent(`${lat},${lon}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  let queryText = profile.display_name || profile.name || profile.canonical_name;

  if (profile.sumlevel === "040") {
    queryText = profile.name || profile.display_name || profile.canonical_name;
  } else if (profile.sumlevel === "050") {
    queryText = profile.counties_display[0] || profile.display_name || profile.name || profile.canonical_name;
  } else if (profile.sumlevel === "160") {
    queryText = `${(profile.display_name || profile.name || "").replace(/\s+(city|town|village|borough|CDP),/i, ",")}`;
  } else if (profile.sumlevel === "860") {
    const zcta = profile.geoid?.replace(/^.*US/, "") || profile.name.replace(/\D/g, "");
    queryText = zcta ? `${zcta}${stateLabel}` : profile.display_name || profile.name || profile.canonical_name;
  } else if (profile.sumlevel === "140") {
    queryText = `${profile.counties_display[0] || ""}${stateLabel}`.replace(/^,\s*/, "") || profile.display_name || profile.name;
  }

  const query = encodeURIComponent(queryText);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
