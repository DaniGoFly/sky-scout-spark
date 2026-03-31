import { useState, useEffect, useRef } from "react";
import { Plane, Loader2, Clock, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Place {
  name: string;
  code: string;
  country_code: string;
  country_name: string;
  type: "city" | "airport" | "country";
  main_airport_name?: string | null;
}

export interface QuickPickAirport {
  code: string;
  city: string;
  label?: string; // e.g. "Recent" or "Nearby"
}

interface AirportAutocompleteProps {
  value: { code: string; display: string } | null;
  onChange: (value: { code: string; display: string } | null) => void;
  placeholder: string;
  icon?: "from" | "to";
  compact?: boolean;
  hasError?: boolean;
  controlClassName?: string;
  inputClassName?: string;
  endAdornment?: React.ReactNode;
  hideLoadingIndicator?: boolean;
  /** Quick-pick airports shown when focused with empty query */
  quickPicks?: QuickPickAirport[];
  /** Hint text shown below the input */
  hint?: string;
  /** Called when hint action is tapped */
  onHintAction?: () => void;
}

/**
 * Dropdown rendered inline with absolute positioning.
 * Scrolls naturally with the search bar.
 */
const AirportAutocomplete = ({
  value,
  onChange,
  placeholder,
  icon = "from",
  compact = false,
  hasError = false,
  controlClassName,
  inputClassName,
  endAdornment,
  hideLoadingIndicator = false,
  quickPicks,
  hint,
  onHintAction,
}: AirportAutocompleteProps) => {
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

  const handleQuickPick = (pick: QuickPickAirport) => {
    const display = `${pick.city} (${pick.code})`;
    onChange({ code: pick.code, display });
    setQuery(display);
    setIsOpen(false);
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

  const handleFocus = () => {
    // Select all text on focus so user can immediately type over auto-filled value
    if (inputRef.current && value) {
      inputRef.current.select();
    }
    setIsOpen(true);
  };

  const showSuggestions = isOpen && suggestions.length > 0;
  const showQuickPicks = isOpen && query.length < 2 && !showSuggestions && quickPicks && quickPicks.length > 0;
  const showEmpty = isOpen && query.length >= 2 && suggestions.length === 0 && !isLoading;

  return (
    <div ref={wrapperRef} className="relative min-w-0">
      <div className={cn("relative group min-w-0", controlClassName)}>
        <Plane 
          className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors shrink-0 ${
            icon === "to" ? "rotate-90" : ""
          } ${compact ? "left-3 w-4 h-4" : "left-4 w-5 h-5"}`} 
        />
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className={compact 
            ? cn(`pl-9 h-10 bg-secondary/50 border-transparent rounded-xl text-sm truncate focus:ring-0 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0 ${hasError ? "border border-destructive/50" : ""}`, inputClassName)
            : cn(`pl-12 h-12 bg-secondary/50 border-2 rounded-xl focus:bg-card focus:ring-0 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0 text-sm sm:text-base font-medium transition-all truncate ${
                hasError ? "border-destructive/50 focus:border-destructive" : "border-transparent focus:border-primary/60"
              }`, inputClassName)
          }
          placeholder={placeholder}
          autoComplete="off"
        />
        {!hideLoadingIndicator && isLoading && (
          <Loader2 className={`absolute top-1/2 -translate-y-1/2 animate-spin text-muted-foreground shrink-0 ${compact ? "right-3 w-3 h-3" : "right-4 w-4 h-4"}`} />
        )}
        {endAdornment}
      </div>

      {/* Hint text below input */}
      {hint && !isOpen && (
        <p className="text-[10px] text-muted-foreground/50 mt-1 pl-1">
          {onHintAction ? (
            <button onClick={onHintAction} className="hover:text-muted-foreground transition-colors">
              {hint}
            </button>
          ) : hint}
        </p>
      )}

      {/* Quick picks: shown on focus when no typed query */}
      {showQuickPicks && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 z-[200] mt-2 min-w-[280px] bg-card border border-border rounded-xl shadow-lg overflow-hidden overflow-y-auto max-h-[360px]"
        >
          <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Nearby airports
          </div>
          {quickPicks.map((pick, index) => (
            <button
              key={pick.code}
              type="button"
              onClick={() => handleQuickPick(pick)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors hover:bg-secondary/50 ${
                index === 0 ? "bg-primary/[0.04]" : ""
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-xs font-bold text-muted-foreground">{pick.code}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">{pick.city}</div>
                {pick.label && (
                  <div className="text-[11px] text-muted-foreground/60">{pick.label}</div>
                )}
              </div>
              {index === 0 && (
                <span className="text-[10px] text-primary/70 font-medium shrink-0">Closest</span>
              )}
            </button>
          ))}
          <div className="px-4 py-2 border-t border-border/20">
            <p className="text-[10px] text-muted-foreground/40 text-center">Type to search any airport</p>
          </div>
        </div>
      )}

      {/* Dropdown: inline absolute positioning, scrolls with search bar */}
      {showSuggestions && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 z-[200] mt-2 min-w-[280px] bg-card border border-border rounded-xl shadow-lg overflow-hidden overflow-y-auto max-h-[360px]"
        >
          {suggestions.map((place, index) => (
            <button
              key={`${place.code}-${index}`}
              type="button"
              onClick={() => handleSelect(place)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                index === highlightedIndex ? "bg-primary/10" : "hover:bg-secondary/50"
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-xs font-bold text-muted-foreground">{place.code}</span>
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
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 z-[200] mt-2 min-w-[280px] bg-card border border-border rounded-xl shadow-lg p-4 text-center text-muted-foreground"
        >
          No airports found
        </div>
      )}
    </div>
  );
};

export default AirportAutocomplete;
