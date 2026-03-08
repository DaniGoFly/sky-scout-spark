import { MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

interface NearbyToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
}

const NearbyToggle = ({ enabled, onToggle, radius, onRadiusChange }: NearbyToggleProps) => (
  <div className="mt-1.5 space-y-0">
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <Checkbox
        checked={enabled}
        onCheckedChange={(checked) => onToggle(checked === true)}
        className="h-4 w-4 rounded-[4px]"
      />
      <span className="text-[12px] text-muted-foreground flex items-center gap-1 leading-none">
        <MapPin className="w-3 h-3" /> Add nearby airports
      </span>
    </label>
    <div
      className="overflow-hidden transition-all duration-300 ease-in-out"
      style={{
        maxHeight: enabled ? "60px" : "0px",
        opacity: enabled ? 1 : 0,
      }}
    >
      <div className="flex items-center gap-2.5 pl-6 pt-1.5">
        <Slider
          value={[radius]}
          onValueChange={(v) => onRadiusChange(v[0])}
          min={0}
          max={400}
          step={25}
          className="flex-1 max-w-[140px]"
        />
        <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap font-medium">
          {radius} km
        </span>
      </div>
    </div>
  </div>
);

export default NearbyToggle;
