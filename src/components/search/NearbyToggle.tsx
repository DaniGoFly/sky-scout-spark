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
  <div className="mt-1.5 space-y-1.5">
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <Checkbox
        checked={enabled}
        onCheckedChange={(checked) => onToggle(checked === true)}
        className="h-3.5 w-3.5 rounded-[3px]"
      />
      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
        <MapPin className="w-3 h-3" /> Add nearby airports
      </span>
    </label>
    {enabled && (
      <div className="flex items-center gap-2 pl-5">
        <Slider
          value={[radius]}
          onValueChange={(v) => onRadiusChange(v[0])}
          min={50}
          max={400}
          step={25}
          className="flex-1 max-w-[160px]"
        />
        <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
          {radius} km
        </span>
      </div>
    )}
  </div>
);

export default NearbyToggle;
