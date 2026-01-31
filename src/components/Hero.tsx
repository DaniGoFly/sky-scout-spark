import { useState, useCallback } from "react";
import { Plane, Shield, Zap, TrendingDown } from "lucide-react";
import FlightSearchForm from "./FlightSearchForm";

const trustBadges = [
  { icon: Shield, text: "Trusted providers" },
  { icon: TrendingDown, text: "Best prices" },
  { icon: Zap, text: "Instant results" },
];

const Hero = () => {
  return (
    <section className="relative min-h-screen flex flex-col">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/30" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Plane className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Flight Search</span>
            </div>
          </div>

          {/* Hero Text */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight tracking-tight">
              Find your next
              <span className="block text-primary">adventure</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Compare prices from hundreds of airlines and book with confidence
            </p>
          </div>

          {/* Flight Search Form */}
          <div className="mb-12">
            <FlightSearchForm />
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            {trustBadges.map((badge, index) => (
              <div key={index} className="flex items-center gap-2 text-muted-foreground">
                <badge.icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{badge.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
