/**
 * Multi-Origin Airport Input
 * Allows selecting up to 6 departure airports as pills.
 * Falls back to single-origin mode when only 1 selected.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Plane, Loader2, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Place {
  name: string;
  code: string;
  country_code: string;
  country_name: string;
  type: "city" | "airport" | "country";
  main_airport_name?: string | null;
}

export interface AirportSelection {
  code: string;
  display: string;
}

interface MultiOriginInputProps {
  values: AirportSelection[];
  onChange: (values: AirportSelection[]) => void;
  placeholder?: string;
  maxAirports?: number;
  compact?: boolean;
  multiLabel?: string;
}

const MAX_DEFAULT = 6;

const PortalDropdown = ({
  anchorRef,
  children,
}: {
  anchorRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
}) => {
  const [style, setStyle] = useState<React.CSSProperties>({});

  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setStyle({
      position: "fixed",
      left: rect.left,
      top: rect.bottom + 6,
      width: Math.max(rect.width, 300),
      maxHeight: Math.max(120, window.innerHeight - rect.bottom - 16),
      zIndex: 9999,
    });
  }, [anchorRef]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [updatePosition]);

  return createPortal(<div style={style}>{children}</div>, document.body);
};

const MultiOriginInput = ({
  values,
  onChange,
  placeholder = "Where from?",
  maxAirports = MAX_DEFAULT,
  compact = false,
  multiLabel,
}: MultiOriginInputProps) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null!);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canAdd = values.length < maxAirports;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setIsOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(query)}&locale=en&types[]=city&types[]=airport`,
          { signal: controller.signal }
        );
        const data: Place[] = await response.json();
        const selectedCodes = new Set(values.map((v) => v.code.toUpperCase()));
        setSuggestions(data.filter((p) => !selectedCodes.has(p.code.toUpperCase())).slice(0, 8));
        setHighlightedIndex(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to fetch suggestions:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };
    const timer = setTimeout(fetchSuggestions, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, values]);

  const handleSelect = useCallback(
    (place: Place) => {
      if (!canAdd) return;
      const display =
        place.type === "airport"
          ? `${place.name} (${place.code})`
          : place.main_airport_name
          ? `${place.name} – ${place.main_airport_name} (${place.code})`
          : `${place.name} (${place.code})`;
      onChange([...values, { code: place.code, display }]);
      setQuery("");
      setIsOpen(false);
      setSuggestions([]);
      inputRef.current?.focus();
    },
    [canAdd, onChange, values]
  );

  const handleRemove = useCallback(
    (code: string) => {
      onChange(values.filter((v) => v.code !== code));
    },
    [onChange, values]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && query === "" && values.length > 0) {
      e.preventDefault();
      onChange(values.slice(0, -1));
      return;
    }
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const showSuggestions = isOpen && suggestions.length > 0;
  const showEmpty = isOpen && query.length >= 2 && suggestions.length === 0 && !isLoading;

  return (
    <TooltipProvider delayDuration={300}>
      <div ref={wrapperRef} className="relative min-w-0">
        <div
          className={`flex flex-wrap items-center gap-1 bg-secondary/50 rounded-xl transition-all cursor-text ${
            compact ? "min-h-[40px] px-2 py-1" : "min-h-[52px] px-3 py-1.5"
          } border-2 border-transparent focus-within:border-primary/60 focus-within:bg-card`}
          onClick={() => inputRef.current?.focus()}
        >
          <Plane className={`text-muted-foreground shrink-0 ${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
          {values.map((v) => (
            <Tooltip key={v.code}>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold bg-primary/10 text-primary border border-primary/25 rounded-md shrink-0 hover:bg-primary/20 transition-colors cursor-default">
                  {v.code}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(v.code);
                    }}
                    className="ml-0.5 hover:text-destructive transition-colors rounded-sm"
                    aria-label={`Remove ${v.code}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {v.display}
              </TooltipContent>
            </Tooltip>
          ))}
          {canAdd ? (
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => query.length >= 2 && setIsOpen(true)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-[70px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
              placeholder={values.length === 0 ? placeholder : "+ Add airport…"}
              autoComplete="off"
            />
          ) : (
            <span className="text-[10px] text-muted-foreground italic">Max {maxAirports}</span>
          )}
          {isLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />}
        </div>

        {values.length > 1 && (
          <div className="mt-1 flex items-center gap-1.5 px-0.5">
            <span className="text-[10px] text-primary/80 font-semibold uppercase tracking-wider">{multiLabel || "Multi-Origin"}</span>
            <span className="text-[10px] text-muted-foreground">· {values.length} airports</span>
          </div>
        )}

        {showSuggestions && (
          <PortalDropdown anchorRef={wrapperRef}>
            <div
              ref={dropdownRef}
              className="bg-card border border-border/80 rounded-xl shadow-xl overflow-hidden overflow-y-auto"
              style={{ maxHeight: "inherit" }}
            >
              {suggestions.map((place, index) => (
                <button
                  key={`${place.code}-${index}`}
                  type="button"
                  onClick={() => handleSelect(place)}
                  className={`w-full px-3 py-2.5 text-left flex items-center gap-3 transition-colors ${
                    index === highlightedIndex ? "bg-primary/10" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <span className="text-[11px] font-bold text-muted-foreground">{place.code}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {place.name}
                      {place.main_airport_name && (
                        <span className="text-muted-foreground"> – {place.main_airport_name}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {place.country_name} · {place.type === "airport" ? "Airport" : "City"}
                    </div>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </PortalDropdown>
        )}

        {showEmpty && (
          <PortalDropdown anchorRef={wrapperRef}>
            <div className="bg-card border border-border/80 rounded-xl shadow-xl p-4 text-center text-sm text-muted-foreground">
              No airports found
            </div>
          </PortalDropdown>
        )}
      </div>
    </TooltipProvider>
  );
};

export default MultiOriginInput;
