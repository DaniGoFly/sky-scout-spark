import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Hotel } from "@/lib/mockHotels";
import { Star, MapPin, Wifi, Car, Dumbbell, Coffee, UtensilsCrossed, Waves, Snowflake, Tv, ExternalLink, Users, Calendar, Check } from "lucide-react";
import { useState } from "react";

// Travelpayouts affiliate marker
const AFFILIATE_MARKER = "485833";

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
    const params = new URLSearchParams();
    params.set('destination', searchParams?.location || hotel.name);
    params.set('checkIn', searchParams?.checkIn || new Date().toISOString().split("T")[0]);
    params.set('checkOut', searchParams?.checkOut || new Date(Date.now() + 86400000).toISOString().split("T")[0]);
    params.set('adults', String(searchParams?.adults || 2));
    params.set('children', String(searchParams?.children || 0));
    params.set('rooms', String(searchParams?.rooms || 1));
    params.set('marker', AFFILIATE_MARKER);
    
    const bookingUrl = `https://search.hotellook.com/?${params.toString()}`;
    window.open(bookingUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <img 
                src={hotel.image} 
                alt={hotel.name}
                className="w-6 h-6 object-cover rounded"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
              />
            </div>
            {hotel.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Image Gallery */}
          <div className="bg-secondary/30 rounded-2xl p-4">
            <div className="relative aspect-video rounded-xl overflow-hidden mb-3">
              <img
                src={hotel.images[selectedImage]}
                alt={hotel.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {hotel.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
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

          {/* Hotel Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">Location</span>
              </div>
              <p className="font-semibold text-foreground text-sm">{hotel.address}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Star className="w-4 h-4" />
                <span className="text-sm font-medium">Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{hotel.rating}</span>
                <span className="text-sm text-muted-foreground">({hotel.reviewCount.toLocaleString()} reviews)</span>
              </div>
            </div>
          </div>

          {/* Star Rating */}
          <div className="flex items-center gap-1">
            {Array.from({ length: hotel.starRating }).map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="ml-2 text-sm text-muted-foreground">{hotel.starRating}-star hotel</span>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              About
            </h4>
            <p className="text-foreground">{hotel.description}</p>
          </div>

          {/* Amenities */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Amenities
            </h4>
            <div className="flex flex-wrap gap-3">
              {hotel.amenities.slice(0, 6).map((amenity) => (
                <div
                  key={amenity}
                  className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg text-sm"
                >
                  {amenityIcons[amenity] || <Check className="w-4 h-4 text-primary" />}
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What's included */}
          <div className="bg-muted/30 rounded-xl p-4">
            <h4 className="font-semibold text-foreground mb-3">What's included</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Free cancellation</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Pay at property</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>No prepayment needed</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Best price guarantee</span>
              </div>
            </div>
          </div>

          {/* Price & Booking */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Price per night</p>
                <p className="text-4xl font-bold text-foreground">${hotel.pricePerNight}</p>
                <p className="text-xs text-muted-foreground mt-1">Includes taxes & fees</p>
              </div>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); handleBookNow(); }}
                className="inline-flex items-center justify-center gap-2 shrink-0 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200"
              >
                View Deal
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            You'll be redirected to complete your booking securely on Hotellook.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HotelDetailsModal;
