import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2, Plane, MapPin, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Suggestion {
  city: string;
  country: string;
  iataCode: string;
  price: number;
  reason: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: Suggestion[];
}

const DESTINATION_IMAGES: Record<string, string> = {
  BCN: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&auto=format&fit=crop",
  LIS: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400&auto=format&fit=crop",
  ATH: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&auto=format&fit=crop",
  FCO: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&auto=format&fit=crop",
  DBV: "https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&auto=format&fit=crop",
  NCE: "https://images.unsplash.com/photo-1491166617655-0723a0999cfc?w=400&auto=format&fit=crop",
  RAK: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=400&auto=format&fit=crop",
  CAI: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=400&auto=format&fit=crop",
  CPT: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&auto=format&fit=crop",
  TYO: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&auto=format&fit=crop",
  BKK: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&auto=format&fit=crop",
  DPS: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&auto=format&fit=crop",
  SIN: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&auto=format&fit=crop",
  CUN: "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=400&auto=format&fit=crop",
  MIA: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=400&auto=format&fit=crop",
  JFK: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&auto=format&fit=crop",
  GIG: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&auto=format&fit=crop",
  SYD: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&auto=format&fit=crop",
  KEF: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=400&auto=format&fit=crop",
  PRG: "https://images.unsplash.com/photo-1541849546-216549ae216d?w=400&auto=format&fit=crop",
  VIE: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=400&auto=format&fit=crop",
  AMS: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&auto=format&fit=crop",
  DXB: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&auto=format&fit=crop",
  MLE: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400&auto=format&fit=crop",
};

const TravelAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
      const { data, error } = await supabase.functions.invoke("travel-assistant", {
        body: { message: userMessage },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        setMessages(prev => prev.slice(0, -1));
        return;
      }

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          suggestions: data.suggestions,
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
    // Open Aviasales search in a new tab
    const searchUrl = `https://www.aviasales.com/search/${suggestion.iataCode}`;
    window.open(searchUrl, "_blank");
    toast.success(`Searching flights to ${suggestion.city}!`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      {/* Main Card */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-white font-semibold">AI Travel Assistant</h3>
            <p className="text-white/60 text-sm">Ask me anything about your next trip</p>
          </div>
        </div>

        {/* Messages Area */}
        {isExpanded && messages.length > 0 && (
          <div className="max-h-96 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] ${msg.role === "user" ? "order-2" : ""}`}>
                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Suggestion Cards */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {msg.suggestions.map((suggestion, sIdx) => (
                        <div
                          key={sIdx}
                          onClick={() => handleDestinationClick(suggestion)}
                          className="group cursor-pointer bg-white/10 rounded-xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
                        >
                          {/* Image */}
                          <div className="relative h-24 overflow-hidden">
                            <img
                              src={DESTINATION_IMAGES[suggestion.iataCode] || "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=400&auto=format&fit=crop"}
                              alt={suggestion.city}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-2 left-2 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-white/80" />
                              <span className="text-xs text-white/80">{suggestion.iataCode}</span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-white font-semibold text-sm">{suggestion.city}</h4>
                              <span className="text-primary font-bold text-sm">${suggestion.price}</span>
                            </div>
                            <p className="text-white/60 text-xs mb-2">{suggestion.country}</p>
                            <p className="text-white/70 text-xs line-clamp-2">{suggestion.reason}</p>

                            {/* Action */}
                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center gap-1 text-primary text-xs font-medium">
                                <Plane className="w-3 h-3" />
                                <span>Search flights</span>
                              </div>
                              <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-white/70 text-sm">Finding perfect destinations...</span>
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
              placeholder="Try: 'I want to go somewhere warm in Europe for under $200'"
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-primary"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {/* Example Prompts */}
          {!isExpanded && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Beach vacation under $300",
                "Cultural trip to Europe",
                "Adventure in Asia",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default TravelAssistant;
