import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface HotelFiltersProps {
  priceRange: [number, number];
  maxPrice: number;
  onPriceRangeChange: (range: [number, number]) => void;
  minRating: number;
  onMinRatingChange: (rating: number) => void;
  starRating: number[];
  onStarRatingChange: (stars: number[]) => void;
  amenities?: string[];
  onAmenitiesChange?: (amenities: string[]) => void;
}

const STAR_OPTIONS = [3, 4, 5];
const RATING_OPTIONS = [
  { value: 0, label: "Any" },
  { value: 8, label: "8+" },
  { value: 9, label: "9+" },
];

const AMENITY_OPTIONS = [
  "Free WiFi",
  "Fitness Center",
  "Swimming Pool",
  "Breakfast Included",
  "Parking",
  "Spa & Wellness",
  "Pet Friendly",
  "Air Conditioning",
  "Restaurant",
  "Airport Shuttle",
];

const HotelFilters = ({
  priceRange,
  maxPrice,
  onPriceRangeChange,
  minRating,
  onMinRatingChange,
  starRating,
  onStarRatingChange,
  amenities = [],
  onAmenitiesChange,
}: HotelFiltersProps) => {
  const handleStarToggle = (star: number) => {
    if (starRating.includes(star)) {
      onStarRatingChange(starRating.filter((s) => s !== star));
    } else {
      onStarRatingChange([...starRating, star]);
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    if (!onAmenitiesChange) return;
    if (amenities.includes(amenity)) {
      onAmenitiesChange(amenities.filter((a) => a !== amenity));
    } else {
      onAmenitiesChange([...amenities, amenity]);
    }
  };

  const handleReset = () => {
    onPriceRangeChange([0, maxPrice]);
    onMinRatingChange(0);
    onStarRatingChange([]);
    if (onAmenitiesChange) {
      onAmenitiesChange([]);
    }
  };

  const hasActiveFilters = starRating.length > 0 || minRating > 0 || amenities.length > 0 ||
    priceRange[0] !== 0 || priceRange[1] !== maxPrice;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
        )}
      </div>

      {/* Price Range - Dual Handle */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Price per night</h4>
        <div className="pt-2">
          <Slider
            value={priceRange}
            onValueChange={(value) => onPriceRangeChange([value[0], value[1]])}
            min={0}
            max={maxPrice}
            step={10}
            className="w-full"
          />
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-foreground">${priceRange[0]}</span>
          <span className="text-muted-foreground">—</span>
          <span className="font-medium text-foreground">${priceRange[1]}</span>
        </div>
      </div>

      {/* Star Rating */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Star rating</h4>
        <div className="flex gap-2">
          {STAR_OPTIONS.map((star) => (
            <button
              key={star}
              onClick={() => handleStarToggle(star)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                starRating.includes(star)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {star}★
            </button>
          ))}
        </div>
      </div>

      {/* Guest Rating */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Guest rating</h4>
        <div className="flex gap-2">
          {RATING_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onMinRatingChange(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                minRating === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amenities */}
      {onAmenitiesChange && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Amenities</h4>
          <div className="space-y-2">
            {AMENITY_OPTIONS.map((amenity) => (
              <div key={amenity} className="flex items-center space-x-2">
                <Checkbox
                  id={`amenity-${amenity}`}
                  checked={amenities.includes(amenity)}
                  onCheckedChange={() => handleAmenityToggle(amenity)}
                />
                <Label
                  htmlFor={`amenity-${amenity}`}
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  {amenity}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelFilters;
