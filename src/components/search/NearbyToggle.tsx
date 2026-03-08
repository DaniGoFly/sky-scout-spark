import { MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface NearbyToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  disabled?: boolean;
}

const NearbyToggle = ({ enabled, onToggle, radius, onRadiusChange, disabled = false }: NearbyToggleProps) => (
  <div className="flex h-full min-h-[44px] w-full min-w-0 flex-col justify-start">
    <label className={cn("flex h-5 items-center gap-2 select-none", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
      <Checkbox
        checked={enabled}
        disabled={disabled}
        onCheckedChange={(checked) => onToggle(checked === true)}
        className="h-4 w-4 rounded-[4px]"
      />
      <span className="text-[12px] text-muted-foreground flex items-center gap-1 leading-none whitespace-nowrap">
        <MapPin className="w-3 h-3" /> Add nearby airports
      </span>
    </label>

    <div className="mt-1 h-7 pl-6 pr-1">
      <div
        className={cn(
          "flex h-full items-center gap-2.5 transition-opacity duration-200",
          enabled && !disabled ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <Slider
          value={[radius]}
          onValueChange={(v) => onRadiusChange(v[0])}
          min={0}
          max={400}
          step={25}
          className="w-[140px] shrink-0"
        />
        <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap font-medium">
          {radius} km
        </span>
      </div>
    </div>
  </div>
);

export default NearbyToggle;
