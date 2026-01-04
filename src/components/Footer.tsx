import { Plane, Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-16 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                <Plane className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">GoFlyFinder</span>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Find the best flight deals from anywhere, to everywhere.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">About Us</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">Careers</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">Press</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">Blog</a></li>
            </ul>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Products</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">Flights</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">Hotels</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">Car Rental</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">Travel Insurance</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Support</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">Help Center</a></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-primary text-sm transition-colors">Contact Us</Link></li>
              <li><Link to="/privacy-policy" className="text-muted-foreground hover:text-primary text-sm transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-and-conditions" className="text-muted-foreground hover:text-primary text-sm transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><Link to="/affiliate-disclosure" className="text-muted-foreground hover:text-primary text-sm transition-colors">Affiliate Disclosure</Link></li>
              <li><Link to="/price-disclaimer" className="text-muted-foreground hover:text-primary text-sm transition-colors">Price Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-border pt-6 pb-4 text-center">
          <p className="text-xs text-muted-foreground max-w-xl mx-auto">
            Sky-Scout may earn a commission when you book through our links. This helps keep the site free at no extra cost to you.
          </p>
        </div>

        <div className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 GoFlyFinder. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link to="/terms-and-conditions" className="hover:text-primary transition-colors">Terms</Link>
            <Link to="/affiliate-disclosure" className="hover:text-primary transition-colors">Affiliates</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
