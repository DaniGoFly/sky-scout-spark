import { Star, MapPin } from "lucide-react";
import { Hotel } from "@/lib/mockHotels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HotelCardProps {
  hotel: Hotel;
  onViewDetails: (hotel: Hotel) => void;
}

const HotelCard = ({ hotel, onViewDetails }: HotelCardProps) => {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="flex flex-col md:flex-row">
        {/* Image */}
        <div className="relative w-full md:w-64 h-48 md:h-auto flex-shrink-0">
          <img
            src={hotel.image}
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
          {hotel.featured && (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
              Featured
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {Array.from({ length: hotel.starRating }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <h3 className="font-semibold text-lg text-foreground">{hotel.name}</h3>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-lg">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-semibold">{hotel.rating}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {hotel.reviewCount.toLocaleString()} reviews
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-muted-foreground text-sm mt-2">
              <MapPin className="w-4 h-4" />
              <span>{hotel.address}</span>
            </div>

            <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
              {hotel.description}
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              {hotel.amenities.slice(0, 4).map((amenity) => (
                <Badge key={amenity} variant="secondary" className="text-xs">
                  {amenity}
                </Badge>
              ))}
              {hotel.amenities.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{hotel.amenities.length - 4} more
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-end justify-between mt-4 pt-4 border-t border-border">
            <div>
              <p className="text-2xl font-bold text-foreground">
                ${hotel.pricePerNight}
              </p>
              <p className="text-xs text-muted-foreground">per night</p>
            </div>
            <Button onClick={() => onViewDetails(hotel)}>
              View Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
