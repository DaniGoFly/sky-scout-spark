import { useState, useCallback, useEffect } from "react";
import { Users, ChevronDown, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
}

const CABIN_CLASSES = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
] as const;

const MAX_TRAVELERS = 9;

const TravelersPicker = ({ value, onChange }: TravelersPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

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
    
    updateValue({ [field]: value[field] - 1 });
  };

  // Adjust infants if adults decrease
  useEffect(() => {
    if (totalInfants > value.adults) {
      const excess = totalInfants - value.adults;
      const newInfantsLap = Math.max(0, value.infantsLap - excess);
      const remainingExcess = excess - (value.infantsLap - newInfantsLap);
      const newInfantsSeat = Math.max(0, value.infantsSeat - remainingExcess);
      updateValue({ infantsLap: newInfantsLap, infantsSeat: newInfantsSeat });
    }
  }, [value.adults, totalInfants, value.infantsLap, value.infantsSeat, updateValue]);

  const getDisplayText = () => {
    const parts = [];
    const passengerCount = value.adults + value.children + value.infantsSeat;
    parts.push(`${passengerCount} traveler${passengerCount !== 1 ? "s" : ""}`);
    
    const classLabel = CABIN_CLASSES.find(c => c.value === value.cabinClass)?.label || "Economy";
    parts.push(classLabel);
    
    return parts.join(", ");
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
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Adults</p>
            <p className="text-xs text-muted-foreground">12+ years</p>
          </div>
          <div className="flex items-center gap-3">
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
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Children</p>
            <p className="text-xs text-muted-foreground">2–11 years</p>
          </div>
          <div className="flex items-center gap-3">
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
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Infants</p>
            <p className="text-xs text-muted-foreground">In seat, under 2</p>
          </div>
          <div className="flex items-center gap-3">
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
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Infants</p>
            <p className="text-xs text-muted-foreground">On lap, under 2</p>
          </div>
          <div className="flex items-center gap-3">
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
                "px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
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

      <Button 
        className="w-full" 
        onClick={() => setIsOpen(false)}
      >
        Done
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          Travelers
        </label>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-full h-14 justify-between text-left font-medium bg-secondary/50 border-2 border-transparent rounded-xl hover:bg-card hover:border-primary/50 transition-all"
            >
              <div className="flex items-center">
                <Users className="mr-3 h-5 w-5 text-muted-foreground" />
                <span className="truncate">{getDisplayText()}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
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

  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Travelers
      </label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-14 justify-between text-left font-medium bg-secondary/50 border-2 border-transparent rounded-xl hover:bg-card hover:border-primary/50 transition-all"
          >
            <div className="flex items-center">
              <Users className="mr-3 h-5 w-5 text-muted-foreground" />
              <span className="truncate">{getDisplayText()}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <PickerContent />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TravelersPicker;
