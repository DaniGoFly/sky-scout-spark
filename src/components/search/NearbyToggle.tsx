import { MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

interface NearbyToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
}

const NearbyToggle = ({ enabled, onToggle, radius, onRadiusChange }: NearbyToggleProps) => (
  <div className="mt-1.5 space-y-1.5">
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <Switch checked={enabled} onCheckedChange={onToggle} className="scale-[0.65] origin-left" />
      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
        <MapPin className="w-3 h-3" /> Nearby airports
      </span>
    </label>
    {enabled && (
      <div className="flex items-center gap-2">
        <Slider
          value={[radius]}
          onValueChange={(v) => onRadiusChange(v[0])}
          min={50}
          max={400}
          step={25}
          className="flex-1"
        />
        <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
          {radius} km
        </span>
      </div>
    )}
  </div>
);

export default NearbyToggle;
