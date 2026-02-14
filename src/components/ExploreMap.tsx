/**
 * ExploreMap — Dark-themed Leaflet map with Google Flights-style city+price pill markers
 */

import { useEffect, useRef, useMemo } from "react";
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

/** Google Flights-style dark pill: "City\nPrice" */
function createCityPriceIcon(
  cityName: string,
  price: string,
  isHovered: boolean,
  isCheapest: boolean,
): L.DivIcon {
  const bgColor = isHovered
    ? "rgba(139,92,246,0.95)"    // primary purple on hover
    : isCheapest
    ? "rgba(16,185,129,0.92)"    // emerald for cheapest
    : "rgba(30,32,44,0.92)";     // dark pill default

  const textColor = "#fff";
  const scale = isHovered ? "scale(1.12)" : "scale(1)";
  const shadow = isHovered
    ? "0 4px 20px rgba(139,92,246,0.4)"
    : "0 2px 8px rgba(0,0,0,0.5)";

  // Truncate long city names
  const displayCity = cityName.length > 14 ? cityName.slice(0, 12) + "…" : cityName;

  return L.divIcon({
    className: "explore-city-pin",
    html: `<div style="
      background:${bgColor};
      color:${textColor};
      padding:4px 10px;
      border-radius:16px;
      font-family:'Plus Jakarta Sans',system-ui,sans-serif;
      white-space:nowrap;
      box-shadow:${shadow};
      transform:translate(-50%,-100%) ${scale};
      cursor:pointer;
      transition:transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
      display:flex;
      flex-direction:column;
      align-items:center;
      line-height:1.2;
      pointer-events:auto;
      border:1px solid rgba(255,255,255,0.08);
    ">
      <span style="font-size:11px;font-weight:700;letter-spacing:0.01em;">${displayCity}</span>
      <span style="font-size:11px;font-weight:600;opacity:0.85;">${price}</span>
    </div>
    <div style="
      width:0;height:0;
      border-left:5px solid transparent;
      border-right:5px solid transparent;
      border-top:5px solid ${bgColor};
      margin:0 auto;
      transform:translateX(-50%);
      position:absolute;
      bottom:-5px;
      left:50%;
    "></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createOriginIcon(code: string): L.DivIcon {
  return L.divIcon({
    className: "explore-origin-pin",
    html: `<div style="
      background:rgba(139,92,246,1);
      color:#fff;
      width:32px;height:32px;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-family:'Plus Jakarta Sans',system-ui,sans-serif;
      font-size:10px;font-weight:800;
      letter-spacing:0.02em;
      box-shadow:0 0 0 3px rgba(139,92,246,0.3), 0 2px 12px rgba(0,0,0,0.4);
      border:2px solid rgba(255,255,255,0.6);
      transform:translate(-50%,-50%);
    ">${code}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Dark map tiles
const DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const DARK_TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

const ExploreMap = ({ destinations, originAirport, onSelect, hoveredIata, onHover, formatPrice }: ExploreMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [45, 10],
      zoom: 4,
      minZoom: 2,
      maxZoom: 10,
      zoomControl: false,
      attributionControl: true,
    });

    // Dark tiles
    L.tileLayer(DARK_TILE_URL, {
      attribution: DARK_TILE_ATTR,
      maxZoom: 18,
      subdomains: "abcd",
    }).addTo(map);

    // Zoom control top-right
    L.control.zoom({ position: "topright" }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
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

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old
    for (const [, marker] of markersRef.current) {
      map.removeLayer(marker);
    }
    markersRef.current.clear();

    // Origin
    if (originAirport) {
      const m = L.marker([originAirport.lat, originAirport.lon], {
        icon: createOriginIcon(originAirport.code),
        zIndexOffset: 2000,
        interactive: false,
      });
      m.addTo(map);
      markersRef.current.set("__origin__", m);
    }

    // Destinations
    for (const dest of destinations) {
      if (!dest.lat || !dest.lon) continue;
      const isCheapest = dest.destinationIata === cheapestIata;
      const isHovered = dest.destinationIata === hoveredIata;
      const cityName = dest.destinationName || dest.destinationIata;

      const icon = createCityPriceIcon(cityName, formatPrice(dest.price), isHovered, isCheapest);

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
    <div ref={containerRef} className="w-full h-full" style={{ minHeight: 300 }} />
  );
};

export default ExploreMap;
