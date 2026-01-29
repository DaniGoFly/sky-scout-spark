import { useState } from "react";

export default function AirlineMark(props: {
  airlineCode: string;
  airlineName?: string;
  logoUrl?: string;
}) {
  const { airlineCode, airlineName, logoUrl } = props;
  const [imgFailed, setImgFailed] = useState(false);

  const code = (airlineCode || "??").toUpperCase();
  const shouldShowImg = Boolean(logoUrl) && !imgFailed;

  return (
    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center overflow-hidden relative">
      <span
        className={`text-xs font-semibold text-muted-foreground ${shouldShowImg ? "opacity-0" : "opacity-100"}`}
        aria-hidden={shouldShowImg}
      >
        {code}
      </span>
      {shouldShowImg && (
        <img
          src={logoUrl}
          alt={airlineName || code}
          className="absolute inset-0 w-full h-full object-contain p-2"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      )}
    </div>
  );
}
