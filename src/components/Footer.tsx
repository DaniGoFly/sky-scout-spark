import { Plane } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-secondary/50 border-t border-border py-12 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Plane className="w-4 h-4 text-primary-foreground" />
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
            <ul className="space-y-2">
              <li><Link to="/flights" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Flights</Link></li>
              <li><Link to="/hotels" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Hotels</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/contact" className="text-muted-foreground hover:text-foreground text-sm transition-colors">About</Link></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Privacy</Link></li>
              <li><Link to="/terms-and-conditions" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Terms</Link></li>
              <li><Link to="/affiliate-disclosure" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Affiliate Disclosure</Link></li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-border pt-6 mb-6">
          <p className="text-xs text-muted-foreground text-center max-w-3xl mx-auto">
            Prices shown are estimates and may change. We earn a commission when you book through our partners. This does not affect the price you pay.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2026 GoFlyFinder. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms-and-conditions" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
