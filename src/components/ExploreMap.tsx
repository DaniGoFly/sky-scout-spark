/**
 * ExploreMap — Leaflet map with price markers for explore page
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

function createPriceIcon(price: string, isHovered: boolean, isCheapest: boolean): L.DivIcon {
  const bg = isCheapest
    ? "background:hsl(142,71%,45%);color:#fff;"
    : isHovered
    ? "background:hsl(var(--primary));color:hsl(var(--primary-foreground));"
    : "background:hsl(var(--card));color:hsl(var(--foreground));border:1px solid hsl(var(--border));";
  
  return L.divIcon({
    className: "explore-price-pin",
    html: `<div style="
      ${bg}
      padding:2px 6px;
      border-radius:12px;
      font-size:11px;
      font-weight:600;
      white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,0.15);
      transform:translate(-50%,-50%);
      cursor:pointer;
      transition:transform 0.15s;
      ${isHovered ? "transform:translate(-50%,-50%) scale(1.15);z-index:1000;" : ""}
    ">${price}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

const ExploreMap = ({ destinations, originAirport, onSelect, hoveredIata, onHover, formatPrice }: ExploreMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [30, 0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 10,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Center on origin
  useEffect(() => {
    if (!mapRef.current || !originAirport) return;
    mapRef.current.flyTo([originAirport.lat, originAirport.lon], 4, { duration: 1 });
  }, [originAirport]);

  // Cheapest iata
  const cheapestIata = useMemo(() => {
    if (destinations.length === 0) return null;
    return destinations.reduce((a, b) => a.price < b.price ? a : b).destinationIata;
  }, [destinations]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    for (const [, marker] of markersRef.current) {
      map.removeLayer(marker);
    }
    markersRef.current.clear();

    // Add origin marker
    if (originAirport) {
      const originMarker = L.marker([originAirport.lat, originAirport.lon], {
        icon: L.divIcon({
          className: "explore-origin-pin",
          html: `<div style="
            background:hsl(var(--primary));
            color:hsl(var(--primary-foreground));
            width:28px;height:28px;
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            font-size:12px;font-weight:700;
            box-shadow:0 2px 8px rgba(0,0,0,0.25);
            border:2px solid white;
            transform:translate(-50%,-50%);
          ">${originAirport.code.slice(0, 3)}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        zIndexOffset: 2000,
      });
      originMarker.addTo(map);
      markersRef.current.set("__origin__", originMarker);
    }

    // Add destination markers
    for (const dest of destinations) {
      if (!dest.lat || !dest.lon) continue;
      const isCheapest = dest.destinationIata === cheapestIata;
      const isHovered = dest.destinationIata === hoveredIata;
      const icon = createPriceIcon(formatPrice(dest.price), isHovered, isCheapest);

      const marker = L.marker([dest.lat, dest.lon], {
        icon,
        zIndexOffset: isCheapest ? 1500 : isHovered ? 1200 : 100,
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
