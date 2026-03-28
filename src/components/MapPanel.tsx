import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { fetchBoundary, googleMapsUrl, randomStreetViewUrl } from "../lib/boundaries";
import type { GeographyProfile } from "../lib/types";
import { SectionCard } from "./SectionCard";

type MapPanelProps = {
  profile: GeographyProfile;
};

function getTileLayerConfig(_isDarkMode: boolean) {
  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  };
}

export function MapPanel({ profile }: MapPanelProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState("Loading boundary...");
  const [boundary, setBoundary] = useState<GeoJSON.FeatureCollection<GeoJSON.Geometry> | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const googleHref = useMemo(() => googleMapsUrl(profile), [profile]);
  const streetViewHref = useMemo(() => randomStreetViewUrl(profile, boundary), [boundary, profile]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setIsDarkMode(event.matches);

    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBoundary(null);
    setStatus("Loading boundary...");

    void (async () => {
      const nextBoundary = await fetchBoundary(profile);
      if (cancelled) {
        return;
      }
      setBoundary(nextBoundary);
      setStatus(nextBoundary ? "" : "Boundary unavailable for this geography.");
    })();

    return () => {
      cancelled = true;
    };
  }, [profile]);

  useEffect(() => {
    if (!mapRef.current || !boundary) {
      return;
    }

    const tileLayerConfig = getTileLayerConfig(isDarkMode);

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(tileLayerConfig.url, {
      attribution: tileLayerConfig.attribution,
    }).addTo(map);

    const layer = L.geoJSON(boundary, {
      style: {
        color: "#1f5fbf",
        weight: 2,
        fillColor: "#1f5fbf",
        fillOpacity: 0.12,
      },
    }).addTo(map);

    map.fitBounds(layer.getBounds(), { padding: [20, 20] });

    return () => {
      map.remove();
    };
  }, [boundary, isDarkMode]);

  return (
    <SectionCard
      eyebrow="Map"
      title="Boundary"
      subtitle=""
      actions={
        <div className="panel-action-links">
          <a className="text-link" href={googleHref} rel="noreferrer" target="_blank">
            Open in Google Maps
          </a>
          <a className="text-link" href={streetViewHref} rel="noreferrer" target="_blank">
            Random Google Street View
          </a>
        </div>
      }
    >
      {boundary ? <div className={`map-canvas${isDarkMode ? " is-dark" : ""}`} ref={mapRef} /> : null}
      {status ? (
        <div className="plain-state">
          <p>{status}</p>
        </div>
      ) : null}
    </SectionCard>
  );
}
