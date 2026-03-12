import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { LocaleProvider } from "@/hooks/useLocale";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import FlightErrorBoundary from "./components/FlightErrorBoundary";
import CookieConsent from "./components/CookieConsent";
import { HOTELS_ENABLED } from "@/lib/featureFlags";

// Eager-load Index (landing page — must be instant)
import Index from "./pages/Index";

// Lazy-load all other pages
const SavedFlights = lazy(() => import("./pages/SavedFlights"));
const Results = lazy(() => import("./pages/Results"));
const Flights = lazy(() => import("./pages/Flights"));
const LiveFlightsResults = lazy(() => import("./pages/LiveFlightsResults"));
const MultiCityResults = lazy(() => import("./pages/MultiCityResults"));
const Hotels = lazy(() => import("./pages/Hotels"));
const Explore = lazy(() => import("./pages/Explore"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Contact = lazy(() => import("./pages/Contact"));
const PriceDisclaimer = lazy(() => import("./pages/PriceDisclaimer"));
const Out = lazy(() => import("./pages/Out"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const LegalRedirect = lazy(() => import("./components/LegalRedirect"));

const queryClient = new QueryClient();

// Minimal loading fallback — keeps header visible, no blank screen
const PageFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Feature coming soon wrapper
const FeatureComingSoon = () => (
  <Suspense fallback={<PageFallback />}>
    <ComingSoon type="feature" />
  </Suspense>
);
const AuthComingSoon = () => (
  <Suspense fallback={<PageFallback />}>
    <ComingSoon type="auth" />
  </Suspense>
);

// Wrap flight pages with error boundary
const FlightsWithBoundary = () => (
  <FlightErrorBoundary>
    <Suspense fallback={<PageFallback />}>
      <Flights />
    </Suspense>
  </FlightErrorBoundary>
);

const FlightResultsWithBoundary = () => {
  const location = useLocation();
  return (
    <FlightErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <LiveFlightsResults key={location.search} />
      </Suspense>
    </FlightErrorBoundary>
  );
};

const SuspensePage = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageFallback />}>{children}</Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LocaleProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/saved" element={<SuspensePage><SavedFlights /></SuspensePage>} />
          <Route path="/results" element={<SuspensePage><Results /></SuspensePage>} />
          <Route path="/search" element={<FlightResultsWithBoundary />} />
          <Route path="/flights" element={<FlightsWithBoundary />} />
          <Route path="/flights/results" element={<FlightResultsWithBoundary />} />
          <Route path="/flights/multicity" element={<SuspensePage><MultiCityResults /></SuspensePage>} />
          <Route path="/out" element={<SuspensePage><Out /></SuspensePage>} />

          {/* Hotels — disabled when HOTELS_ENABLED is false */}
          {HOTELS_ENABLED
            ? <Route path="/hotels" element={<SuspensePage><Hotels /></SuspensePage>} />
            : <Route path="/hotels" element={<SuspensePage><ComingSoon type="feature" /></SuspensePage>} />
          }

          <Route path="/explore" element={<SuspensePage><Explore /></SuspensePage>} />
          
          {/* Removed features - show coming soon */}
          <Route path="/car-rental" element={<FeatureComingSoon />} />
          <Route path="/deals" element={<FeatureComingSoon />} />
          <Route path="/activities" element={<FeatureComingSoon />} />
          
          {/* Auth routes - no account needed */}
          <Route path="/login" element={<AuthComingSoon />} />
          <Route path="/signup" element={<AuthComingSoon />} />
          <Route path="/register" element={<AuthComingSoon />} />
          
          {/* Locale-prefixed legal pages */}
          <Route path="/:locale/:slug" element={<SuspensePage><LegalPage /></SuspensePage>} />

          {/* Legacy legal redirects → locale-prefixed */}
          <Route path="/privacy-policy" element={<SuspensePage><LegalRedirect pageId="privacy-policy" /></SuspensePage>} />
          <Route path="/cookies" element={<SuspensePage><LegalRedirect pageId="cookies" /></SuspensePage>} />
          <Route path="/terms-and-conditions" element={<SuspensePage><LegalRedirect pageId="terms-and-conditions" /></SuspensePage>} />
          <Route path="/affiliate-disclosure" element={<SuspensePage><LegalRedirect pageId="affiliate-disclosure" /></SuspensePage>} />
          <Route path="/impressum" element={<SuspensePage><LegalRedirect pageId="impressum" /></SuspensePage>} />

          <Route path="/contact" element={<SuspensePage><Contact /></SuspensePage>} />
          <Route path="/price-disclaimer" element={<SuspensePage><PriceDisclaimer /></SuspensePage>} />
          
          {/* Catch-all */}
          <Route path="*" element={<SuspensePage><NotFound /></SuspensePage>} />
        </Routes>
        <MobileBottomNav />
        <CookieConsent />
      </BrowserRouter>
    </TooltipProvider>
    </LocaleProvider>
  </QueryClientProvider>
);

export default App;
