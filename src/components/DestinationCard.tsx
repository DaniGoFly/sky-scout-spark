import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DestinationCardProps {
  city: string;
  country: string;
  price: number;
  image: string;
}

const DestinationCard = ({ city, country, price, image }: DestinationCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    // Navigate to flight results with pre-filled destination
    navigate(`/flights/results?to=${encodeURIComponent(city)}&autoSearch=true`);
  };

  return (
    <div 
      onClick={handleClick}
      className="group relative overflow-hidden rounded-3xl cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-card-hover"
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={`${city}, ${country}`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h3 className="text-2xl font-bold text-primary-foreground mb-1">{city}</h3>
        <p className="text-primary-foreground/70 text-sm font-medium mb-3">{country}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-primary-foreground/60 text-sm">From</span>
            <span className="text-3xl font-extrabold text-primary-foreground">${price}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0 translate-x-2">
            <ArrowUpRight className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>
      </div>
      <div className="absolute top-4 right-4 bg-primary/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-bold text-primary-foreground uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
        Explore
      </div>
    </div>
  );
};

export default DestinationCard;