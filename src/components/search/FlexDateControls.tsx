import { Minus, Plus } from "lucide-react";

interface FlexDateControlsProps {
  before: number;
  after: number;
  onBeforeChange: (v: number) => void;
  onAfterChange: (v: number) => void;
  max?: number;
}

const Stepper = ({
  value,
  onChange,
  max = 7,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) => (
  <div className="flex items-center gap-0.5">
    <button
      type="button"
      onClick={() => onChange(Math.max(0, value - 1))}
      disabled={value <= 0}
      className="w-5 h-5 rounded flex items-center justify-center bg-secondary hover:bg-secondary/80 text-muted-foreground disabled:opacity-30 transition-colors"
    >
      <Minus className="w-2.5 h-2.5" />
    </button>
    <span className="text-[11px] font-medium text-foreground w-4 text-center tabular-nums">
      {value}
    </span>
    <button
      type="button"
      onClick={() => onChange(Math.min(max, value + 1))}
      disabled={value >= max}
      className="w-5 h-5 rounded flex items-center justify-center bg-secondary hover:bg-secondary/80 text-muted-foreground disabled:opacity-30 transition-colors"
    >
      <Plus className="w-2.5 h-2.5" />
    </button>
  </div>
);

const FlexDateControls = ({
  before,
  after,
  onBeforeChange,
  onAfterChange,
  max = 7,
}: FlexDateControlsProps) => {
  if (before === 0 && after === 0) {
    return (
      <button
        type="button"
        onClick={() => onAfterChange(1)}
        className="text-[10px] text-primary/70 hover:text-primary transition-colors mt-1"
      >
        ± Flex dates
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="flex items-center gap-0.5">
        <span className="text-[10px] text-muted-foreground">−</span>
        <Stepper value={before} onChange={onBeforeChange} max={max} />
      </div>
      <span className="text-[10px] text-muted-foreground">/</span>
      <div className="flex items-center gap-0.5">
        <span className="text-[10px] text-muted-foreground">+</span>
        <Stepper value={after} onChange={onAfterChange} max={max} />
      </div>
      <span className="text-[10px] text-muted-foreground">days</span>
    </div>
  );
};

export default FlexDateControls;
