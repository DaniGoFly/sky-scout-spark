import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Star } from "lucide-react";

interface HotelFiltersProps {
  priceRange: [number, number];
  maxPrice: number;
  onPriceRangeChange: (range: [number, number]) => void;
  minRating: number;
  onMinRatingChange: (rating: number) => void;
  starRating: number[];
  onStarRatingChange: (stars: number[]) => void;
}

const HotelFilters = ({
  priceRange,
  maxPrice,
  onPriceRangeChange,
  minRating,
  onMinRatingChange,
  starRating,
  onStarRatingChange,
}: HotelFiltersProps) => {
  const handleStarToggle = (star: number) => {
    if (starRating.includes(star)) {
      onStarRatingChange(starRating.filter((s) => s !== star));
    } else {
      onStarRatingChange([...starRating, star]);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-6">
      <h3 className="font-semibold text-foreground">Filters</h3>

      {/* Price Range */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Price per night</Label>
        <Slider
          value={[priceRange[0], priceRange[1]]}
          min={0}
          max={maxPrice}
          step={10}
          onValueChange={(value) => onPriceRangeChange([value[0], value[1]])}
          className="mt-2"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>${priceRange[0]}</span>
          <span>${priceRange[1]}</span>
        </div>
      </div>

      {/* Star Rating */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Star Rating</Label>
        <div className="space-y-2">
          {[5, 4, 3].map((star) => (
            <div key={star} className="flex items-center space-x-2">
              <Checkbox
                id={`star-${star}`}
                checked={starRating.includes(star)}
                onCheckedChange={() => handleStarToggle(star)}
              />
              <label
                htmlFor={`star-${star}`}
                className="flex items-center gap-1 text-sm cursor-pointer"
              >
                {Array.from({ length: star }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                ))}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Guest Rating */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Guest Rating</Label>
        <div className="space-y-2">
          {[
            { value: 4.5, label: "Excellent (4.5+)" },
            { value: 4, label: "Very Good (4+)" },
            { value: 3.5, label: "Good (3.5+)" },
            { value: 0, label: "All" },
          ].map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`rating-${option.value}`}
                checked={minRating === option.value}
                onCheckedChange={() => onMinRatingChange(option.value)}
              />
              <label
                htmlFor={`rating-${option.value}`}
                className="text-sm cursor-pointer"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HotelFilters;
