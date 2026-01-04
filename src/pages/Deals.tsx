import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tag, Plane, Hotel, Car, Percent } from "lucide-react";
import { Link } from "react-router-dom";

const deals = [
  {
    title: "New York City Escape",
    type: "Flight + Hotel",
    discount: "25% OFF",
    originalPrice: "$899",
    price: "$674",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop",
    icon: Plane,
  },
  {
    title: "Paris Romantic Getaway",
    type: "Flight + Hotel",
    discount: "30% OFF",
    originalPrice: "$1,299",
    price: "$909",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop",
    icon: Hotel,
  },
  {
    title: "California Road Trip",
    type: "Car Rental",
    discount: "20% OFF",
    originalPrice: "$350",
    price: "$280",
    image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop",
    icon: Car,
  },
  {
    title: "Tokyo Adventure",
    type: "Flight + Hotel",
    discount: "15% OFF",
    originalPrice: "$1,599",
    price: "$1,359",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop",
    icon: Plane,
  },
];

const Deals = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/20" />
        
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Tag className="w-4 h-4" />
              <span className="text-sm font-medium">Exclusive Deals</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Today's Best Travel Deals
            </h1>
            
            <p className="text-muted-foreground mb-8 text-lg max-w-2xl mx-auto">
              Discover handpicked offers with incredible savings on flights, hotels, and car rentals.
            </p>
          </div>
        </div>
      </section>

      {/* Deals Grid */}
      <section className="py-8 px-4 flex-1">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {deals.map((deal) => (
              <div
                key={deal.title}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="relative aspect-[4/3]">
                  <img
                    src={deal.image}
                    alt={deal.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-destructive text-destructive-foreground text-sm font-semibold flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    {deal.discount}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <deal.icon className="w-4 h-4" />
                    {deal.type}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{deal.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground line-through text-sm">{deal.originalPrice}</span>
                    <span className="text-xl font-bold text-primary">{deal.price}</span>
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    View Deal
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Newsletter CTA */}
          <div className="mt-16 bg-gradient-to-r from-primary/10 to-secondary/20 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-foreground mb-2">Never Miss a Deal</h3>
            <p className="text-muted-foreground mb-6">Get exclusive offers delivered straight to your inbox.</p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button variant="hero">Subscribe</Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Deals;
