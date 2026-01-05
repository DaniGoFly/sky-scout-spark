import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Compass, MapPin, Star, Clock, Search, Info, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  title: string;
  location: string;
  rating: number;
  reviews: number;
  duration: string;
  price: string;
  priceNum: number;
  image: string;
  category: string;
  description: string;
}

const allActivities: Activity[] = [
  {
    id: "1",
    title: "Eiffel Tower Skip-the-Line Tour",
    location: "Paris, France",
    rating: 4.8,
    reviews: 2453,
    duration: "3 hours",
    price: "$65",
    priceNum: 65,
    image: "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=400&h=300&fit=crop",
    category: "Landmarks",
    description: "Skip the long lines and enjoy exclusive access to the Eiffel Tower with a knowledgeable guide.",
  },
  {
    id: "2",
    title: "Statue of Liberty & Ellis Island",
    location: "New York, USA",
    rating: 4.7,
    reviews: 3821,
    duration: "4 hours",
    price: "$45",
    priceNum: 45,
    image: "https://images.unsplash.com/photo-1605130284535-11dd9eedc58a?w=400&h=300&fit=crop",
    category: "Landmarks",
    description: "Explore America's most iconic landmark with ferry access and audio guide included.",
  },
  {
    id: "3",
    title: "Colosseum Underground Tour",
    location: "Rome, Italy",
    rating: 4.9,
    reviews: 1892,
    duration: "3.5 hours",
    price: "$89",
    priceNum: 89,
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=300&fit=crop",
    category: "History",
    description: "Discover the hidden underground chambers where gladiators prepared for battle.",
  },
  {
    id: "4",
    title: "Tokyo Night Food Tour",
    location: "Tokyo, Japan",
    rating: 4.9,
    reviews: 1234,
    duration: "4 hours",
    price: "$120",
    priceNum: 120,
    image: "https://images.unsplash.com/photo-1554797589-7241bb691973?w=400&h=300&fit=crop",
    category: "Food & Drink",
    description: "Taste authentic Japanese street food in Tokyo's vibrant nightlife districts.",
  },
  {
    id: "5",
    title: "Grand Canyon Helicopter Ride",
    location: "Arizona, USA",
    rating: 4.8,
    reviews: 987,
    duration: "2 hours",
    price: "$299",
    priceNum: 299,
    image: "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=400&h=300&fit=crop",
    category: "Adventure",
    description: "Soar above one of the world's natural wonders with breathtaking aerial views.",
  },
  {
    id: "6",
    title: "Santorini Wine Tasting Tour",
    location: "Santorini, Greece",
    rating: 4.7,
    reviews: 654,
    duration: "5 hours",
    price: "$95",
    priceNum: 95,
    image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=400&h=300&fit=crop",
    category: "Food & Drink",
    description: "Sample local wines at scenic vineyards overlooking the stunning Aegean Sea.",
  },
  {
    id: "7",
    title: "Barcelona Gaudi Walking Tour",
    location: "Barcelona, Spain",
    rating: 4.8,
    reviews: 1567,
    duration: "3 hours",
    price: "$55",
    priceNum: 55,
    image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=300&fit=crop",
    category: "History",
    description: "Explore the masterpieces of Antoni Gaudi including Casa Batlló and La Sagrada Familia.",
  },
  {
    id: "8",
    title: "Dubai Desert Safari",
    location: "Dubai, UAE",
    rating: 4.6,
    reviews: 2341,
    duration: "6 hours",
    price: "$85",
    priceNum: 85,
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop",
    category: "Adventure",
    description: "Experience dune bashing, camel rides, and a traditional BBQ dinner under the stars.",
  },
];

const categories = ["All", "Landmarks", "History", "Food & Drink", "Adventure"];

const Activities = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const filteredActivities = allActivities.filter((activity) => {
    const matchesSearch = searchQuery
      ? activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.location.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesCategory = selectedCategory === "All" || activity.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a destination or activity");
      return;
    }
    setIsLoading(true);
    setHasSearched(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
  };

  const handleBookActivity = (activity: Activity) => {
    toast.success(`Booking "${activity.title}". You'll receive a confirmation email shortly.`);
  };

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
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                  <Input
                    placeholder="Where are you going?"
                    className="pl-10 h-12"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <Button 
                  variant="hero" 
                  size="lg"
                  onClick={handleSearch}
                  disabled={isLoading}
                >
                  <Search className="w-5 h-5 mr-2" />
                  {isLoading ? "Searching..." : "Explore"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-4 px-4">
        <div className="container mx-auto">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="rounded-full"
              >
                {selectedCategory === category && <Check className="w-4 h-4 mr-1" />}
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Activities Grid */}
      <section className="py-8 px-4 flex-1">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            {hasSearched 
              ? `${filteredActivities.length} activities found${searchQuery ? ` for "${searchQuery}"` : ""}`
              : "Popular Activities Worldwide"
            }
          </h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredActivities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
                >
                  <div className="relative aspect-[4/3]">
                    <img
                      src={activity.image}
                      alt={activity.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium">
                      {activity.category}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1 text-muted-foreground text-sm mb-2">
                      <MapPin className="w-3 h-3" />
                      {activity.location}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">{activity.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{activity.description}</p>
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
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-xl font-bold text-primary">{activity.price}</span>
                      <Button 
                        size="sm"
                        onClick={() => handleBookActivity(activity)}
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No activities found</h3>
              <p className="text-muted-foreground">Try adjusting your search or category filter</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Activities;
