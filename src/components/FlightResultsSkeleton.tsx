import { Skeleton } from "@/components/ui/skeleton";

const FlightCardSkeleton = () => (
  <div className="bg-card rounded-2xl p-6 shadow-card">
    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
      {/* Airline */}
      <div className="flex items-center gap-4 lg:w-48">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <Skeleton className="h-5 w-28" />
      </div>

      {/* Flight Times */}
      <div className="flex-1 flex items-center gap-4">
        <div className="text-center">
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-4 w-10" />
        </div>

        <div className="flex-1 flex flex-col items-center px-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-0.5 w-full" />
          <Skeleton className="h-4 w-16 mt-2" />
        </div>

        <div className="text-center">
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-4 w-10" />
        </div>
      </div>

      {/* Amenities */}
      <div className="hidden md:flex items-center gap-4">
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Price & CTA */}
      <div className="flex items-center justify-between lg:flex-col lg:items-end gap-3">
        <div className="text-right">
          <Skeleton className="h-4 w-12 mb-2" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-11 w-28 rounded-xl" />
      </div>
    </div>
  </div>
);

const FlightResultsSkeleton = () => {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <FlightCardSkeleton />
        </div>
      ))}
    </div>
  );
};

export default FlightResultsSkeleton;
