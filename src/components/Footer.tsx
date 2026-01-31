import { Plane } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-16 px-4 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      
      <div className="container mx-auto relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Plane className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-foreground">GoFlyFinder</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Compare flights and hotels from trusted travel providers.
            </p>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Products</h4>
            <ul className="space-y-3">
              <li><Link to="/flights" className="text-muted-foreground hover:text-primary text-sm transition-colors">Flights</Link></li>
              <li><Link to="/hotels" className="text-muted-foreground hover:text-primary text-sm transition-colors">Hotels</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-3">
              <li><Link to="/contact" className="text-muted-foreground hover:text-primary text-sm transition-colors">About</Link></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-primary text-sm transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><Link to="/privacy-policy" className="text-muted-foreground hover:text-primary text-sm transition-colors">Privacy</Link></li>
              <li><Link to="/terms-and-conditions" className="text-muted-foreground hover:text-primary text-sm transition-colors">Terms</Link></li>
              <li><Link to="/affiliate-disclosure" className="text-muted-foreground hover:text-primary text-sm transition-colors">Affiliate Disclosure</Link></li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-border pt-8 mb-8">
          <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto leading-relaxed">
            Prices shown are estimates and may change. We earn a commission when you book through our partners. This does not affect the price you pay.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2026 GoFlyFinder. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link to="/terms-and-conditions" className="hover:text-primary transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
