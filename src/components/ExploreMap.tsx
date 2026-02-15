/**
 * ExploreMap — Google Flights-quality map with GoFlyFinder dark glass + purple brand
 * Vertical city/price pills, pink origin dot, dashed route on hover
 * Tile fallback, fade-in loading, premium zoom controls
 */

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ExploreResult } from "@/lib/exploreApi";
import type { AirportData } from "@/lib/airports";

interface ExploreMapProps {
  destinations: ExploreResult[];
  originAirport: AirportData | null | undefined;
  onSelect: (dest: ExploreResult) => void;
  hoveredIata: string | null;
  onHover: (iata: string | null) => void;
  formatPrice: (price: number) => string;
}

/* ── Marker factories ── */

function createPriceMarker(
  cityName: string,
  price: string,
  isHovered: boolean,
  isCheapest: boolean,
  hasSelection: boolean,
): L.DivIcon {
  const displayCity = cityName.length > 14 ? cityName.slice(0, 13) + "…" : cityName;
  const dimmed = hasSelection && !isHovered;

  if (isHovered) {
    return L.divIcon({
      className: "gf-marker",
      html: `<div class="gf-pin gf-pin--active">
        <span class="gf-pin__city">${displayCity}</span>
        <span class="gf-pin__price">${price}</span>
        <div class="gf-pin__arrow"></div>
      </div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  }

  const cls = isCheapest ? "gf-pin--cheapest" : "";
  const dimCls = dimmed ? "gf-pin--dimmed" : "";

  return L.divIcon({
    className: "gf-marker",
    html: `<div class="gf-pin gf-pin--default ${cls} ${dimCls}">
      <span class="gf-pin__city">${displayCity}</span>
      <span class="gf-pin__price">${price}</span>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createOriginDot(): L.DivIcon {
  return L.divIcon({
    className: "gf-origin",
    html: `<div class="gf-origin-dot"></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

const TILE_PRIMARY = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_FALLBACK = "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

/* ── CSS ── */
const MAP_STYLES = `
.gf-marker, .gf-origin { background: none !important; border: none !important; }

.gf-origin-dot {
  width: 14px; height: 14px;
  background: #ea4335;
  border-radius: 50%;
  border: 2.5px solid #fff;
  box-shadow: 0 0 0 3px rgba(234,67,53,0.3), 0 2px 8px rgba(0,0,0,0.3);
  transform: translate(-50%,-50%);
  pointer-events: none;
}

.gf-pin {
  font-family: system-ui, -apple-system, sans-serif;
  white-space: nowrap;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
  pointer-events: auto;
  transform: translate(-50%, -100%);
  transition: transform 0.18s ease, opacity 0.18s ease, box-shadow 0.18s ease;
  will-change: transform;
}

.gf-pin--default {
  background: rgba(20, 20, 32, 0.88);
  padding: 5px 10px 4px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  border: 1px solid rgba(139, 92, 246, 0.08);
}
.gf-pin--default:hover {
  transform: translate(-50%, -100%) scale(1.06);
  box-shadow: 0 0 14px rgba(139, 92, 246, 0.35), 0 2px 10px rgba(0,0,0,0.4);
  border-color: rgba(139, 92, 246, 0.4);
}

.gf-pin--cheapest {
  background: rgba(16, 60, 48, 0.92);
  border-color: rgba(110, 231, 183, 0.2);
}
.gf-pin--cheapest:hover {
  border-color: rgba(110, 231, 183, 0.5);
  box-shadow: 0 0 14px rgba(110, 231, 183, 0.3), 0 2px 10px rgba(0,0,0,0.4);
}

.gf-pin--dimmed { opacity: 0.45; }

.gf-pin--active {
  position: relative;
  background: #fff;
  padding: 8px 14px 6px;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(139, 92, 246, 0.25), 0 4px 16px rgba(0,0,0,0.3), 0 0 0 2px rgba(139, 92, 246, 0.4);
  z-index: 100;
}

.gf-pin__city { font-size: 11px; font-weight: 500; color: #9aa0a6; }
.gf-pin--cheapest .gf-pin__city { color: #86efac; }
.gf-pin--active .gf-pin__city { font-size: 13px; font-weight: 600; color: #202124; }

.gf-pin__price { font-size: 12px; font-weight: 700; color: #e8eaed; margin-top: 1px; }
.gf-pin--cheapest .gf-pin__price { color: #6ee7b7; }
.gf-pin--active .gf-pin__price { font-size: 14px; font-weight: 700; color: #202124; }

.gf-pin__arrow {
  position: absolute; bottom: -7px; left: 50%; transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid #fff;
  filter: drop-shadow(0 2px 2px rgba(0,0,0,0.12));
}

/* Zoom controls */
.leaflet-control-zoom {
  border: none !important;
  border-radius: 10px !important;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.35) !important;
  margin-bottom: 48px !important;
  margin-right: 14px !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.leaflet-control-zoom a {
  background: rgba(20, 20, 32, 0.85) !important;
  color: rgba(255,255,255,0.85) !important;
  border: none !important;
  border-bottom: 1px solid rgba(139, 92, 246, 0.1) !important;
  width: 40px !important; height: 40px !important;
  line-height: 40px !important; font-size: 18px !important;
  transition: background 0.15s ease, color 0.15s ease !important;
}
.leaflet-control-zoom a:last-child { border-bottom: none !important; }
.leaflet-control-zoom a:hover {
  background: rgba(30, 30, 50, 0.95) !important;
  color: #c4b5fd !important;
}

/* Attribution */
.leaflet-control-attribution {
  background: rgba(15, 15, 25, 0.6) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  color: rgba(255,255,255,0.7) !important;
  font-size: 10px !important;
  border-radius: 8px !important;
  padding: 3px 8px !important;
  margin: 0 14px 14px 0 !important;
  border: 1px solid rgba(139, 92, 246, 0.1) !important;
  opacity: 0.45;
  transition: opacity 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
  max-width: none !important;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.leaflet-control-attribution:hover {
  opacity: 1;
  border-color: rgba(139, 92, 246, 0.35) !important;
  white-space: normal; overflow: visible;
}
.leaflet-control-attribution a { color: rgba(255,255,255,0.7) !important; text-decoration: none !important; }
.leaflet-control-attribution a:hover { text-decoration: underline !important; color: #c4b5fd !important; }
.leaflet-control-attribution .leaflet-attribution-flag { display: none !important; }

/* Fade-in */
.explore-map-fade { opacity: 0; transition: opacity 0.35s ease; }
.explore-map-fade--ready { opacity: 1; }

/* Tile error pill */
.gf-tile-error {
  position: absolute; bottom: 48px; left: 50%; transform: translateX(-50%);
  z-index: 1000;
  background: rgba(20, 20, 32, 0.92);
  backdrop-filter: blur(12px);
  color: rgba(255,255,255,0.85);
  font-size: 12px; font-weight: 500;
  padding: 8px 18px;
  border-radius: 20px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  cursor: pointer;
  transition: border-color 0.2s ease;
  pointer-events: auto;
}
.gf-tile-error:hover { border-color: rgba(139,92,246,0.5); }

@media (prefers-reduced-motion: reduce) {
  .gf-pin, .gf-pin--default:hover, .explore-map-fade { transition: none !important; }
}
`;

const ExploreMap = ({ destinations, originAirport, onSelect, hoveredIata, onHover, formatPrice }: ExploreMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  const tileErrorCountRef = useRef(0);
  const usedFallbackRef = useRef(false);

  // Tile error handler — switch to fallback after repeated failures
  const handleTileError = useCallback(() => {
    tileErrorCountRef.current++;
    if (tileErrorCountRef.current > 4 && !usedFallbackRef.current && mapRef.current && tileLayerRef.current) {
      usedFallbackRef.current = true;
      tileLayerRef.current.setUrl(TILE_FALLBACK);
      tileErrorCountRef.current = 0;
    } else if (tileErrorCountRef.current > 8) {
      setTileError(true);
    }
  }, []);

  const retryTiles = useCallback(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    setTileError(false);
    tileErrorCountRef.current = 0;
    usedFallbackRef.current = false;
    tileLayerRef.current.setUrl(TILE_PRIMARY);
  }, []);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [48, 10],
      zoom: 5,
      minZoom: 3,
      maxZoom: 10,
      zoomControl: false,
      attributionControl: true,
    });

    const tileLayer = L.tileLayer(TILE_PRIMARY, {
      attribution: TILE_ATTR,
      maxZoom: 18,
      subdomains: "abcd",
    });
    tileLayer.on("tileerror", handleTileError);
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;

    map.whenReady(() => {
      requestAnimationFrame(() => setReady(true));
    });

    // Force a size recalc after mount
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  }, [handleTileError]);

  // Center on origin
  useEffect(() => {
    if (!mapRef.current || !originAirport) return;
    mapRef.current.flyTo([originAirport.lat, originAirport.lon], 5, { duration: 1.2 });
  }, [originAirport]);

  // Invalidate size when container resizes
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el) return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cheapestIata = useMemo(() => {
    if (destinations.length === 0) return null;
    return destinations.reduce((a, b) => (a.price < b.price ? a : b)).destinationIata;
  }, [destinations]);

  const hasSelection = hoveredIata !== null;

  // Dashed route line on hover
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }
    if (!hoveredIata || !originAirport) return;

    const dest = destinations.find(d => d.destinationIata === hoveredIata);
    if (!dest?.lat || !dest?.lon) return;

    const line = L.polyline(
      [[originAirport.lat, originAirport.lon], [dest.lat, dest.lon]],
      { color: "rgba(139,92,246,0.5)", weight: 1.5, dashArray: "6, 6", opacity: 0.8, interactive: false }
    );
    line.addTo(map);
    routeLineRef.current = line;
  }, [hoveredIata, originAirport, destinations]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const [, marker] of markersRef.current) map.removeLayer(marker);
    markersRef.current.clear();

    if (originAirport) {
      const m = L.marker([originAirport.lat, originAirport.lon], {
        icon: createOriginDot(),
        zIndexOffset: 2000,
        interactive: false,
      });
      m.addTo(map);
      markersRef.current.set("__origin__", m);
    }

    for (const dest of destinations) {
      if (!dest.lat || !dest.lon) continue;
      const isCheapest = dest.destinationIata === cheapestIata;
      const isHovered = dest.destinationIata === hoveredIata;
      const cityName = dest.destinationName || dest.destinationIata;

      const icon = createPriceMarker(cityName, formatPrice(dest.price), isHovered, isCheapest, hasSelection);

      const marker = L.marker([dest.lat, dest.lon], {
        icon,
        zIndexOffset: isHovered ? 1500 : isCheapest ? 1200 : 100,
      });

      marker.on("click", () => onSelect(dest));
      marker.on("mouseover", () => onHover(dest.destinationIata));
      marker.on("mouseout", () => onHover(null));

      marker.addTo(map);
      markersRef.current.set(dest.destinationIata, marker);
    }
  }, [destinations, originAirport, hoveredIata, cheapestIata, hasSelection, formatPrice, onSelect, onHover]);

  return (
    <>
      <style>{MAP_STYLES}</style>
      <div className="relative w-full h-full" style={{ minHeight: 300 }}>
        <div
          ref={containerRef}
          className={`w-full h-full explore-map-fade ${ready ? "explore-map-fade--ready" : ""}`}
        />
        {tileError && (
          <button className="gf-tile-error" onClick={retryTiles}>
            Map unavailable — tap to retry
          </button>
        )}
      </div>
    </>
  );
};

export default ExploreMap;
