import { MapPin, Search } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface NearbyToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  label?: string;
}

const NearbyToggle = ({ enabled, onToggle, radius, onRadiusChange, label = "Nearby airports" }: NearbyToggleProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        className={`flex items-center gap-1.5 text-[11px] transition-colors cursor-pointer ${
          enabled
            ? "text-primary font-medium"
            : "text-muted-foreground/50 hover:text-foreground"
        }`}
      >
        <MapPin className="w-3 h-3" />
        {enabled ? `${label} (${radius} km)` : label}
      </button>
    </PopoverTrigger>
    <PopoverContent
      align="start"
      side="bottom"
      sideOffset={8}
      className="w-64 p-4 pointer-events-auto"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">{label}</p>
          <button
            type="button"
            onClick={() => onToggle(!enabled)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              enabled
                ? "bg-primary/15 text-primary"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {enabled ? "Enabled ✓" : "Enable"}
          </button>
        </div>

        {enabled && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Radius</span>
              <span className="text-[11px] font-semibold text-foreground tabular-nums">
                {radius} km
              </span>
            </div>
            <Slider
              value={[radius]}
              onValueChange={(v) => onRadiusChange(v[0])}
              min={25}
              max={400}
              step={25}
              className="w-full"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground/60">
              <span>25 km</span>
              <span>400 km</span>
            </div>
          </div>
        )}
      </div>
    </PopoverContent>
  </Popover>
);

export default NearbyToggle;
