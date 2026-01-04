import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Compass, MapPin, Star, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const activities = [
  {
    title: "Eiffel Tower Skip-the-Line Tour",
    location: "Paris, France",
    rating: 4.8,
    reviews: 2453,
    duration: "3 hours",
    price: "$65",
    image: "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=400&h=300&fit=crop",
  },
  {
    title: "Statue of Liberty & Ellis Island",
    location: "New York, USA",
    rating: 4.7,
    reviews: 3821,
    duration: "4 hours",
    price: "$45",
    image: "https://images.unsplash.com/photo-1605130284535-11dd9eedc58a?w=400&h=300&fit=crop",
  },
  {
    title: "Colosseum Underground Tour",
    location: "Rome, Italy",
    rating: 4.9,
    reviews: 1892,
    duration: "3.5 hours",
    price: "$89",
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=300&fit=crop",
  },
  {
    title: "Tokyo Night Food Tour",
    location: "Tokyo, Japan",
    rating: 4.9,
    reviews: 1234,
    duration: "4 hours",
    price: "$120",
    image: "https://images.unsplash.com/photo-1554797589-7241bb691973?w=400&h=300&fit=crop",
  },
  {
    title: "Grand Canyon Helicopter Ride",
    location: "Arizona, USA",
    rating: 4.8,
    reviews: 987,
    duration: "2 hours",
    price: "$299",
    image: "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=400&h=300&fit=crop",
  },
  {
    title: "Santorini Wine Tasting Tour",
    location: "Santorini, Greece",
    rating: 4.7,
    reviews: 654,
    duration: "5 hours",
    price: "$95",
    image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=400&h=300&fit=crop",
  },
];

const Activities = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/20" />
        
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Compass className="w-4 h-4" />
              <span className="text-sm font-medium">Tours & Activities</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Discover Amazing Experiences
            </h1>
            
            <p className="text-muted-foreground mb-8 text-lg max-w-2xl mx-auto">
              Explore tours, attractions, and activities at your destination. Make memories that last a lifetime.
            </p>

            {/* Search Form */}
            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-lg max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Where are you going?"
                    className="pl-10 h-12"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="hero" size="lg">
                  <Compass className="w-5 h-5 mr-2" />
                  Explore
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Activities Grid */}
      <section className="py-8 px-4 flex-1">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Popular Activities Worldwide
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((activity) => (
              <div
                key={activity.title}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer"
              >
                <div className="relative aspect-[4/3]">
                  <img
                    src={activity.image}
                    alt={activity.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1 text-muted-foreground text-sm mb-2">
                    <MapPin className="w-3 h-3" />
                    {activity.location}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">{activity.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {activity.rating} ({activity.reviews.toLocaleString()})
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {activity.duration}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">{activity.price}</span>
                    <Button variant="outline" size="sm">Book Now</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Activities;
