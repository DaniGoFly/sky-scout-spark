import { Search, ArrowRight, CreditCard } from "lucide-react";

const steps = [
  {
    icon: Search,
    number: "1",
    title: "Search",
    description: "Enter your destination and dates to search hotels",
  },
  {
    icon: ArrowRight,
    number: "2",
    title: "Compare",
    description: "View and compare prices from different booking sites",
  },
  {
    icon: CreditCard,
    number: "3",
    title: "Book",
    description: "Book directly with hotels or travel sites",
  },
];

const HowItWorksHotels = () => {
  return (
    <section className="py-16 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            How it works
          </h2>
          <p className="text-muted-foreground">
            Find your perfect stay in 3 easy steps
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                  <step.icon className="w-7 h-7 text-primary" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksHotels;
