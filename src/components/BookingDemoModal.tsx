import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plane, Hotel, Info } from "lucide-react";
import { Link } from "react-router-dom";

interface BookingDemoModalProps {
  open: boolean;
  onClose: () => void;
  type?: "flight" | "hotel";
}

const BookingDemoModal = ({ open, onClose, type = "flight" }: BookingDemoModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Info className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">Demo Mode</DialogTitle>
        </DialogHeader>
        
        <div className="text-center space-y-4 py-4">
          <p className="text-muted-foreground">
            Live booking links launch soon. This is a demo using sample data.
          </p>
          
          <div className="bg-secondary/50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground">
              In the full version, clicking "View Deal" or "Book Now" will redirect you to our partner's booking page with real-time prices.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild variant="hero">
              <Link to="/flights" onClick={onClose} className="gap-2">
                <Plane className="w-4 h-4" />
                Search Flights
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/hotels" onClick={onClose} className="gap-2">
                <Hotel className="w-4 h-4" />
                Search Hotels
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDemoModal;
