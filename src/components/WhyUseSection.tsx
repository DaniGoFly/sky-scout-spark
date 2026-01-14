import { Search, TrendingDown, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Search all in one place",
    description: "Compare prices from hundreds of airlines and travel sites at once.",
  },
  {
    icon: TrendingDown,
    title: "Find the best deals",
    description: "We search for deals so you don't have to. Let us do the hard work.",
  },
  {
    icon: Shield,
    title: "Book with confidence",
    description: "We only work with trusted travel providers you know and trust.",
  },
  {
    icon: Zap,
    title: "Fast and easy",
    description: "Simple search, quick results. Find your flight in seconds.",
  },
];

const WhyUseSection = () => {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why travelers choose us
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We make finding cheap flights simple and stress-free
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="text-center p-6 rounded-2xl bg-card hover:shadow-lg transition-all duration-300 border border-border/50"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUseSection;
