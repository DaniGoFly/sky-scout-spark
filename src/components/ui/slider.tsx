import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-[6px] w-full grow overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.10)" }}>
      <SliderPrimitive.Range className="absolute h-full" style={{ background: "#2F7AF8", borderRadius: "999px" }} />
    </SliderPrimitive.Track>
    {/* Support both single and double thumb */}
    {(Array.isArray(props.value) ? props.value : [props.value ?? props.defaultValue ?? 0]).map((_, index) => (
      <SliderPrimitive.Thumb
        key={index}
        className="block h-5 w-5 rounded-full ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        style={{
          width: 20,
          height: 20,
          background: "#0B1224",
          border: "2px solid rgba(255,255,255,0.85)",
          boxShadow: "none",
        }}
      />
    ))}
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
