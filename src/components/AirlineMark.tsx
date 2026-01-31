import { useState } from "react";

interface AirlineMarkProps {
  airlineCode: string;
  airlineName?: string;
  logoUrl?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-8 h-8 rounded-lg text-[10px]",
  md: "w-10 h-10 rounded-xl text-xs",
  lg: "w-12 h-12 rounded-xl text-xs",
};

export default function AirlineMark({
  airlineCode,
  airlineName,
  logoUrl,
  size = "lg",
}: AirlineMarkProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const code = (airlineCode || "??").toUpperCase();
  const shouldShowImg = Boolean(logoUrl) && !imgFailed;

  return (
    <div
      className={`${sizeClasses[size]} bg-secondary flex items-center justify-center overflow-hidden relative`}
    >
      <span
        className={`font-semibold text-muted-foreground ${shouldShowImg ? "opacity-0" : "opacity-100"}`}
        aria-hidden={shouldShowImg}
      >
        {code}
      </span>
      {shouldShowImg && (
        <img
          src={logoUrl}
          alt={airlineName || code}
          className="absolute inset-0 w-full h-full object-contain p-1.5"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      )}
    </div>
  );
}