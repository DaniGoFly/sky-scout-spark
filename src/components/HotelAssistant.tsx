import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Sparkles, Send, Loader2, Building2, MapPin, ArrowRight, CheckCircle, 
  Star, Heart, Bed
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Suggestion {
  city: string;
  country: string;
  reason: string;
  priceRange: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: Suggestion[];
  travelTip?: string;
}

// High-quality destination images for hotels
const DESTINATION_IMAGES: Record<string, string> = {
  "New York": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&auto=format&fit=crop&q=80",
  "Paris": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80",
  "London": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop&q=80",
  "Tokyo": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&auto=format&fit=crop&q=80",
  "Dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&fit=crop&q=80",
  "Barcelona": "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&auto=format&fit=crop&q=80",
  "Rome": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&auto=format&fit=crop&q=80",
  "Amsterdam": "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&auto=format&fit=crop&q=80",
  "Bali": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80",
  "Maldives": "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&auto=format&fit=crop&q=80",
  "Singapore": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&auto=format&fit=crop&q=80",
  "Sydney": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&auto=format&fit=crop&q=80",
};

// Destination vibes for hotels
const DESTINATION_VIBES: Record<string, { emoji: string; tags: string[] }> = {
  "New York": { emoji: "🗽", tags: ["Urban", "Culture", "Shopping"] },
  "Paris": { emoji: "🥐", tags: ["Romance", "Art", "Cafes"] },
  "London": { emoji: "🎡", tags: ["Historic", "Theatre", "Pubs"] },
  "Tokyo": { emoji: "🗼", tags: ["Modern", "Food", "Tech"] },
  "Dubai": { emoji: "🏙️", tags: ["Luxury", "Shopping", "Desert"] },
  "Barcelona": { emoji: "🏖️", tags: ["Beach", "Architecture", "Nightlife"] },
  "Rome": { emoji: "🍝", tags: ["History", "Food", "Art"] },
  "Amsterdam": { emoji: "🚲", tags: ["Canals", "Museums", "Bikes"] },
  "Bali": { emoji: "🌺", tags: ["Wellness", "Temples", "Beach"] },
  "Maldives": { emoji: "🐠", tags: ["Paradise", "Overwater", "Diving"] },
  "Singapore": { emoji: "🌃", tags: ["Gardens", "Food", "Modern"] },
  "Sydney": { emoji: "🐨", tags: ["Harbor", "Beach", "Nature"] },
};

const HotelAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsExpanded(true);
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke("travel-assistant", {
        body: { 
          message: userMessage, 
          conversationHistory,
          mode: "hotels" // Tell the assistant we're looking for hotels
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        setMessages(prev => prev.slice(0, -1));
        return;
      }

      // Transform flight suggestions to hotel-style suggestions
      const hotelSuggestions = data.suggestions?.map((s: any) => ({
        city: s.city,
        country: s.country,
        reason: s.reason,
        priceRange: `$${Math.floor(s.price * 0.8)} - $${Math.floor(s.price * 1.5)}/night`,
      }));

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          suggestions: hotelSuggestions,
          travelTip: data.travelTip,
        },
      ]);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to get a response. Please try again.");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDestinationClick = (suggestion: Suggestion) => {
    // For hotels, we'll fill in the destination input
    const destinationInput = document.querySelector('[data-hotel-search-form] input') as HTMLInputElement;
    if (destinationInput) {
      destinationInput.value = suggestion.city;
      destinationInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    setSelectedDestination(suggestion.city);
    toast.success(`${suggestion.city} selected! Now choose your dates and search.`, {
      duration: 4000,
    });
    
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setSelectedDestination(null), 3000);
  };

  const getDestinationImage = (city: string) => {
    return DESTINATION_IMAGES[city] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80";
  };

  const getDestinationVibes = (city: string) => {
    return DESTINATION_VIBES[city] || { emoji: "🏨", tags: ["Stay", "Explore"] };
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Main Card */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3 bg-gradient-to-r from-amber-500/20 to-transparent">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">AI Hotel Guide</h3>
            <p className="text-white/60 text-sm">Tell me what you're looking for — I'll find the perfect stay ✨</p>
          </div>
        </div>

        {/* Messages Area */}
        {isExpanded && messages.length > 0 && (
          <div className="max-h-[500px] overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] ${msg.role === "user" ? "order-2" : ""}`}>
                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                        : "bg-white/10 text-white backdrop-blur-sm"
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Destination Cards */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-5 space-y-4">
                      <div className="flex items-center gap-2 text-white/60 text-xs">
                        <Heart className="w-3 h-3 text-red-400" />
                        <span>Click any destination to search hotels there</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {msg.suggestions.map((suggestion, sIdx) => {
                          const isSelected = selectedDestination === suggestion.city;
                          const vibes = getDestinationVibes(suggestion.city);
                          
                          return (
                            <div
                              key={sIdx}
                              onClick={() => handleDestinationClick(suggestion)}
                              className={`group cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                                isSelected 
                                  ? "border-green-400 ring-4 ring-green-400/30 shadow-green-500/20" 
                                  : "border-white/10 hover:border-amber-500/50"
                              }`}
                              style={{
                                background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                              }}
                            >
                              {/* Large Image */}
                              <div className="relative h-36 overflow-hidden">
                                <img
                                  src={getDestinationImage(suggestion.city)}
                                  alt={suggestion.city}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                                
                                {/* Price Badge */}
                                <div className="absolute top-3 right-3">
                                  <div className="px-3 py-1.5 rounded-full bg-amber-500/90 text-white backdrop-blur-md shadow-lg flex items-center gap-1.5">
                                    <Bed className="w-3 h-3" />
                                    <span className="font-bold text-sm">{suggestion.priceRange}</span>
                                  </div>
                                </div>

                                {/* Selected Checkmark */}
                                {isSelected && (
                                  <div className="absolute top-3 left-3 bg-green-500 rounded-full p-1.5 shadow-lg">
                                    <CheckCircle className="w-4 h-4 text-white" />
                                  </div>
                                )}

                                {/* City Name Overlay */}
                                <div className="absolute bottom-3 left-3 right-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl">{vibes.emoji}</span>
                                    <div>
                                      <h4 className="text-white font-bold text-lg leading-tight">{suggestion.city}</h4>
                                      <p className="text-white/70 text-xs flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {suggestion.country}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Content */}
                              <div className="p-4">
                                {/* Tags */}
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {vibes.tags.slice(0, 3).map((tag, tIdx) => (
                                    <span 
                                      key={tIdx}
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>

                                {/* Reason */}
                                <p className="text-white/80 text-sm leading-relaxed line-clamp-2 mb-4">
                                  {suggestion.reason}
                                </p>

                                {/* Action Button */}
                                <div className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                                  isSelected 
                                    ? "bg-green-500/20" 
                                    : "bg-amber-500/10 group-hover:bg-amber-500/20"
                                }`}>
                                  <div className={`flex items-center gap-2 text-sm font-medium ${
                                    isSelected ? "text-green-400" : "text-amber-400"
                                  }`}>
                                    {isSelected ? (
                                      <>
                                        <CheckCircle className="w-4 h-4" />
                                        <span>Selected!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Building2 className="w-4 h-4" />
                                        <span>Search hotels</span>
                                      </>
                                    )}
                                  </div>
                                  <ArrowRight className={`w-4 h-4 transition-transform ${
                                    isSelected ? "text-green-400" : "text-amber-400 group-hover:translate-x-1"
                                  }`} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Travel Tip */}
                  {msg.travelTip && (
                    <div className="mt-4 bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-xl px-4 py-3 backdrop-blur-sm">
                      <p className="text-sm text-white flex items-start gap-3">
                        <span className="text-xl">💡</span>
                        <span>
                          <span className="font-semibold text-amber-400">Pro tip: </span>
                          {msg.travelTip}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-white/70">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Finding perfect hotels...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Looking for a beachfront resort in Bali? A boutique hotel in Paris?"
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-amber-500/50 focus:ring-amber-500/20"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white px-6"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HotelAssistant;
