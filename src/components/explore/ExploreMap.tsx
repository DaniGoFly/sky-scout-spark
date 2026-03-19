/**
 * ExploreMap — MapLibre GL implementation (no API key required)
 * Dark basemap via CARTO + premium price pill markers + route lines
 */

import { useEffect, useRef, useMemo, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./explore-map.css";
import type { ExploreResult } from "@/lib/exploreApi";
import type { AirportData } from "@/lib/airports";

/* ── Types ── */
interface ExploreMapProps {
  destinations: ExploreResult[];
  originAirport: AirportData | null | undefined;
  userPosition: { lat: number; lon: number } | null;
  locationConfidence?: "gps" | "network" | null;
  onSelect: (dest: ExploreResult) => void;
  hoveredIata: string | null;
  onHover: (iata: string | null) => void;
  formatPrice: (price: number) => string;
}

/* ── Tile style (CARTO dark — no key) ── */
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: "carto-dark",
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxzoom: 18,
    },
  },
  layers: [
    {
      id: "carto-tiles",
      type: "raster",
      source: "carto",
      minzoom: 0,
      maxzoom: 18,
    },
  ],
};

/* ── Component ── */
const ExploreMap = ({
  destinations,
  originAirport,
  userPosition,
  locationConfidence,
  onSelect,
  hoveredIata,
  onHover,
  formatPrice,
}: ExploreMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const originMarkerRef = useRef<maplibregl.Marker | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  /* Cheapest IATA */
  const cheapestIata = useMemo(() => {
    if (!destinations.length) return null;
    return destinations.reduce((a, b) => (a.price < b.price ? a : b)).destinationIata;
  }, [destinations]);

  const hasSelection = hoveredIata !== null;

  /* ── Init map (once) ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = new maplibregl.Map({
      container: el,
      style: DARK_STYLE,
      center: [8, 50],
      zoom: 4,
      minZoom: 2,
      maxZoom: 12,
      attributionControl: {},
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => setMapReady(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      originMarkerRef.current = null;
      userMarkerRef.current = null;
      setMapReady(false);
    };
  }, []);

  /* ── Fly to user position first, otherwise selected departure airport ── */
  useEffect(() => {
    if (!mapRef.current) return;

    if (userPosition) {
      mapRef.current.flyTo({
        center: [userPosition.lon, userPosition.lat],
        zoom: 7,
        duration: 1200,
      });
      return;
    }

    if (!originAirport) return;

    mapRef.current.flyTo({
      center: [originAirport.lon, originAirport.lat],
      zoom: 5,
      duration: 1200,
    });
  }, [userPosition, originAirport]);

  /* ── Route line ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const sourceId = "route-line";
    const layerId = "route-line-layer";

    // Remove old
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    if (!hoveredIata || !originAirport) return;
    const dest = destinations.find((d) => d.destinationIata === hoveredIata);
    if (!dest?.lat || !dest?.lon) return;

    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [originAirport.lon, originAirport.lat],
            [dest.lon, dest.lat],
          ],
        },
      },
    });

    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#8b5cf6",
        "line-width": 2,
        "line-opacity": 0.6,
        "line-dasharray": [4, 6],
      },
    });
  }, [hoveredIata, originAirport, destinations, mapReady]);

  /* ── Selected departure airport marker ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }

    if (!originAirport) return;

    const el = document.createElement("div");
    el.className = userPosition ? "xpin-origin-airport" : "xpin-origin";

    originMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([originAirport.lon, originAirport.lat])
      .addTo(map);
  }, [originAirport, userPosition]);

  /* ── User location marker (blue dot = raw user position) ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (!userPosition) return;

    const el = document.createElement("div");
    el.className = "xpin-origin";

    userMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([userPosition.lon, userPosition.lat])
      .addTo(map);

    console.log(
      `[GoFlyFinder][ExploreMap] Final blue-dot coordinates: lat=${userPosition.lat} lon=${userPosition.lon}`,
    );
  }, [userPosition]);

  /* ── Destination markers ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    for (const dest of destinations) {
      if (!dest.lat || !dest.lon) continue;

      const isCheap = dest.destinationIata === cheapestIata;
      const isActive = dest.destinationIata === hoveredIata;
      const dimmed = hasSelection && !isActive;

      const el = document.createElement("div");
      el.className = "explore-marker";

      const classes = ["xpin", "xpin--pill"];
      if (isActive) classes.push("xpin--active");
      if (isCheap && !isActive) classes.push("xpin--cheap");
      if (dimmed) classes.push("xpin--dim");

      el.innerHTML = `<div class="${classes.join(" ")}"><span class="xpin__price">${formatPrice(dest.price)}</span></div>`;

      el.addEventListener("click", () => onSelect(dest));
      el.addEventListener("mouseenter", () => onHover(dest.destinationIata));
      el.addEventListener("mouseleave", () => onHover(null));

      const marker = new maplibregl.Marker({
        element: el,
        anchor: "bottom",
      })
        .setLngLat([dest.lon, dest.lat])
        .addTo(map);

      markersRef.current.set(dest.destinationIata, marker);
    }
  }, [destinations, hoveredIata, cheapestIata, hasSelection, formatPrice, onSelect, onHover]);

  /* ── Resize observer ── */
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el) return;
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="exploreMapWrap">
      <div ref={containerRef} className="explore-map-container" />
    </div>
  );
};

export default ExploreMap;
