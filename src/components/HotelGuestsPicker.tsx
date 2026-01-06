import { useState, useCallback, useEffect } from "react";
import { Users, ChevronDown, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface HotelGuestsData {
  adults: number;
  children: number;
  rooms: number;
}

interface HotelGuestsPickerProps {
  value: HotelGuestsData;
  onChange: (value: HotelGuestsData) => void;
}

const MAX_GUESTS = 12;
const MAX_ROOMS = 8;

const HotelGuestsPicker = ({ value, onChange }: HotelGuestsPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const totalGuests = value.adults + value.children;

  const updateValue = useCallback((updates: Partial<HotelGuestsData>) => {
    onChange({ ...value, ...updates });
  }, [value, onChange]);

  const increment = (field: keyof HotelGuestsData) => {
    if (field === "rooms") {
      if (value.rooms >= MAX_ROOMS) return;
      updateValue({ rooms: value.rooms + 1 });
    } else {
      if (totalGuests >= MAX_GUESTS) return;
      updateValue({ [field]: value[field] + 1 });
    }
  };

  const decrement = (field: keyof HotelGuestsData) => {
    const min = field === "adults" || field === "rooms" ? 1 : 0;
    if (value[field] <= min) return;
    updateValue({ [field]: value[field] - 1 });
  };

  const getDisplayText = () => {
    const parts = [];
    parts.push(`${totalGuests} guest${totalGuests !== 1 ? "s" : ""}`);
    parts.push(`${value.rooms} room${value.rooms !== 1 ? "s" : ""}`);
    return parts.join(", ");
  };

  const helperText = totalGuests >= MAX_GUESTS 
    ? "Maximum 12 guests reached"
    : null;

  const PickerContent = () => (
    <div className="space-y-4">
      {/* Adults */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground">Adults</p>
          <p className="text-xs text-muted-foreground">18+ years</p>
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
            disabled={totalGuests >= MAX_GUESTS}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Children */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground">Children</p>
          <p className="text-xs text-muted-foreground">0–17 years</p>
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
            disabled={totalGuests >= MAX_GUESTS}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Rooms */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div>
          <p className="font-medium text-foreground">Rooms</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => decrement("rooms")}
            disabled={value.rooms <= 1}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="w-6 text-center font-semibold">{value.rooms}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => increment("rooms")}
            disabled={value.rooms >= MAX_ROOMS}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {helperText && (
        <p className="text-xs text-muted-foreground bg-secondary/50 px-3 py-2 rounded-lg">
          {helperText}
        </p>
      )}

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
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-12 justify-start text-left font-normal pl-10 relative"
          >
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            {getDisplayText()}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Guests & Rooms</SheetTitle>
          </SheetHeader>
          <PickerContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-12 justify-start text-left font-normal pl-10 relative"
        >
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <PickerContent />
      </PopoverContent>
    </Popover>
  );
};

export default HotelGuestsPicker;
