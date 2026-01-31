import FlightSearchForm from "./FlightSearchForm";
import FlightPathsBackground from "./FlightPathsBackground";
import { Plane } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Base gradient background - Blue/Cyan theme for Flights */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-sky-500/10" />
      
      {/* Floating orbs - Sky blue theme */}
      <div className="absolute top-20 left-[10%] w-96 h-96 bg-sky-500/20 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-20 right-[10%] w-80 h-80 bg-cyan-400/15 rounded-full blur-[100px] animate-float-delayed" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[150px]" />
      
      {/* Subtle floating planes pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Plane className="absolute top-[15%] left-[5%] w-6 h-6 text-sky-500/10 rotate-45" />
        <Plane className="absolute top-[25%] right-[8%] w-8 h-8 text-cyan-400/10 rotate-12" />
        <Plane className="absolute bottom-[30%] left-[12%] w-5 h-5 text-sky-400/10 -rotate-12" />
        <Plane className="absolute top-[60%] right-[15%] w-7 h-7 text-sky-500/10 rotate-45" />
        <Plane className="absolute bottom-[20%] right-[25%] w-4 h-4 text-cyan-500/10 rotate-90" />
      </div>
      
      {/* Flight paths background */}
      <FlightPathsBackground />
      
      {/* Subtle noise overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Hero Text */}
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight">
              <span className="text-foreground">Find your next</span>
              <br />
              <span className="bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">adventure</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Compare prices from hundreds of airlines and book your dream trip in seconds
            </p>
          </div>

          {/* Flight Search Form */}
          <div className="animate-fade-in glow-primary rounded-2xl" style={{ animationDelay: '0.1s' }}>
            <FlightSearchForm />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
