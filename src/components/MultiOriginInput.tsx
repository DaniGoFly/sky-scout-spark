/**
 * Multi-Origin Airport Input
 * Professional multi-airport selector with inline chips and anchored dropdown.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Loader2, Plus, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  bare?: boolean;
}

const MAX_DEFAULT = 6;
const MAX_VISIBLE_CHIPS = 1;
const MIN_INPUT_WIDTH_PX = 112;
const COMPACT_ADD_THRESHOLD_PX = 106;

/* ── Portal dropdown anchored to the field ── */
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
      top: rect.bottom + 8,
      width: Math.max(rect.width, 280),
      maxHeight: Math.max(120, window.innerHeight - rect.bottom - 16),
      zIndex: 9999,
    });
  }, [anchorRef]);

  useEffect(() => {
    updatePosition();
    // Only update on resize, not scroll - keeps panel stable while open
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, [updatePosition]);

  return createPortal(<div style={style}>{children}</div>, document.body);
};

/* ── Chip component ── */
const AirportChip = ({
  airport,
  onRemove,
}: {
  airport: AirportSelection;
  onRemove: () => void;
}) => (
  <span className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-bold bg-primary/12 text-primary border border-primary/20 rounded-full shrink-0 select-none transition-colors hover:bg-primary/20 hover:border-primary/30">
    {airport.code}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      className="ml-0.5 rounded-full hover:text-destructive transition-colors p-px"
      aria-label={`Remove ${airport.code}`}
    >
      <X className="w-2.5 h-2.5" />
    </button>
  </span>
);

const MultiOriginInput = ({
  values,
  onChange,
  placeholder = "Where from?",
  maxAirports = MAX_DEFAULT,
  compact = false,
  multiLabel,
  bare = false,
}: MultiOriginInputProps) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [isInputActive, setIsInputActive] = useState(false);
  const [isCompactAddAction, setIsCompactAddAction] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null!);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null!);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canAdd = values.length < maxAirports;
  const selectingRef = useRef(false);

  const maxVisibleChips = MAX_VISIBLE_CHIPS;
  const visibleChips = values.slice(0, maxVisibleChips);
  const overflowChips = values.slice(maxVisibleChips);
  const hasOverflow = overflowChips.length > 0;
  const addActionText = "Add +";
  const reservedInputWidth = MIN_INPUT_WIDTH_PX;

  /* Close on outside click */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectingRef.current) return;
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setIsOpen(false);
        setIsInputActive(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!inputAreaRef.current) return;

    const updateCompactAction = () => {
      const width = inputAreaRef.current?.clientWidth ?? 0;
      setIsCompactAddAction(width > 0 && width < COMPACT_ADD_THRESHOLD_PX);
    };

    updateCompactAction();
    const observer = new ResizeObserver(updateCompactAction);
    observer.observe(inputAreaRef.current);

    return () => {
      observer.disconnect();
    };
  }, [values.length, hasOverflow]);

  /* Fetch suggestions */
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
        setSuggestions(data.filter((p) => !selectedCodes.has(p.code.toUpperCase())).slice(0, 6));
        setHighlightedIndex(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to fetch suggestions:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };
    const timer = setTimeout(fetchSuggestions, 180);
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
      setIsInputActive(false);
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
      if (!query) setIsInputActive(false);
    }
  };

  const showSuggestions = isOpen && suggestions.length > 0;
  const showEmpty = isOpen && query.length >= 2 && suggestions.length === 0 && !isLoading;

  return (
    <div ref={wrapperRef} className="relative min-w-0">
      {/* ── Single-row stable input container ── */}
      <div
        className={`cursor-text overflow-hidden ${
          bare
            ? "h-[24px] px-0 bg-transparent"
            : compact
              ? "h-[44px] px-3 py-2 bg-secondary/50 rounded-xl border-2 border-transparent focus-within:border-primary/60 focus-within:bg-card"
              : "h-[52px] px-4 py-3 bg-secondary/50 rounded-xl border-2 border-transparent focus-within:border-primary/60 focus-within:bg-card"
        }`}
        onClick={() => {
          if (!canAdd) return;
          if (!isInputActive) {
            setIsInputActive(true);
            setIsOpen(true);
            requestAnimationFrame(() => inputRef.current?.focus());
            return;
          }
          inputRef.current?.focus();
        }}
      >
        <div className="flex h-full w-full items-center overflow-hidden gap-2">
          {/* ── Pinned chips group: fixed width, never moves ── */}
          {(visibleChips.length > 0 || hasOverflow) && (
            <div className="flex flex-[0_0_auto] items-center gap-1.5">
              {visibleChips.map((v) => (
                <AirportChip key={v.code} airport={v} onRemove={() => handleRemove(v.code)} />
              ))}

              {hasOverflow && (
                <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOverflowOpen(!overflowOpen);
                      }}
                      className="inline-flex h-6 shrink-0 items-center gap-0.5 rounded-full border border-border/60 bg-secondary/40 px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
                    >
                      +{overflowChips.length}
                      <ChevronDown className="h-2.5 w-2.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto min-w-[220px] p-2 bg-card border border-border rounded-xl shadow-xl pointer-events-auto"
                    align="start"
                    side="bottom"
                    sideOffset={8}
                    avoidCollisions={false}
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider px-2">
                        {values.length} airports selected
                      </span>
                      {values.map((v) => (
                        <div
                          key={v.code}
                          className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              {v.code}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {v.display}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemove(v.code)}
                            className="shrink-0 p-0.5 hover:text-destructive transition-colors rounded-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}

          {/* ── Input area: flexible, constrained, never pushes chips ── */}
          <div
            ref={inputAreaRef}
            className="flex flex-[1_1_0%] min-w-0 items-center overflow-hidden"
          >
            {canAdd ? (
              !isInputActive && query.length === 0 && values.length > 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsInputActive(true);
                    setIsOpen(true);
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                  className="flex-[0_0_auto] text-[14px] font-normal leading-[20px] text-muted-foreground/40 whitespace-nowrap"
                >
                  {addActionText}
                </button>
              ) : (
                <div className="flex items-center min-w-0 w-full overflow-hidden">
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setIsOpen(true);
                      setIsInputActive(true);
                    }}
                    onFocus={() => {
                      setIsOpen(true);
                      setIsInputActive(true);
                    }}
                    onBlur={() => {
                      if (selectingRef.current) return;
                      if (!query) {
                        setIsInputActive(false);
                        setIsOpen(false);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full min-w-0 bg-transparent text-[14px] font-normal leading-[20px] text-foreground outline-none placeholder:text-[14px] placeholder:font-normal placeholder:text-muted-foreground/40 overflow-hidden"
                    placeholder={values.length === 0 ? placeholder : addActionText}
                    autoComplete="off"
                    style={{ 
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  />
                  {isLoading && (
                    <Loader2 className="ml-1 h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                  )}
                </div>
              )
            ) : (
              <span className="flex-[0_0_auto] text-[10px] italic text-muted-foreground whitespace-nowrap">
                Max {maxAirports}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Autocomplete dropdown ── */}
      {showSuggestions && (
        <PortalDropdown anchorRef={wrapperRef}>
          <div
            ref={dropdownRef}
            className="bg-card border border-border/60 rounded-xl shadow-2xl overflow-hidden overflow-y-auto"
            style={{ maxHeight: "inherit", minWidth: "280px" }}
          >
            {suggestions.map((place, index) => (
              <button
                key={`${place.code}-${index}`}
                type="button"
                role="option"
                aria-selected={index === highlightedIndex}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectingRef.current = true;
                  handleSelect(place);
                  requestAnimationFrame(() => {
                    selectingRef.current = false;
                  });
                }}
                className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  index === highlightedIndex
                    ? "bg-primary/10"
                    : "hover:bg-secondary/50"
                }`}
              >
                {/* Airport details */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {place.name}{" "}
                    <span className="text-muted-foreground">({place.code})</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {place.country_name} ·{" "}
                    {place.type === "airport" ? "Airport" : "City"}
                  </div>
                </div>

                {/* Add icon */}
                <div className="flex-[0_0_auto]">
                  <Plus className="w-4 h-4 text-primary/50" />
                </div>
              </button>
            ))}
          </div>
        </PortalDropdown>
      )}

      {showEmpty && (
        <PortalDropdown anchorRef={wrapperRef}>
          <div className="bg-card border border-border/60 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-4 py-3 text-center text-sm text-muted-foreground">
              No airports found
            </div>
          </div>
        </PortalDropdown>
      )}
    </div>
  );
};

export default MultiOriginInput;
