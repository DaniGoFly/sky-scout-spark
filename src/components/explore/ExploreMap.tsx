/**
 * ExploreMap — Clean raw-Leaflet implementation
 * CARTO dark tiles + OSM fallback, premium price pill markers, route polyline
 * Uses raw L.map() API to avoid react-leaflet version conflicts
 */

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./explore-map.css";
import type { ExploreResult } from "@/lib/exploreApi";
import type { AirportData } from "@/lib/airports";

/* ── Types ── */
interface ExploreMapProps {
  destinations: ExploreResult[];
  originAirport: AirportData | null | undefined;
  onSelect: (dest: ExploreResult) => void;
  hoveredIata: string | null;
  onHover: (iata: string | null) => void;
  formatPrice: (price: number) => string;
}

/* ── Tile providers ── */
const TILE_CARTO =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_OSM =
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

/* ── DivIcon factories ── */
function pricePill(
  city: string,
  price: string,
  active: boolean,
  cheapest: boolean,
  dimmed: boolean,
): L.DivIcon {
  const label = city.length > 14 ? city.slice(0, 13) + "…" : city;

  if (active) {
    return L.divIcon({
      className: "explore-marker",
      html: `<div class="xpin xpin--active">
               <span class="xpin__city">${label}</span>
               <span class="xpin__price">${price}</span>
               <div class="xpin__arrow"></div>
             </div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  }

  const extra = [cheapest && "xpin--cheap", dimmed && "xpin--dim"]
    .filter(Boolean)
    .join(" ");

  return L.divIcon({
    className: "explore-marker",
    html: `<div class="xpin xpin--pill ${extra}">
             <span class="xpin__city">${label}</span>
             <span class="xpin__price">${price}</span>
           </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

const originDot = L.divIcon({
  className: "explore-marker",
  html: `<div class="xpin-origin"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

/* ── Component ── */
const ExploreMap = ({
  destinations,
  originAirport,
  onSelect,
  hoveredIata,
  onHover,
  formatPrice,
}: ExploreMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeRef = useRef<L.Polyline | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);

  const [showRetry, setShowRetry] = useState(false);
  const tileErrors = useRef(0);
  const fellBack = useRef(false);

  /* Tile error handler */
  const handleTileError = useCallback(() => {
    tileErrors.current += 1;
    if (tileErrors.current > 4 && !fellBack.current && tileRef.current) {
      fellBack.current = true;
      tileErrors.current = 0;
      tileRef.current.setUrl(TILE_OSM);
    } else if (tileErrors.current > 8) {
      setShowRetry(true);
    }
  }, []);

  const retryTiles = useCallback(() => {
    setShowRetry(false);
    tileErrors.current = 0;
    fellBack.current = false;
    tileRef.current?.setUrl(TILE_CARTO);
  }, []);

  /* ── Init map (once) ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: [50, 8],
      zoom: 5,
      minZoom: 3,
      maxZoom: 10,
      zoomControl: false,
      attributionControl: true,
    });

    const tile = L.tileLayer(TILE_CARTO, {
      attribution: TILE_ATTR,
      maxZoom: 18,
      subdomains: "abcd",
    });
    tile.on("tileerror", handleTileError);
    tile.addTo(map);
    tileRef.current = tile;

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;

    // Force recalc after mount
    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
    };
  }, [handleTileError]);

  /* Fly to origin */
  useEffect(() => {
    if (!mapRef.current || !originAirport) return;
    mapRef.current.flyTo([originAirport.lat, originAirport.lon], 5, {
      duration: 1.2,
    });
  }, [originAirport]);

  /* Resize observer */
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el) return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Derived ── */
  const cheapestIata = useMemo(() => {
    if (!destinations.length) return null;
    return destinations.reduce((a, b) => (a.price < b.price ? a : b))
      .destinationIata;
  }, [destinations]);

  const hasSelection = hoveredIata !== null;

  /* ── Route line ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (routeRef.current) {
      map.removeLayer(routeRef.current);
      routeRef.current = null;
    }
    if (!hoveredIata || !originAirport) return;
    const dest = destinations.find((d) => d.destinationIata === hoveredIata);
    if (!dest?.lat || !dest?.lon) return;
    routeRef.current = L.polyline(
      [
        [originAirport.lat, originAirport.lon],
        [dest.lat, dest.lon],
      ],
      {
        color: "rgba(139,92,246,0.55)",
        weight: 1.5,
        dashArray: "6,6",
        interactive: false,
      },
    ).addTo(map);
  }, [hoveredIata, originAirport, destinations]);

  /* ── Markers ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current.clear();

    // Origin
    if (originAirport) {
      const m = L.marker([originAirport.lat, originAirport.lon], {
        icon: originDot,
        interactive: false,
        zIndexOffset: 2000,
      }).addTo(map);
      markersRef.current.set("__origin__", m);
    }

    // Destinations
    for (const dest of destinations) {
      if (!dest.lat || !dest.lon) continue;
      const isCheap = dest.destinationIata === cheapestIata;
      const isActive = dest.destinationIata === hoveredIata;
      const dimmed = hasSelection && !isActive;
      const city = dest.destinationName || dest.destinationIata;

      const marker = L.marker([dest.lat, dest.lon], {
        icon: pricePill(
          city,
          formatPrice(dest.price),
          isActive,
          isCheap,
          dimmed,
        ),
        zIndexOffset: isActive ? 1500 : isCheap ? 1200 : 100,
      })
        .on("click", () => onSelect(dest))
        .on("mouseover", () => onHover(dest.destinationIata))
        .on("mouseout", () => onHover(null))
        .addTo(map);

      markersRef.current.set(dest.destinationIata, marker);
    }
  }, [
    destinations,
    originAirport,
    hoveredIata,
    cheapestIata,
    hasSelection,
    formatPrice,
    onSelect,
    onHover,
  ]);

  return (
    <div className="exploreMapWrap">
      <div ref={containerRef} className="explore-leaflet" />
      {showRetry && (
        <button className="explore-tile-retry" onClick={retryTiles}>
          Map unavailable — tap to retry
        </button>
      )}
    </div>
  );
};

export default ExploreMap;
