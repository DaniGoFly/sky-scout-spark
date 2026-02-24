import { Slider } from "@/components/ui/slider";

interface TripLengthSliderProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min?: number;
  max?: number;
}

const TripLengthSlider = ({
  value,
  onChange,
  min = 1,
  max = 21,
}: TripLengthSliderProps) => {
  const isSingle = value[0] === value[1];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">Trip length</span>
        <span className="text-[11px] font-semibold text-foreground tabular-nums">
          {isSingle ? `${value[0]} days` : `${value[0]}–${value[1]} days`}
        </span>
      </div>
      <Slider
        value={value}
        onValueChange={(v) => onChange(v as [number, number])}
        min={min}
        max={max}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between text-[9px] text-muted-foreground/60">
        <span>{min} day</span>
        <span>{max} days</span>
      </div>
    </div>
  );
};

export default TripLengthSlider;
