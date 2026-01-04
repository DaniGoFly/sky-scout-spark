import { useState, useMemo } from "react";
import { Hotel, sortHotels, filterHotels } from "@/lib/mockHotels";
import HotelCard from "./HotelCard";
import HotelFilters from "./HotelFilters";
import HotelDetailsModal from "./HotelDetailsModal";
import { Button } from "@/components/ui/button";
import { Loader2, SlidersHorizontal, X } from "lucide-react";

interface HotelResultsProps {
  hotels: Hotel[];
  isLoading: boolean;
  searchParams: {
    destination: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    rooms: number;
  } | null;
}

const HotelResults = ({ hotels, isLoading, searchParams }: HotelResultsProps) => {
  const [sortBy, setSortBy] = useState<"recommended" | "price" | "rating">("recommended");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [minRating, setMinRating] = useState(0);
  const [starRating, setStarRating] = useState<number[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const maxPrice = useMemo(() => {
    if (hotels.length === 0) return 1000;
    return Math.ceil(Math.max(...hotels.map((h) => h.pricePerNight)) / 100) * 100;
  }, [hotels]);

  const filteredAndSortedHotels = useMemo(() => {
    const filtered = filterHotels(hotels, {
      priceRange,
      minRating,
      starRating,
      amenities: [],
    });
    return sortHotels(filtered, sortBy);
  }, [hotels, sortBy, priceRange, minRating, starRating]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Searching hotels...</p>
        <p className="text-sm text-muted-foreground mt-1">
          Finding the best deals in {searchParams?.destination}
        </p>
      </div>
    );
  }

  if (hotels.length === 0) {
    return null;
  }

  return (
    <div className="py-8">
      {/* Results Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Hotels in {searchParams?.destination}
          </h2>
          <p className="text-muted-foreground">
            {filteredAndSortedHotels.length} of {hotels.length} properties found
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="md:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
          </Button>

          <div className="flex gap-2">
            {(["recommended", "price", "rating"] as const).map((option) => (
              <Button
                key={option}
                variant={sortBy === option ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy(option)}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filters Sidebar - Desktop */}
        <div className="hidden md:block w-72 flex-shrink-0">
          <HotelFilters
            priceRange={priceRange}
            maxPrice={maxPrice}
            onPriceRangeChange={setPriceRange}
            minRating={minRating}
            onMinRatingChange={setMinRating}
            starRating={starRating}
            onStarRatingChange={setStarRating}
          />
        </div>

        {/* Mobile Filters */}
        {showFilters && (
          <div className="fixed inset-0 z-50 bg-background md:hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">Filters</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto h-[calc(100vh-60px)]">
              <HotelFilters
                priceRange={priceRange}
                maxPrice={maxPrice}
                onPriceRangeChange={setPriceRange}
                minRating={minRating}
                onMinRatingChange={setMinRating}
                starRating={starRating}
                onStarRatingChange={setStarRating}
              />
              <Button
                className="w-full mt-4"
                onClick={() => setShowFilters(false)}
              >
                Show {filteredAndSortedHotels.length} results
              </Button>
            </div>
          </div>
        )}

        {/* Hotel Cards */}
        <div className="flex-1 space-y-4">
          {filteredAndSortedHotels.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <p className="text-muted-foreground">
                No hotels match your filters. Try adjusting your criteria.
              </p>
            </div>
          ) : (
            filteredAndSortedHotels.map((hotel) => (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
                onViewDetails={setSelectedHotel}
              />
            ))
          )}
        </div>
      </div>

      {/* Hotel Details Modal */}
      <HotelDetailsModal
        hotel={selectedHotel}
        open={!!selectedHotel}
        onClose={() => setSelectedHotel(null)}
      />
    </div>
  );
};

export default HotelResults;
