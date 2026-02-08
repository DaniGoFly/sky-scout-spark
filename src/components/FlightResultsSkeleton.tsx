import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

const MobileCardSkeleton = () => (
  <div className="bg-card rounded-xl border border-border p-4 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="w-9 h-9 rounded-lg" />
      <Skeleton className="h-4 w-24" />
    </div>
    <Skeleton className="h-5 w-full" />
    <Skeleton className="h-3 w-28" />
    <div className="border-t border-border/40 pt-3">
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-3 w-28 mt-1" />
    </div>
    <div className="flex items-center justify-between border-t border-border/40 pt-3">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-9 w-9 rounded-full" />
    </div>
    <Skeleton className="h-12 w-full rounded-lg" />
  </div>
);

const DesktopCardSkeleton = () => (
  <div className="bg-card rounded-xl border border-border p-5">
    <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 220px" }}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-14" />
          <div className="flex-1">
            <Skeleton className="h-3 w-16 mx-auto mb-1" />
            <Skeleton className="h-0.5 w-full" />
            <Skeleton className="h-3 w-12 mx-auto mt-1" />
          </div>
          <Skeleton className="h-6 w-14" />
        </div>
        <div className="border-t border-border/40 pt-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-14" />
            <div className="flex-1">
              <Skeleton className="h-0.5 w-full" />
            </div>
            <Skeleton className="h-6 w-14" />
          </div>
        </div>
      </div>
      <div className="border-l border-border/40 pl-4 flex flex-col justify-between">
        <div className="flex flex-col items-end">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-14 mt-1" />
        </div>
        <div className="flex items-center gap-2 justify-end mt-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-10 w-[130px] rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

const FlightResultsSkeleton = () => {
  const isMobile = useIsMobile();
  const Card = isMobile ? MobileCardSkeleton : DesktopCardSkeleton;

  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <Card />
        </div>
      ))}
    </div>
  );
};

export default FlightResultsSkeleton;
