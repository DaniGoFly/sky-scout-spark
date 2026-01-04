import { useState, useEffect, useRef } from "react";
import { Plane, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

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
}

const AirportAutocomplete = ({ value, onChange, placeholder, icon = "from", compact = false }: AirportAutocompleteProps) => {
  const [query, setQuery] = useState(value?.display || "");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset to selected value if user didn't pick
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
    // Clear selection when user starts typing again
    if (value && newValue !== value.display) {
      onChange(null);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative group">
        <Plane 
          className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors ${
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
            ? `pl-9 h-10 bg-secondary/50 border-transparent rounded-lg text-sm ${!value ? "border border-destructive/50" : ""}`
            : `pl-12 h-14 bg-secondary/50 border-2 rounded-xl focus:bg-card focus:ring-0 text-base font-medium transition-all ${
                value ? "border-transparent focus:border-primary" : "border-destructive/50 focus:border-destructive"
              }`
          }
          placeholder={placeholder}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className={`absolute top-1/2 -translate-y-1/2 animate-spin text-muted-foreground ${compact ? "right-3 w-3 h-3" : "right-4 w-4 h-4"}`} />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
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
                <div className="text-sm text-muted-foreground">
                  {place.country_name} · {place.type === "airport" ? "Airport" : "City"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && suggestions.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-lg p-4 text-center text-muted-foreground">
          No airports found
        </div>
      )}
    </div>
  );
};

export default AirportAutocomplete;
