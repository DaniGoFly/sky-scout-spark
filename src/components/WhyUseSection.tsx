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
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-card/30">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center mb-14">
          <span className="text-primary text-xs font-semibold uppercase tracking-[0.15em] mb-3 block">
            Why GoFlyFinder
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
            Why travelers choose us
          </h2>
          <p className="text-muted-foreground text-[15px] max-w-xl mx-auto mt-3 leading-relaxed">
            We make finding cheap flights simple and stress-free
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="text-center p-7 rounded-2xl bg-card/60 hover:bg-card transition-all duration-300 border border-border/30 hover:border-border/50 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/15 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2.5">
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
