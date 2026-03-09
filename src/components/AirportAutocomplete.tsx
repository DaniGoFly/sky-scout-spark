import { useState, useEffect, useRef } from "react";
import { Plane, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OverlayPortal } from "@/components/overlays/OverlayPortal";
import { useAnchoredOverlay } from "@/hooks/useAnchoredOverlay";


interface Place {
  name: string;
  code: string;
  country_code: string;
  country_name: string;
  type: "city" | "airport" | "country";
  main_airport_name?: string | null;
}

interface AirportAutocompleteProps {
  value: { code: string; display: string } | null;
  onChange: (value: { code: string; display: string } | null) => void;
  placeholder: string;
  icon?: "from" | "to";
  compact?: boolean;
  hasError?: boolean;
}

/**
 * Dropdown rendered absolutely under the field wrapper so it stays
 * anchored to the trigger and never drifts.
 */

const AirportAutocomplete = ({ value, onChange, placeholder, icon = "from", compact = false, hasError = false }: AirportAutocompleteProps) => {
  const [query, setQuery] = useState(value?.display || "");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideWrapper = wrapperRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideWrapper && !insideDropdown) {
        setIsOpen(false);
        if (value) {
          setQuery(value.display);
        } else {
          setQuery("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  // Sync external value changes
  useEffect(() => {
    if (value) {
      setQuery(value.display);
    }
  }, [value?.display]);

  // Fetch suggestions from Travelpayouts API
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
        setSuggestions(data.slice(0, 8));
        setHighlightedIndex(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to fetch suggestions:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 200);
    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [query]);

  const handleSelect = (place: Place) => {
    const display = place.type === "airport" 
      ? `${place.name} (${place.code})`
      : place.main_airport_name 
        ? `${place.name} – ${place.main_airport_name} (${place.code})`
        : `${place.name} (${place.code})`;
    
    onChange({ code: place.code, display });
    setQuery(display);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setIsOpen(true);
    if (value && newValue !== value.display) {
      onChange(null);
    }
  };

  const showSuggestions = isOpen && suggestions.length > 0;
  const showEmpty = isOpen && query.length >= 2 && suggestions.length === 0 && !isLoading;

  const dropdownOverlay = useAnchoredOverlay({
    open: isOpen,
    anchorRef: wrapperRef,
    offset: 8,
    matchWidth: true,
  });

  return (
    <div ref={wrapperRef} className="relative min-w-0">
      <div className="relative group min-w-0">
        <Plane 
          className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors shrink-0 ${
            icon === "to" ? "rotate-90" : ""
          } ${compact ? "left-3 w-4 h-4" : "left-4 w-5 h-5"}`} 
        />
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={compact 
            ? `pl-9 h-10 bg-secondary/50 border-transparent rounded-xl text-sm truncate focus:ring-0 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0 ${hasError ? "border border-destructive/50" : ""}`
            : `pl-12 h-12 bg-secondary/50 border-2 rounded-xl focus:bg-card focus:ring-0 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0 text-sm sm:text-base font-medium transition-all truncate ${
                hasError ? "border-destructive/50 focus:border-destructive" : "border-transparent focus:border-primary/60"
              }`
          }
          placeholder={placeholder}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className={`absolute top-1/2 -translate-y-1/2 animate-spin text-muted-foreground shrink-0 ${compact ? "right-3 w-3 h-3" : "right-4 w-4 h-4"}`} />
        )}
      </div>

      {showSuggestions && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-[calc(100%+8px)] z-[9999] w-full min-w-[280px] bg-card border border-border rounded-xl shadow-lg overflow-hidden overflow-y-auto max-h-[360px]"
        >
          {suggestions.map((place, index) => (
            <button
              key={`${place.code}-${index}`}
              type="button"
              onClick={() => handleSelect(place)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                index === highlightedIndex 
                  ? "bg-primary/10" 
                  : "hover:bg-secondary/50"
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-xs font-bold text-muted-foreground">
                  {place.code}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {place.name}
                  {place.main_airport_name && (
                    <span className="text-muted-foreground"> – {place.main_airport_name}</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {place.country_name} · {place.type === "airport" ? "Airport" : "City"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showEmpty && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[9999] w-full min-w-[280px] bg-card border border-border rounded-xl shadow-lg p-4 text-center text-muted-foreground">
          No airports found
        </div>
      )}
    </div>
  );
};

export default AirportAutocomplete;
