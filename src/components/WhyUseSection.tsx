import { CheckCircle, Plane, MapPin, ShieldCheck, BadgeCheck } from "lucide-react";

const benefits = [
  {
    icon: Plane,
    text: "Compare flights across trusted providers",
  },
  {
    icon: MapPin,
    text: "Find experiences, tours, and attractions instantly",
  },
  {
    icon: BadgeCheck,
    text: "No extra fees — book directly with partners",
  },
  {
    icon: ShieldCheck,
    text: "Secure & traveler-trusted platforms",
  },
];

const WhyUseSection = () => {
  return (
    <section className="py-12 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      
      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-8">
            Why use Sky-Scout?
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl glass hover:shadow-lg transition-all duration-300"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <p className="text-foreground font-medium text-sm">
                  {benefit.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUseSection;
