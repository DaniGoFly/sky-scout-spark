interface DestinationCardProps {
  city: string;
  country: string;
  price: number;
  image: string;
}

const DestinationCard = ({ city, country, price, image }: DestinationCardProps) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={`${city}, ${country}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="text-xl font-bold text-primary-foreground">{city}</h3>
        <p className="text-primary-foreground/80 text-sm mb-2">{country}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-primary-foreground/70 text-sm">From</span>
          <span className="text-2xl font-bold text-primary-foreground">${price}</span>
        </div>
      </div>
      <div className="absolute top-3 right-3 bg-primary px-3 py-1 rounded-full text-xs font-semibold text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        View Flights
      </div>
    </div>
  );
};

export default DestinationCard;
