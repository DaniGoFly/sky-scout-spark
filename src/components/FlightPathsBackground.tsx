import { useEffect, useState } from "react";

const FlightPathsBackground = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* SVG Flight Paths */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradient for paths */}
          <linearGradient id="pathGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(265 90% 65%)" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(265 90% 65%)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(200 100% 60%)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="pathGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(200 100% 60%)" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(200 100% 60%)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(265 90% 65%)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="pathGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(265 90% 65%)" stopOpacity="0" />
            <stop offset="30%" stopColor="hsl(280 80% 60%)" stopOpacity="0.25" />
            <stop offset="70%" stopColor="hsl(200 100% 60%)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(200 100% 60%)" stopOpacity="0" />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Animated dash pattern */}
          <pattern id="movingDots" patternUnits="userSpaceOnUse" width="20" height="4">
            <circle cx="2" cy="2" r="1.5" fill="currentColor" opacity="0.6" />
          </pattern>
        </defs>

        {/* Flight path 1 - Large arc from left to right */}
        <path
          d="M -100 600 Q 400 100 720 300 T 1540 200"
          fill="none"
          stroke="url(#pathGradient1)"
          strokeWidth="2"
          strokeDasharray="8 12"
          className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}
          style={{ 
            strokeDashoffset: mounted ? 0 : 100,
            transition: 'stroke-dashoffset 3s ease-out, opacity 1s ease-out'
          }}
        />
        
        {/* Flight path 2 - Sweeping curve from bottom */}
        <path
          d="M -50 900 Q 300 400 600 500 Q 900 600 1200 300 T 1500 400"
          fill="none"
          stroke="url(#pathGradient2)"
          strokeWidth="1.5"
          strokeDasharray="4 8"
          className={`transition-all duration-1000 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        />
        
        {/* Flight path 3 - Upper arc */}
        <path
          d="M 100 -50 Q 400 200 700 150 Q 1000 100 1300 250 T 1550 100"
          fill="none"
          stroke="url(#pathGradient3)"
          strokeWidth="1.5"
          strokeDasharray="6 10"
          className={`transition-all duration-1000 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Flight path 4 - Crossing path */}
        <path
          d="M 1500 700 Q 1100 300 700 450 Q 300 600 -100 300"
          fill="none"
          stroke="url(#pathGradient1)"
          strokeWidth="1"
          strokeDasharray="3 9"
          className={`transition-all duration-1000 delay-700 ${mounted ? 'opacity-60' : 'opacity-0'}`}
        />

        {/* Destination dots with glow */}
        <g filter="url(#glow)" className={`transition-opacity duration-1000 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          {/* Major destinations */}
          <circle cx="720" cy="300" r="4" fill="hsl(265 90% 65%)" className="animate-pulse" />
          <circle cx="1200" cy="300" r="3" fill="hsl(200 100% 60%)" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
          <circle cx="400" cy="150" r="3" fill="hsl(280 80% 60%)" className="animate-pulse" style={{ animationDelay: '1s' }} />
          <circle cx="600" cy="500" r="3.5" fill="hsl(200 100% 60%)" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
          <circle cx="1000" cy="200" r="2.5" fill="hsl(265 90% 65%)" className="animate-pulse" style={{ animationDelay: '0.7s' }} />
          <circle cx="300" cy="400" r="2" fill="hsl(200 100% 60%)" className="animate-pulse" style={{ animationDelay: '1.2s' }} />
          <circle cx="900" cy="450" r="2" fill="hsl(280 80% 60%)" className="animate-pulse" style={{ animationDelay: '0.9s' }} />
          <circle cx="1100" cy="550" r="2.5" fill="hsl(265 90% 65%)" className="animate-pulse" style={{ animationDelay: '0.4s' }} />
        </g>

        {/* Small airplane icons along paths */}
        <g className={`transition-opacity duration-1000 delay-1000 ${mounted ? 'opacity-70' : 'opacity-0'}`}>
          {/* Airplane 1 */}
          <g transform="translate(500, 220) rotate(25)">
            <path
              d="M0 0 L8 3 L8 4 L0 2 L-2 6 L-3 6 L-2 2 L-8 3 L-8 2 L-2 0 L-3 -4 L-2 -4 L0 0"
              fill="hsl(265 90% 70%)"
              opacity="0.8"
            />
          </g>
          
          {/* Airplane 2 */}
          <g transform="translate(950, 350) rotate(-15)">
            <path
              d="M0 0 L8 3 L8 4 L0 2 L-2 6 L-3 6 L-2 2 L-8 3 L-8 2 L-2 0 L-3 -4 L-2 -4 L0 0"
              fill="hsl(200 100% 65%)"
              opacity="0.7"
            />
          </g>
          
          {/* Airplane 3 */}
          <g transform="translate(200, 550) rotate(40)">
            <path
              d="M0 0 L6 2.5 L6 3.5 L0 1.5 L-1.5 5 L-2.5 5 L-1.5 1.5 L-6 2.5 L-6 1.5 L-1.5 0 L-2.5 -3 L-1.5 -3 L0 0"
              fill="hsl(280 80% 65%)"
              opacity="0.6"
            />
          </g>
        </g>
      </svg>

      {/* Floating destination markers */}
      <div className={`absolute top-[15%] right-[20%] transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="relative">
          <div className="w-3 h-3 bg-accent rounded-full animate-ping absolute" />
          <div className="w-3 h-3 bg-accent rounded-full relative" />
        </div>
      </div>
      
      <div className={`absolute top-[60%] left-[15%] transition-all duration-1000 delay-900 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="relative">
          <div className="w-2 h-2 bg-primary rounded-full animate-ping absolute" style={{ animationDuration: '2s' }} />
          <div className="w-2 h-2 bg-primary rounded-full relative" />
        </div>
      </div>
      
      <div className={`absolute top-[35%] right-[35%] transition-all duration-1000 delay-1100 ${mounted ? 'opacity-70 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="relative">
          <div className="w-2 h-2 bg-primary/80 rounded-full animate-ping absolute" style={{ animationDuration: '2.5s' }} />
          <div className="w-2 h-2 bg-primary/80 rounded-full relative" />
        </div>
      </div>
    </div>
  );
};

export default FlightPathsBackground;
