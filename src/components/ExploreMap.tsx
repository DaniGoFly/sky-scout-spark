/**
 * ExploreMap — Google Flights-inspired map with GoFlyFinder dark+purple style
 * Rounded pill markers showing "City · Price" like Google Flights
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

/** Google Flights-style rounded pill: "City · €Price" */
function createCityPriceIcon(
  cityName: string,
  price: string,
  isHovered: boolean,
  isCheapest: boolean,
): L.DivIcon {
  const isHighlighted = isHovered || isCheapest;

  // Google Flights uses white pill with dark text for selected, dark pill with white text for default
  const bgColor = isHovered
    ? "#ffffff"
    : isCheapest
    ? "#34d399"
    : "rgba(30,30,40,0.92)";

  const textColor = isHovered ? "#1a1a2e" : isCheapest ? "#064e3b" : "#e2e8f0";
  const scale = isHovered ? "scale(1.08)" : "scale(1)";
  const shadow = isHovered
    ? "0 4px 16px rgba(0,0,0,0.35), 0 0 0 2px rgba(139,92,246,0.5)"
    : isCheapest
    ? "0 2px 10px rgba(52,211,153,0.35)"
    : "0 2px 8px rgba(0,0,0,0.45)";

  const displayCity = cityName.length > 12 ? cityName.slice(0, 11) + "…" : cityName;
  const fontSize = isHighlighted ? "12px" : "11px";
  const fontWeight = isHighlighted ? "800" : "700";
  const borderColor = isHovered ? "rgba(139,92,246,0.6)" : isCheapest ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.08)";

  return L.divIcon({
    className: "explore-city-pin",
    html: `<div style="
      background:${bgColor};
      color:${textColor};
      padding:6px 12px;
      border-radius:20px;
      font-family:'Plus Jakarta Sans',system-ui,sans-serif;
      white-space:nowrap;
      box-shadow:${shadow};
      transform:translate(-50%,-100%) ${scale};
      cursor:pointer;
      transition:all 0.18s ease;
      display:flex;
      align-items:center;
      gap:4px;
      line-height:1;
      pointer-events:auto;
      border:1.5px solid ${borderColor};
      font-size:${fontSize};
      font-weight:${fontWeight};
      letter-spacing:0.01em;
    ">
      <span>${displayCity}</span>
      <span style="opacity:0.5;font-size:9px;">·</span>
      <span style="font-weight:800;">${price}</span>
    </div>
    <div style="
      width:0;height:0;
      border-left:6px solid transparent;
      border-right:6px solid transparent;
      border-top:6px solid ${bgColor};
      margin:0 auto;
      transform:translateX(-50%);
      position:absolute;
      bottom:-6px;
      left:50%;
      filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));
    "></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createOriginIcon(code: string): L.DivIcon {
  return L.divIcon({
    className: "explore-origin-pin",
    html: `<div style="
      background:linear-gradient(135deg, hsl(265 90% 60%), hsl(265 90% 72%));
      color:#fff;
      width:36px;height:36px;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-family:'Plus Jakarta Sans',system-ui,sans-serif;
      font-size:10px;font-weight:800;
      letter-spacing:0.03em;
      box-shadow:0 0 0 4px rgba(139,92,246,0.25), 0 2px 16px rgba(0,0,0,0.4);
      border:2.5px solid rgba(255,255,255,0.7);
      transform:translate(-50%,-50%);
    ">${code}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Dark map tiles — CartoDB Dark Matter (like Google Flights dark mode)
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

    L.tileLayer(DARK_TILE_URL, {
      attribution: DARK_TILE_ATTR,
      maxZoom: 18,
      subdomains: "abcd",
    }).addTo(map);

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
