import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Results from "./pages/Results";
import Flights from "./pages/Flights";
import LiveFlightsResults from "./pages/LiveFlightsResults";
import Hotels from "./pages/Hotels";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import AffiliateDisclosure from "./pages/AffiliateDisclosure";
import Contact from "./pages/Contact";
import PriceDisclaimer from "./pages/PriceDisclaimer";

const queryClient = new QueryClient();

// Feature coming soon wrapper
const FeatureComingSoon = () => <ComingSoon type="feature" />;
const AuthComingSoon = () => <ComingSoon type="auth" />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/results" element={<Results />} />
          <Route path="/search" element={<LiveFlightsResults />} />
          <Route path="/flights" element={<Flights />} />
          <Route path="/flights/results" element={<LiveFlightsResults />} />
          <Route path="/hotels" element={<Hotels />} />
          
          {/* Removed features - show coming soon */}
          <Route path="/car-rental" element={<FeatureComingSoon />} />
          <Route path="/deals" element={<FeatureComingSoon />} />
          <Route path="/activities" element={<FeatureComingSoon />} />
          
          {/* Auth routes - no account needed */}
          <Route path="/login" element={<AuthComingSoon />} />
          <Route path="/signup" element={<AuthComingSoon />} />
          <Route path="/register" element={<AuthComingSoon />} />
          
          {/* Legal pages */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/affiliate-disclosure" element={<AffiliateDisclosure />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/price-disclaimer" element={<PriceDisclaimer />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
