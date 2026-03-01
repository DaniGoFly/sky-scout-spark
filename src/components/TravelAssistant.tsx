import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Send, Loader2, Plane, MapPin, ArrowRight, CheckCircle,
  Heart, RefreshCw, AlertTriangle, Calendar, Utensils, Lightbulb,
  Shield, DollarSign, Eye, ChevronDown, ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  detectIntent, extractContext, generateReply, generateClarifyingQuestions,
  loadContext, saveContext, SUGGESTION_CHIPS,
  type TravelContext,
} from "@/lib/travelGuideBrain";
import type { AISearchParams } from "./FlightSearchHero";

/* ───── types ───── */

interface DailyPlanDay {
  day: number;
  title: string;
  items: string[];
}

interface TravelGuide {
  summary: string;
  bestTimeToGo: string;
  dailyPlan: DailyPlanDay[];
  mustSee: string[];
  foodToTry: string[];
  localTips: string[];
  estimatedDailyBudget: string;
  safety: string;
}

interface Suggestion {
  city: string;
  country: string;
  iataCode: string;
  price: number;
  reason: string;
  isLivePrice?: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: Suggestion[];
  travelTip?: string;
  guide?: TravelGuide;
  error?: string;
}

interface TravelAssistantProps {
  onDestinationSelect?: (params: AISearchParams) => void;
  initialPrompt?: string | null;
}

/* ───── static data ───── */

const DESTINATION_IMAGES: Record<string, string> = {
  BCN: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&auto=format&fit=crop&q=80",
  LIS: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800&auto=format&fit=crop&q=80",
  ATH: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&auto=format&fit=crop&q=80",
  FCO: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&auto=format&fit=crop&q=80",
  DBV: "https://images.unsplash.com/photo-1555990793-da11153b2473?w=800&auto=format&fit=crop&q=80",
  NCE: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800&auto=format&fit=crop&q=80",
  RAK: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800&auto=format&fit=crop&q=80",
  CPT: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&auto=format&fit=crop&q=80",
  TYO: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&auto=format&fit=crop&q=80",
  BKK: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&auto=format&fit=crop&q=80",
  DPS: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80",
  SIN: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&auto=format&fit=crop&q=80",
  CUN: "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=800&auto=format&fit=crop&q=80",
  MIA: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=800&auto=format&fit=crop&q=80",
  JFK: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&auto=format&fit=crop&q=80",
  GIG: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&auto=format&fit=crop&q=80",
  SYD: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&auto=format&fit=crop&q=80",
  KEF: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=800&auto=format&fit=crop&q=80",
  PRG: "https://images.unsplash.com/photo-1541849546-216549ae216d?w=800&auto=format&fit=crop&q=80",
  VIE: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800&auto=format&fit=crop&q=80",
  AMS: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&auto=format&fit=crop&q=80",
  DXB: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&fit=crop&q=80",
  MLE: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&auto=format&fit=crop&q=80",
  CDG: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80",
  LHR: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop&q=80",
  IST: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&auto=format&fit=crop&q=80",
  MAD: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800&auto=format&fit=crop&q=80",
  BUD: "https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=800&auto=format&fit=crop&q=80",
};

const DESTINATION_VIBES: Record<string, { emoji: string; tags: string[] }> = {
  BCN: { emoji: "🏖️", tags: ["Beaches", "Nightlife", "Architecture"] },
  LIS: { emoji: "🌊", tags: ["Coastal", "Historic", "Food"] },
  ATH: { emoji: "🏛️", tags: ["Ancient History", "Islands", "Culture"] },
  FCO: { emoji: "🍝", tags: ["Art", "History", "Food"] },
  DBV: { emoji: "🏰", tags: ["Medieval", "Coastal", "Game of Thrones"] },
  NCE: { emoji: "✨", tags: ["French Riviera", "Beaches", "Luxury"] },
  RAK: { emoji: "🕌", tags: ["Exotic", "Markets", "Desert"] },
  BKK: { emoji: "🛕", tags: ["Temples", "Street Food", "Nightlife"] },
  DPS: { emoji: "🌺", tags: ["Beaches", "Temples", "Wellness"] },
  PRG: { emoji: "🍺", tags: ["Fairy-tale", "Beer", "Affordable"] },
  KEF: { emoji: "🌌", tags: ["Northern Lights", "Nature", "Adventure"] },
  DXB: { emoji: "🏙️", tags: ["Luxury", "Shopping", "Modern"] },
  TYO: { emoji: "🗼", tags: ["Culture", "Food", "Technology"] },
  JFK: { emoji: "🗽", tags: ["Iconic", "Culture", "Broadway"] },
  MIA: { emoji: "🌴", tags: ["Beaches", "Art Deco", "Nightlife"] },
  CUN: { emoji: "🏝️", tags: ["Resorts", "Ruins", "Beaches"] },
  SYD: { emoji: "🐨", tags: ["Outdoors", "Beaches", "Harbor"] },
  AMS: { emoji: "🚲", tags: ["Canals", "Museums", "Bikes"] },
  VIE: { emoji: "🎻", tags: ["Classical", "Cafes", "Elegant"] },
  MLE: { emoji: "🐠", tags: ["Paradise", "Overwater", "Diving"] },
  CDG: { emoji: "🥐", tags: ["Romance", "Art", "Fashion"] },
  CPT: { emoji: "🦁", tags: ["Safari", "Wine", "Nature"] },
  GIG: { emoji: "💃", tags: ["Carnival", "Beaches", "Mountains"] },
  SIN: { emoji: "🌃", tags: ["Food", "Gardens", "Modern"] },
  IST: { emoji: "🕌", tags: ["East meets West", "Bazaars", "History"] },
  MAD: { emoji: "🎨", tags: ["Art", "Tapas", "Nightlife"] },
  BUD: { emoji: "🛁", tags: ["Thermal Baths", "Ruin Bars", "Cheap"] },
};

const STORAGE_KEY = "gofly_travel_assistant";
const isDev = import.meta.env.DEV;

/* ───── helpers ───── */

async function callTravelAssistant(message: string, conversationHistory: { role: string; content: string }[]) {
  const { data, error } = await supabase.functions.invoke("travel-assistant", {
    body: { message, conversationHistory },
  });
  if (error) throw new Error(error.message || "Network error");
  if (data?.error) throw new Error(data.error);
  return data;
}

async function callTravelGuide(params: {
  destination: string;
  origin?: string;
  startDate?: string | null;
  endDate?: string | null;
  travelers?: number;
  budget?: string;
  interests?: string[];
}) {
  const { data, error } = await supabase.functions.invoke("travel-guide", {
    body: {
      destination: params.destination,
      origin: params.origin || "",
      startDate: params.startDate || null,
      endDate: params.endDate || null,
      travelers: params.travelers || 1,
      budget: params.budget || "flexible",
      interests: params.interests || [],
      language: "auto",
      currency: "auto",
    },
  });
  if (error) {
    const msg = error.message || "Network error";
    if (msg.includes("401") || msg.includes("403")) throw new Error("Auth headers missing or invalid");
    if (msg.includes("500")) throw new Error("Server error — check edge function logs");
    throw new Error(msg);
  }
  if (data && !data.ok) throw new Error(data.error || "Unknown error");
  return data;
}

function humanError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) return "Network error — check your connection and try again";
  if (msg.includes("429")) return "Too many requests — please wait a moment";
  if (msg.includes("401") || msg.includes("403")) return "Auth headers missing or invalid";
  if (msg.includes("500") || msg.includes("502")) return "Server error — please try again later";
  return msg;
}

/* ───── sub-components ───── */

function GuideSection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-secondary/30 border border-border/50 rounded-xl p-4 space-y-2">
      <h4 className="flex items-center gap-2 text-foreground font-semibold text-sm">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </h4>
      <div className="text-foreground/80 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function GuideDisplay({ guide }: { guide: TravelGuide }) {
  const [expandedDay, setExpandedDay] = useState<number | null>(0);

  return (
    <div className="mt-4 space-y-3">
      {guide.summary && (
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-xl px-4 py-3">
          <p className="text-foreground text-sm leading-relaxed">{guide.summary}</p>
        </div>
      )}

      {guide.dailyPlan && guide.dailyPlan.length > 0 && (
        <GuideSection icon={Calendar} title="Daily Plan">
          <div className="space-y-2">
            {guide.dailyPlan.map((day, i) => (
              <div key={i} className="bg-secondary/30 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedDay(expandedDay === i ? null : i)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-foreground font-medium text-sm">
                    Day {day.day}: {day.title}
                  </span>
                  {expandedDay === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {expandedDay === i && (
                  <ul className="px-3 pb-3 space-y-1">
                    {day.items.map((item, j) => (
                      <li key={j} className="text-foreground/70 text-sm flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </GuideSection>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {guide.bestTimeToGo && (
          <GuideSection icon={Calendar} title="Best Time to Go">
            <p>{guide.bestTimeToGo}</p>
          </GuideSection>
        )}
        {guide.estimatedDailyBudget && (
          <GuideSection icon={DollarSign} title="Daily Budget">
            <p>{guide.estimatedDailyBudget}</p>
          </GuideSection>
        )}
      </div>

      {guide.mustSee && guide.mustSee.length > 0 && (
        <GuideSection icon={Eye} title="Must See">
          <ul className="space-y-1">
            {guide.mustSee.map((item, i) => (
              <li key={i} className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>{item}</li>
            ))}
          </ul>
        </GuideSection>
      )}

      {guide.foodToTry && guide.foodToTry.length > 0 && (
        <GuideSection icon={Utensils} title="Food to Try">
          <ul className="space-y-1">
            {guide.foodToTry.map((item, i) => (
              <li key={i} className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>{item}</li>
            ))}
          </ul>
        </GuideSection>
      )}

      {guide.localTips && guide.localTips.length > 0 && (
        <GuideSection icon={Lightbulb} title="Local Tips">
          <ul className="space-y-1">
            {guide.localTips.map((item, i) => (
              <li key={i} className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>{item}</li>
            ))}
          </ul>
        </GuideSection>
      )}

      {guide.safety && (
        <GuideSection icon={Shield} title="Safety & Practical Info">
          <p>{guide.safety}</p>
        </GuideSection>
      )}
    </div>
  );
}

/* ───── Markdown-lite renderer ───── */
function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="text-foreground font-bold text-base mt-2">{line.slice(3)}</h3>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="text-foreground font-semibold text-sm">{line.slice(2, -2)}</p>;
        if (line.startsWith("• ") || line.startsWith("- ") || line.startsWith("✅ ") || line.startsWith("✅")) {
          return <p key={i} className="text-foreground/80 text-sm pl-2">{line}</p>;
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={i} className="text-foreground/80 text-sm leading-relaxed">
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**")
                ? <strong key={j} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        );
      })}
    </div>
  );
}

/* ───── main component ───── */

const TravelAssistant = ({ onDestinationSelect, initialPrompt }: TravelAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Generating your guide…");
  
  // ── DEFAULT COLLAPSED ──
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<{ body: unknown; status?: number; error?: string } | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [travelCtx, setTravelCtx] = useState<TravelContext>(loadContext);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const scrollMessagesDown = () => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollMessagesDown();
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialPrompt && !isLoading) {
      setInput(initialPrompt);
      setIsExpanded(true);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (!isLoading) return;
    const texts = ["Generating your guide…", "Checking best deals…", "Planning your itinerary…", "Almost there…"];
    let i = 0;
    const interval = setInterval(() => { i = (i + 1) % texts.length; setLoadingText(texts[i]); }, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    await sendMessage(input.trim());
  };

  const sendMessage = async (userMessage: string) => {
    setInput("");
    setIsExpanded(true);
    setRetryMessage(null);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    const intent = detectIntent(userMessage);
    const updatedCtx = extractContext(userMessage, travelCtx);
    setTravelCtx(updatedCtx);
    saveContext(updatedCtx);

    const clarifying = generateClarifyingQuestions(intent, updatedCtx);

    if (intent !== "general" || updatedCtx.destination) {
      let reply = generateReply(intent, updatedCtx);
      if (clarifying.length > 0) {
        reply += "\n\n" + clarifying.map(q => `❓ ${q}`).join("\n");
      }
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setIsLoading(false);
      return;
    }

    const requestBody = { message: userMessage };
    setLastRequest({ body: requestBody });

    try {
      const conversationHistory = messages.map((m) => ({ role: m.role, content: m.content }));
      const data = await callTravelAssistant(userMessage, conversationHistory);
      setLastRequest((prev) => (prev ? { ...prev, status: 200 } : null));
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message || "Here are my suggestions:",
          suggestions: data.suggestions,
          travelTip: data.travelTip,
        },
      ]);
    } catch (err) {
      const localReply = generateReply("general", updatedCtx);
      setMessages((prev) => [...prev, { role: "assistant", content: localReply }]);
      setLastRequest((prev) => (prev ? { ...prev, status: 0, error: humanError(err) } : null));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (!retryMessage) return;
    setMessages((prev) => prev.slice(0, -2));
    sendMessage(retryMessage);
  };

  const handleDestinationClick = (suggestion: Suggestion) => {
    if (onDestinationSelect) {
      onDestinationSelect({
        destinationCode: suggestion.iataCode,
        destinationName: `${suggestion.city} (${suggestion.iataCode})`,
      });
      setSelectedDestination(suggestion.iataCode);
      toast.success(`${suggestion.city} added to search! Now select your dates and search.`, { duration: 4000 });
      setTimeout(() => setSelectedDestination(null), 3000);
    }
  };

  const handleGenerateGuide = async (suggestion: Suggestion) => {
    setIsLoading(true);
    setLastRequest({ body: { destination: suggestion.city } });

    try {
      const result = await callTravelGuide({ destination: `${suggestion.city}, ${suggestion.country}` });
      setLastRequest((prev) => (prev ? { ...prev, status: 200 } : null));

      if (result?.ok && result.guide) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Here's your travel guide for ${suggestion.city}:`, guide: result.guide },
        ]);
      }
    } catch (err) {
      const errorMsg = humanError(err);
      setLastRequest((prev) => (prev ? { ...prev, status: 0, error: errorMsg } : null));
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const getDestinationImage = (iataCode: string) =>
    DESTINATION_IMAGES[iataCode] || "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&auto=format&fit=crop&q=80";

  const getDestinationVibes = (iataCode: string) =>
    DESTINATION_VIBES[iataCode] || { emoji: "✈️", tags: ["Travel", "Explore"] };

  /* ───── COLLAPSED STATE ───── */
  if (!isExpanded) {
    return (
      <div className="w-full mx-auto">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm hover:bg-card hover:border-primary/30 transition-all group"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex-1 text-left">
            <span className="text-sm font-semibold text-foreground">AI Travel Guide</span>
            <span className="text-xs text-muted-foreground ml-2">Ask me anything about your trip ✨</span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto">
      <div className="travelguide-shell bg-card/85 backdrop-blur-md rounded-xl border border-border overflow-hidden shadow-lg flex flex-col p-4" style={{ height: "min(65vh, 580px)" }}>
        {/* Header with collapse button */}
        <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-gradient-to-r from-primary/20 to-transparent shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-foreground font-bold text-lg">AI Travel Guide</h3>
            <p className="text-muted-foreground text-sm">Tell me your dream trip — I'll help you plan ✨</p>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Collapse"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          className="travelguide-messages flex-1 overflow-y-auto p-4 space-y-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground text-sm">Ask me anything about travel — I can help with itineraries, budgets, packing, visa info, and more!</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => { setInput(chip.prompt); }}
                    className="text-[14px] px-2.5 py-1.5 rounded-full bg-secondary/50 border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] ${msg.role === "user" ? "order-2" : ""}`}>
                {msg.error && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-2xl px-4 py-3 space-y-3">
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{msg.error}</span>
                    </div>
                    {retryMessage && idx === messages.length - 1 && (
                      <Button onClick={handleRetry} variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                        <RefreshCw className="w-3 h-3 mr-2" /> Retry
                      </Button>
                    )}
                  </div>
                )}

                {!msg.error && msg.content && (
                  <div className={`rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-secondary/50 text-foreground backdrop-blur-sm"
                  }`}>
                    {msg.role === "assistant" ? <MarkdownLite text={msg.content} /> : msg.content}
                  </div>
                )}

                {msg.guide && <GuideDisplay guide={msg.guide} />}

                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Heart className="w-3 h-3 text-destructive" />
                      <span>Click any destination to search flights, or generate a full guide</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {msg.suggestions.map((suggestion, sIdx) => {
                        const isSelected = selectedDestination === suggestion.iataCode;
                        const vibes = getDestinationVibes(suggestion.iataCode);
                        return (
                          <div
                            key={sIdx}
                            className={`group rounded-2xl overflow-hidden border-2 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                              isSelected ? "border-green-400 ring-2 ring-green-400/30" : "border-border hover:border-primary/50"
                            }`}
                            style={{ background: "linear-gradient(135deg, hsl(var(--secondary) / 0.5) 0%, hsl(var(--secondary) / 0.2) 100%)" }}
                          >
                            <div className="relative h-36 overflow-hidden cursor-pointer" onClick={() => handleDestinationClick(suggestion)}>
                              <img src={getDestinationImage(suggestion.iataCode)} alt={suggestion.city} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                              {suggestion.price > 0 && (
                                <div className="absolute top-3 right-3">
                                  <div className={`px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg flex items-center gap-1.5 ${suggestion.isLivePrice ? "bg-green-500/90 text-white" : "bg-secondary text-foreground"}`}>
                                    {suggestion.isLivePrice && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                                    <span className="font-bold text-sm">€{suggestion.price}</span>
                                  </div>
                                </div>
                              )}
                              {isSelected && (
                                <div className="absolute top-3 left-3 bg-green-500 rounded-full p-1.5 shadow-lg">
                                  <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                              )}
                              <div className="absolute bottom-3 left-3 right-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">{vibes.emoji}</span>
                                  <div>
                                    <h4 className="text-white font-bold text-lg leading-tight">{suggestion.city}</h4>
                                    <p className="text-white/70 text-xs flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />{suggestion.country}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {vibes.tags.slice(0, 3).map((tag, tIdx) => (
                                  <span key={tIdx} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground border border-border">{tag}</span>
                                ))}
                              </div>
                              <p className="text-foreground/80 text-sm leading-relaxed line-clamp-2 mb-4">{suggestion.reason}</p>
                              <div className="flex gap-2">
                                <button onClick={() => handleDestinationClick(suggestion)} className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl text-sm font-medium transition-colors ${isSelected ? "bg-green-500/20 text-green-400" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
                                  {isSelected ? <><CheckCircle className="w-4 h-4" />Added!</> : <><Plane className="w-4 h-4" />Search</>}
                                </button>
                                <button onClick={() => handleGenerateGuide(suggestion)} disabled={isLoading} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors border border-border">
                                  <Sparkles className="w-3.5 h-3.5" />Guide
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {msg.travelTip && (
                  <div className="mt-4 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-xl px-4 py-3 backdrop-blur-sm">
                    <p className="text-sm text-foreground flex items-start gap-3">
                      <span className="text-xl">💡</span>
                      <span><span className="font-semibold text-primary">Pro tip: </span>{msg.travelTip}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-secondary/50 backdrop-blur-sm rounded-2xl px-5 py-4 flex items-center gap-3 border border-border">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <div>
                  <span className="text-foreground text-sm font-medium">{loadingText}</span>
                  <p className="text-muted-foreground text-xs">This may take a few seconds</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="travelguide-inputbar p-4 border-t border-border bg-card/80 shrink-0">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Try: 'Beach trip from Berlin for under €200' ✈️"
              className="flex-1 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary h-12 text-base rounded-xl"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 h-12 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>

          {messages.length > 0 && !isLoading && (
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTION_CHIPS.slice(0, 4).map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setInput(chip.prompt)}
                  className="text-xs px-3 py-1.5 rounded-full bg-secondary/50 border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}
        </form>

        {isDev && lastRequest && (
          <div className="border-t border-yellow-500/30 bg-yellow-500/5 p-3 text-xs font-mono shrink-0">
            <p className="text-yellow-400 font-bold mb-1">🔧 Debug (dev only)</p>
            <p className="text-muted-foreground">Request: {JSON.stringify(lastRequest.body)}</p>
            <p className="text-muted-foreground">Status: {lastRequest.status ?? "pending"}</p>
            {lastRequest.error && <p className="text-destructive">Error: {lastRequest.error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelAssistant;
