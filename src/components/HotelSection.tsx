import { Button } from "@/components/ui/button";
import { Building2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const destinations = [
  { city: "New York", count: "12,500+", image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=3840&auto=format&fit=crop&q=90" },
  { city: "London", count: "9,800+", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=3840&auto=format&fit=crop&q=90" },
  { city: "Paris", count: "8,200+", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=3840&auto=format&fit=crop&q=90" },
  { city: "Tokyo", count: "7,500+", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=3840&auto=format&fit=crop&q=90" },
];

const HotelSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleDestinationClick = (city: string) => {
    navigate(`/hotels?city=${encodeURIComponent(city)}&autoSearch=true`);
  };

  return (
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Building2 className="w-4 h-4" />
              <span>{t("hotel.title")}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              {t("hotel.find_stay")}
            </h2>
            <p className="text-muted-foreground">
              {t("hotel.compare_prices")}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/hotels")} className="w-fit">
            {t("hotel.search_all")}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {destinations.map((destination) => (
            <div
              key={destination.city}
              onClick={() => handleDestinationClick(destination.city)}
              className="group relative rounded-xl overflow-hidden aspect-[4/3] cursor-pointer"
            >
              <img src={destination.image} alt={destination.city} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-lg font-bold text-white">{destination.city}</h3>
                <p className="text-white/70 text-sm">{t("hotel.hotels_count", { count: destination.count })}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HotelSection;
