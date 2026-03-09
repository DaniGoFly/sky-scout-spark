import { useEffect, useRef, useState, useCallback } from "react";
import { Users, ChevronDown, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { OverlayPortal } from "@/components/overlays/OverlayPortal";
import { useAnchoredOverlay } from "@/hooks/useAnchoredOverlay";

export interface TravelersData {
  adults: number;
  children: number;
  infantsSeat: number;
  infantsLap: number;
  cabinClass: "economy" | "premium_economy" | "business" | "first";
}

interface TravelersPickerProps {
  value: TravelersData;
  onChange: (value: TravelersData) => void;
  compact?: boolean;
  bare?: boolean;
  segmentMode?: boolean;
}

const CABIN_CLASSES = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
] as const;

const MAX_TRAVELERS = 9;

const TravelersPicker = ({ value, onChange, compact = false, bare = false, segmentMode = false }: TravelersPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const triggerWrapRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const overlay = useAnchoredOverlay({
    open: isOpen,
    anchorRef: triggerWrapRef,
    offset: 8,
    matchWidth: false,
  });

  // Close panel when clicking outside (panel is portaled)
  useEffect(() => {
    if (!isOpen) return;

    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerWrapRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [isOpen]);

  const totalTravelers = value.adults + value.children + value.infantsSeat + value.infantsLap;
  const totalInfants = value.infantsSeat + value.infantsLap;

  const canAddMore = totalTravelers < MAX_TRAVELERS;
  const canAddInfant = totalInfants < value.adults;

  const updateValue = useCallback((updates: Partial<TravelersData>) => {
    onChange({ ...value, ...updates });
  }, [value, onChange]);

  const increment = (field: keyof TravelersData) => {
    if (typeof value[field] !== "number") return;

    if (field === "infantsSeat" || field === "infantsLap") {
      if (!canAddInfant) return;
    } else if (!canAddMore) return;

    updateValue({ [field]: value[field] + 1 });
  };

  const decrement = (field: keyof TravelersData) => {
    if (typeof value[field] !== "number") return;
    const min = field === "adults" ? 1 : 0;
    if (value[field] <= min) return;

    // Auto-reduce infants if adults go down
    if (field === "adults" && value[field] === totalInfants) {
      // Need to reduce infants first
      if (value.infantsLap > 0) {
        updateValue({ [field]: value[field] - 1, infantsLap: value.infantsLap - 1 });
        return;
      } else if (value.infantsSeat > 0) {
        updateValue({ [field]: value[field] - 1, infantsSeat: value.infantsSeat - 1 });
        return;
      }
    }

    updateValue({ [field]: value[field] - 1 });
  };

  const getDisplayText = () => {
    const passengerCount = value.adults + value.children + value.infantsSeat;
    const travelerText = `${passengerCount} traveler${passengerCount !== 1 ? "s" : ""}`;
    const classLabel = CABIN_CLASSES.find((c) => c.value === value.cabinClass)?.label || "Economy";
    return segmentMode ? `${travelerText} • ${classLabel}` : `${travelerText}, ${classLabel}`;
  };

  const helperText = totalTravelers >= MAX_TRAVELERS
    ? "Maximum 9 travelers reached"
    : totalInfants >= value.adults
      ? "Each infant requires an adult"
      : null;

  const PickerContent = () => (
    <div className="space-y-5">
      {/* Passengers */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm text-foreground">Passengers</h4>

        {/* Adults */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">Adults</p>
            <p className="text-xs text-muted-foreground">12+ years</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => decrement("adults")}
              disabled={value.adults <= 1}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-6 text-center font-semibold">{value.adults}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => increment("adults")}
              disabled={!canAddMore}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Children */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">Children</p>
            <p className="text-xs text-muted-foreground">2–11 years</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => decrement("children")}
              disabled={value.children <= 0}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-6 text-center font-semibold">{value.children}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => increment("children")}
              disabled={!canAddMore}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Infants in Seat */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">Infants</p>
            <p className="text-xs text-muted-foreground">In seat, under 2</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => decrement("infantsSeat")}
              disabled={value.infantsSeat <= 0}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-6 text-center font-semibold">{value.infantsSeat}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => increment("infantsSeat")}
              disabled={!canAddMore || !canAddInfant}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Infants on Lap */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">Infants</p>
            <p className="text-xs text-muted-foreground">On lap, under 2</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => decrement("infantsLap")}
              disabled={value.infantsLap <= 0}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-6 text-center font-semibold">{value.infantsLap}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => increment("infantsLap")}
              disabled={!canAddInfant}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {helperText && (
        <p className="text-xs text-muted-foreground bg-secondary/50 px-3 py-2 rounded-lg">
          {helperText}
        </p>
      )}

      {/* Cabin Class */}
      <div className="space-y-3 pt-4 border-t border-border">
        <h4 className="font-semibold text-sm text-foreground">Cabin class</h4>
        <div className="grid grid-cols-2 gap-2">
          {CABIN_CLASSES.map((cabin) => (
            <button
              key={cabin.value}
              onClick={() => updateValue({ cabinClass: cabin.value })}
              className={cn(
                "px-3 py-2.5 rounded-lg text-sm font-medium transition-colors truncate",
                value.cabinClass === cabin.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              )}
            >
              {cabin.label}
            </button>
          ))}
        </div>
      </div>

      <Button className="w-full" onClick={() => setIsOpen(false)}>
        Done
      </Button>
    </div>
  );

  // Mobile (non-compact) stays as a bottom sheet (already stable and doesn’t fight the header)
  if (isMobile && !compact) {
    return (
      <div className="min-w-0">
        <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          Travelers
        </label>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-full h-14 justify-between text-left font-medium bg-secondary/50 border-2 border-transparent rounded-xl hover:bg-card hover:border-primary/50 transition-all min-w-0"
            >
              <div className="flex items-center min-w-0 flex-1">
                <Users className="mr-3 h-5 w-5 text-muted-foreground shrink-0" />
                <span className="truncate">{getDisplayText()}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl">
            <SheetHeader className="mb-4">
              <SheetTitle>Travelers & Cabin Class</SheetTitle>
            </SheetHeader>
            <PickerContent />
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  const Panel = isOpen ? (
    <OverlayPortal>
      <div
        ref={panelRef}
        style={{ ...overlay.style, minWidth: 320 }}
        className="pointer-events-auto fixed z-[9999] w-80 p-4 bg-card border border-border rounded-xl shadow-xl isolate"
      >
        <PickerContent />
      </div>
    </OverlayPortal>
  ) : null;

  if (compact) {
    return (
      <div ref={triggerWrapRef} className="min-w-0">
        {segmentMode ? (
          <button
            type="button"
            className="w-full h-full text-left px-4 flex flex-col justify-center cursor-pointer focus:outline-none"
            onClick={() => setIsOpen((v) => !v)}
            aria-expanded={isOpen}
          >
            <span className="block text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.12em] leading-none">
              Travellers
            </span>
            <span className="block text-[14px] leading-[20px] mt-1.5 font-semibold text-foreground whitespace-nowrap">
              {getDisplayText()}
            </span>
          </button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen((v) => !v)}
            className={cn(
              "w-full justify-start text-left font-medium shrink-0 min-w-0 transition-all",
              bare
                ? "h-[36px] bg-transparent border-0 rounded-none hover:bg-secondary/30 p-0 px-2"
                : "h-[42px] bg-secondary/40 border border-border/60 rounded-lg hover:bg-secondary/60 hover:border-primary/50"
            )}
          >
            {!bare && <Users className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />}
            <span className="truncate text-xs">{getDisplayText()}</span>
            {!bare && <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 ml-auto" />}
          </Button>
        )}

        {Panel}
      </div>
    );
  }

  return (
    <div ref={triggerWrapRef} className="min-w-0">
      <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Travelers
      </label>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full h-14 justify-between text-left font-medium bg-secondary/50 border-2 border-transparent rounded-xl hover:bg-card hover:border-primary/50 transition-all min-w-0"
      >
        <div className="flex items-center min-w-0 flex-1">
          <Users className="mr-3 h-5 w-5 text-muted-foreground shrink-0" />
          <span className="truncate">{getDisplayText()}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
      </Button>

      {Panel}
    </div>
  );
};

export default TravelersPicker;
