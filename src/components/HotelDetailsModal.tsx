import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Hotel } from "@/lib/mockHotels";
import { Star, MapPin, Wifi, Car, Dumbbell, Coffee, UtensilsCrossed, Waves, Snowflake, Tv, ExternalLink } from "lucide-react";
import { useState } from "react";
import { generateHotelAffiliateUrl } from "@/lib/affiliateLinks";

interface HotelDetailsModalProps {
  hotel: Hotel | null;
  open: boolean;
  onClose: () => void;
  searchParams?: {
    location: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    rooms: number;
  };
}

const amenityIcons: Record<string, React.ReactNode> = {
  "Free WiFi": <Wifi className="w-4 h-4" />,
  "Parking": <Car className="w-4 h-4" />,
  "Fitness Center": <Dumbbell className="w-4 h-4" />,
  "Breakfast Included": <Coffee className="w-4 h-4" />,
  "Restaurant": <UtensilsCrossed className="w-4 h-4" />,
  "Swimming Pool": <Waves className="w-4 h-4" />,
  "Air Conditioning": <Snowflake className="w-4 h-4" />,
  "TV": <Tv className="w-4 h-4" />,
};

const HotelDetailsModal = ({ hotel, open, onClose, searchParams }: HotelDetailsModalProps) => {
  const [selectedImage, setSelectedImage] = useState(0);

  if (!hotel) return null;

  const handleBookNow = () => {
    const bookingUrl = generateHotelAffiliateUrl({
      locationName: searchParams?.location || hotel.name,
      checkIn: searchParams?.checkIn || new Date().toISOString().split("T")[0],
      checkOut: searchParams?.checkOut || new Date(Date.now() + 86400000).toISOString().split("T")[0],
      adults: searchParams?.adults || 2,
      children: searchParams?.children || 0,
      rooms: searchParams?.rooms || 1,
    });
    window.open(bookingUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {Array.from({ length: hotel.starRating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <DialogTitle className="text-2xl">{hotel.name}</DialogTitle>
                <div className="flex items-center gap-1 text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>{hotel.address}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-2 rounded-lg">
                <Star className="w-5 h-5 fill-current" />
                <span className="font-bold text-lg">{hotel.rating}</span>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {/* Image Gallery */}
            <div className="space-y-3">
              <div className="relative aspect-video rounded-xl overflow-hidden">
                <img
                  src={hotel.images[selectedImage]}
                  alt={hotel.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {hotel.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? "border-primary"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${hotel.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold text-lg mb-2">About this hotel</h3>
              <p className="text-muted-foreground">{hotel.description}</p>
            </div>

            {/* Amenities */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {hotel.amenities.map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-2 rounded-lg"
                  >
                    {amenityIcons[amenity] || <span className="w-4 h-4">✓</span>}
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews Summary */}
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-foreground">{hotel.rating}</span>
                    <div>
                      <p className="font-medium text-foreground">
                        {hotel.rating >= 4.5 ? "Excellent" : hotel.rating >= 4 ? "Very Good" : "Good"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Based on {hotel.reviewCount.toLocaleString()} reviews
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price & Booking */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Price per night</p>
                  <p className="text-4xl font-bold text-foreground">
                    ${hotel.pricePerNight}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Includes taxes & fees</p>
                </div>
                <Button 
                  size="lg" 
                  variant="hero" 
                  onClick={handleBookNow}
                  className="gap-2"
                >
                  View Deal
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to our travel partner (Hotellook) to complete your booking securely.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HotelDetailsModal;
