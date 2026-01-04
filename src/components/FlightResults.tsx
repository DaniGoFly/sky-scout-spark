import { useState } from "react";
import { Filter, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import FlightCard from "./FlightCard";

const flights = [
  {
    id: 1,
    airline: "British Airways",
    airlineLogo: "https://logo.clearbit.com/britishairways.com",
    departureTime: "08:30",
    arrivalTime: "11:45",
    departureCode: "JFK",
    arrivalCode: "LHR",
    duration: "7h 15m",
    stops: "Direct",
    price: 489,
    featured: true,
  },
  {
    id: 2,
    airline: "Delta Airlines",
    airlineLogo: "https://logo.clearbit.com/delta.com",
    departureTime: "14:20",
    arrivalTime: "04:30",
    departureCode: "JFK",
    arrivalCode: "LHR",
    duration: "8h 10m",
    stops: "Direct",
    price: 412,
    featured: false,
  },
  {
    id: 3,
    airline: "Virgin Atlantic",
    airlineLogo: "https://logo.clearbit.com/virginatlantic.com",
    departureTime: "19:00",
    arrivalTime: "07:15",
    departureCode: "JFK",
    arrivalCode: "LHR",
    duration: "7h 15m",
    stops: "Direct",
    price: 538,
    featured: false,
  },
  {
    id: 4,
    airline: "American Airlines",
    airlineLogo: "https://logo.clearbit.com/aa.com",
    departureTime: "22:15",
    arrivalTime: "10:45",
    departureCode: "JFK",
    arrivalCode: "LHR",
    duration: "7h 30m",
    stops: "Direct",
    price: 445,
    featured: false,
  },
];

const FlightResults = () => {
  const [sortBy, setSortBy] = useState("recommended");

  return (
    <section className="py-16 px-4 bg-secondary/30">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              New York → London
            </h2>
            <p className="text-muted-foreground">
              Feb 15 - Feb 22, 2026 • 1 traveler
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            <Button variant="outline" className="gap-2">
              <ArrowUpDown className="w-4 h-4" />
              Sort: {sortBy === "recommended" ? "Recommended" : "Price"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {flights.map((flight, index) => (
            <div
              key={flight.id}
              className="opacity-0 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
            >
              <FlightCard {...flight} />
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button variant="heroOutline" size="lg">
            Show More Flights
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FlightResults;
