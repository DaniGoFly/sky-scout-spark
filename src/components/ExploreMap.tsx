/**
 * ExploreMap — Google Flights-identical map
 * Vertical city/price pills, pink origin dot, dashed route on hover
 */

import { useEffect, useRef, useMemo, useCallback } from "react";
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

/** Google Flights style: city name on top, price below — vertical pill */
function createPriceMarker(
  cityName: string,
  price: string,
  isHovered: boolean,
  isCheapest: boolean,
): L.DivIcon {
  const displayCity = cityName.length > 14 ? cityName.slice(0, 13) + "…" : cityName;

  if (isHovered) {
    // Selected/hovered: white pill with dark text + pointer triangle
    return L.divIcon({
      className: "gf-marker",
      html: `<div style="
        position:relative;
        background:#fff;
        color:#202124;
        padding:8px 14px 6px;
        border-radius:12px;
        font-family:system-ui,-apple-system,sans-serif;
        white-space:nowrap;
        box-shadow:0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.08);
        transform:translate(-50%,-100%);
        cursor:pointer;
        display:flex;
        flex-direction:column;
        align-items:center;
        line-height:1.2;
        pointer-events:auto;
        z-index:100;
      ">
        <span style="font-size:13px;font-weight:600;color:#202124;">${displayCity}</span>
        <span style="font-size:14px;font-weight:700;color:#202124;margin-top:1px;">${price}</span>
        <div style="
          position:absolute;
          bottom:-7px;
          left:50%;
          transform:translateX(-50%);
          width:0;height:0;
          border-left:8px solid transparent;
          border-right:8px solid transparent;
          border-top:8px solid #fff;
          filter:drop-shadow(0 2px 2px rgba(0,0,0,0.15));
        "></div>
      </div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  }

  // Default: dark semi-transparent pill, no pointer
  const bg = isCheapest ? "rgba(30,90,70,0.92)" : "rgba(48,48,56,0.88)";
  const priceColor = isCheapest ? "#6ee7b7" : "#e8eaed";

  return L.divIcon({
    className: "gf-marker",
    html: `<div style="
      background:${bg};
      color:#e8eaed;
      padding:5px 10px 4px;
      border-radius:8px;
      font-family:system-ui,-apple-system,sans-serif;
      white-space:nowrap;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      transform:translate(-50%,-100%);
      cursor:pointer;
      display:flex;
      flex-direction:column;
      align-items:center;
      line-height:1.2;
      pointer-events:auto;
      transition:transform 0.15s ease;
      border:1px solid rgba(255,255,255,0.06);
    ">
      <span style="font-size:11px;font-weight:500;color:#bdc1c6;">${displayCity}</span>
      <span style="font-size:12px;font-weight:700;color:${priceColor};margin-top:1px;">${price}</span>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/** Google Flights origin: pink/magenta dot */
function createOriginDot(): L.DivIcon {
  return L.divIcon({
    className: "gf-origin",
    html: `<div style="
      width:14px;height:14px;
      background:#ea4335;
      border-radius:50%;
      border:2.5px solid #fff;
      box-shadow:0 0 0 3px rgba(234,67,53,0.3), 0 2px 8px rgba(0,0,0,0.3);
      transform:translate(-50%,-50%);
      pointer-events:none;
    "></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Google-style dark map — Stadia Alidade Smooth Dark (closest to Google Flights dark)
const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

const ExploreMap = ({ destinations, originAirport, onSelect, hoveredIata, onHover, formatPrice }: ExploreMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLineRef = useRef<L.Polyline | null>(null);

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

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom: 18,
      subdomains: "abcd",
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Center on origin
  useEffect(() => {
    if (!mapRef.current || !originAirport) return;
    mapRef.current.flyTo([originAirport.lat, originAirport.lon], 5, { duration: 1.2 });
  }, [originAirport]);

  const cheapestIata = useMemo(() => {
    if (destinations.length === 0) return null;
    return destinations.reduce((a, b) => (a.price < b.price ? a : b)).destinationIata;
  }, [destinations]);

  // Dashed route line on hover
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old line
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    if (!hoveredIata || !originAirport) return;

    const dest = destinations.find(d => d.destinationIata === hoveredIata);
    if (!dest?.lat || !dest?.lon) return;

    const line = L.polyline(
      [[originAirport.lat, originAirport.lon], [dest.lat, dest.lon]],
      {
        color: "#9aa0a6",
        weight: 1.5,
        dashArray: "6, 6",
        opacity: 0.7,
        interactive: false,
      }
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

    // Origin dot
    if (originAirport) {
      const m = L.marker([originAirport.lat, originAirport.lon], {
        icon: createOriginDot(),
        zIndexOffset: 2000,
        interactive: false,
      });
      m.addTo(map);
      markersRef.current.set("__origin__", m);
    }

    // Destination markers
    for (const dest of destinations) {
      if (!dest.lat || !dest.lon) continue;
      const isCheapest = dest.destinationIata === cheapestIata;
      const isHovered = dest.destinationIata === hoveredIata;
      const cityName = dest.destinationName || dest.destinationIata;

      const icon = createPriceMarker(cityName, formatPrice(dest.price), isHovered, isCheapest);

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
  }, [destinations, originAirport, hoveredIata, cheapestIata, formatPrice, onSelect, onHover]);

  return (
    <>
      <style>{`
        .gf-marker, .gf-origin { background: none !important; border: none !important; }
        .leaflet-control-zoom { border: none !important; border-radius: 8px !important; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important; }
        .leaflet-control-zoom a { background: rgba(48,48,56,0.92) !important; color: #e8eaed !important; border: none !important; width: 36px !important; height: 36px !important; line-height: 36px !important; font-size: 16px !important; }
        .leaflet-control-zoom a:hover { background: rgba(68,68,76,0.95) !important; }
        .leaflet-control-attribution { background: rgba(30,30,40,0.7) !important; color: #9aa0a6 !important; font-size: 10px !important; }
        .leaflet-control-attribution a { color: #9aa0a6 !important; }
      `}</style>
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: 300 }} />
    </>
  );
};

export default ExploreMap;
