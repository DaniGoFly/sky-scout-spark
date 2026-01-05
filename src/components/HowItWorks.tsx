import { Search, ListFilter, ExternalLink } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "1",
    title: "Search",
    description: "Enter your travel details and we'll scan hundreds of airlines and travel sites",
  },
  {
    icon: ListFilter,
    step: "2",
    title: "Compare",
    description: "Filter and sort results by price, duration, or stops to find your perfect flight",
  },
  {
    icon: ExternalLink,
    step: "3",
    title: "Book",
    description: "Click to book directly with the airline or travel provider — we never add fees",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-16 px-4 bg-secondary/30">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            How it works
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Find the best flight deals in three simple steps
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative text-center">
              {/* Connector line - only on desktop */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
              )}
              
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
                <step.icon className="w-8 h-8 text-primary" />
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                  {step.step}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
