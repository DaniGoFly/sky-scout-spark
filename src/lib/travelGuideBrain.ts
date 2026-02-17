/**
 * Local Travel Guide Intelligence System
 * Structured intent detection + contextual reply generation
 * No external API needed for basic travel guidance
 */

const CONTEXT_KEY = "gofly_travelguide_context";

export interface TravelContext {
  origin?: string;
  destination?: string;
  budget?: "low" | "mid" | "high" | "flexible";
  travelers?: number;
  travelStyle?: "family" | "solo" | "couple" | "group";
  interests?: string[];
  month?: string;
  duration?: number;
}

export type Intent =
  | "itinerary"
  | "budget"
  | "packing"
  | "safety"
  | "visa"
  | "seasonal"
  | "food"
  | "nightlife"
  | "family"
  | "cheapest_month"
  | "general"
  | "greeting";

export const SUGGESTION_CHIPS = [
  { label: "📅 3-day itinerary", prompt: "Create a 3-day itinerary" },
  { label: "💰 Budget trip", prompt: "Plan a budget-friendly trip" },
  { label: "📉 Cheapest month", prompt: "When is the cheapest month to fly?" },
  { label: "✨ Luxury", prompt: "Plan a luxury trip" },
  { label: "👨‍👩‍👧 Family-friendly", prompt: "Family-friendly trip ideas" },
  { label: "🌙 Nightlife", prompt: "Best nightlife destinations" },
];

/* ─── Intent Detection ─── */

const INTENT_PATTERNS: [RegExp, Intent][] = [
  [/itinerary|plan.*day|day.*plan|schedule|agenda/i, "itinerary"],
  [/budget|cost|how much|cheap|expensive|afford|spend/i, "budget"],
  [/pack|bring|luggage|what to wear|clothing/i, "packing"],
  [/safe|danger|scam|crime|security|precaution/i, "safety"],
  [/visa|passport|entry|requirement|document/i, "visa"],
  [/season|weather|best time|when.*go|month.*visit|cheapest month/i, "seasonal"],
  [/food|eat|restaurant|cuisine|dish|local food|street food/i, "food"],
  [/nightlife|bar|club|party|night.*out|pub/i, "nightlife"],
  [/family|kid|children|child.*friendly/i, "family"],
  [/cheapest.*month|cheap.*time|when.*cheap/i, "cheapest_month"],
  [/^(hi|hello|hey|howdy|sup|yo)\b/i, "greeting"],
];

export function detectIntent(message: string): Intent {
  for (const [pattern, intent] of INTENT_PATTERNS) {
    if (pattern.test(message)) return intent;
  }
  return "general";
}

/* ─── Context Extraction ─── */

const CITY_PATTERNS = /\b(?:to|in|visit|about|for)\s+([A-Z][a-zA-Zéèêëàâäùûüôöîïç\s-]+?)(?:\s|$|,|\.|!|\?)/;
const BUDGET_PATTERNS: [RegExp, TravelContext["budget"]][] = [
  [/budget|cheap|backpack|hostel/i, "low"],
  [/mid-?range|moderate|normal/i, "mid"],
  [/luxury|premium|high-?end|5.?star|first.?class/i, "high"],
];
const DURATION_PATTERN = /(\d+)\s*(?:day|night)/i;
const MONTH_PATTERN = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/i;

export function extractContext(message: string, existing: TravelContext): TravelContext {
  const ctx = { ...existing };

  const cityMatch = message.match(CITY_PATTERNS);
  if (cityMatch) ctx.destination = cityMatch[1].trim();

  for (const [pattern, level] of BUDGET_PATTERNS) {
    if (pattern.test(message)) { ctx.budget = level; break; }
  }

  const durMatch = message.match(DURATION_PATTERN);
  if (durMatch) ctx.duration = parseInt(durMatch[1], 10);

  const monthMatch = message.match(MONTH_PATTERN);
  if (monthMatch) ctx.month = monthMatch[1];

  if (/family|kid/i.test(message)) ctx.travelStyle = "family";
  if (/solo/i.test(message)) ctx.travelStyle = "solo";
  if (/couple|romantic/i.test(message)) ctx.travelStyle = "couple";

  return ctx;
}

/* ─── Clarifying Questions ─── */

export function generateClarifyingQuestions(intent: Intent, ctx: TravelContext): string[] {
  const qs: string[] = [];
  if (!ctx.destination && intent !== "greeting" && intent !== "general") {
    qs.push("Which destination are you interested in?");
  }
  if (intent === "itinerary" && !ctx.duration) {
    qs.push("How many days are you planning?");
  }
  if (intent === "budget" && !ctx.budget) {
    qs.push("What's your budget range: budget, mid-range, or luxury?");
  }
  return qs;
}

/* ─── Reply Generation ─── */

const SEASONAL_DATA: Record<string, { best: string; avoid: string; tip: string }> = {
  paris: { best: "April–June & September–October", avoid: "August (crowded, hot)", tip: "Spring brings cherry blossoms and fewer tourists" },
  tokyo: { best: "March–May (cherry blossoms) & October–November", avoid: "June–July (rainy season)", tip: "Book ryokans 3+ months ahead for peak seasons" },
  barcelona: { best: "May–June & September", avoid: "August (overcrowded, extreme heat)", tip: "La Mercè festival in late September is spectacular and free" },
  bali: { best: "April–October (dry season)", avoid: "January–March (heavy rain)", tip: "Ubud is cooler and less humid than the coast" },
  london: { best: "June–September", avoid: "November–February (cold, dark)", tip: "Many museums are free year-round" },
  rome: { best: "April–June & September–October", avoid: "July–August (40°C+ heat)", tip: "Visit the Vatican on Wednesday mornings during Papal audiences for unique access" },
  istanbul: { best: "April–May & September–November", avoid: "July–August (hot and humid)", tip: "Ramadan dates shift yearly — restaurants may be quieter during the day" },
  "new york": { best: "September–November (fall foliage)", avoid: "January–February (freezing)", tip: "TKTS booth in Times Square for half-price Broadway tickets" },
  dubai: { best: "November–March (pleasant weather)", avoid: "June–September (50°C+)", tip: "Friday brunch is a Dubai institution — book in advance" },
  bangkok: { best: "November–February (cool & dry)", avoid: "April (extreme heat)", tip: "Street food is safer at busy stalls with high turnover" },
};

const PACKING_LISTS: Record<string, string[]> = {
  tropical: ["Lightweight breathable clothing", "Reef-safe sunscreen SPF 50+", "Insect repellent", "Quick-dry towel", "Water shoes / sandals", "Rain jacket (compact)", "Reusable water bottle"],
  european: ["Layers (weather changes fast)", "Comfortable walking shoes", "Universal power adapter", "Compact umbrella", "Smart-casual outfit for restaurants", "Day backpack", "Photocopies of passport"],
  cold: ["Thermal base layers", "Insulated waterproof jacket", "Warm hat, gloves, scarf", "Waterproof boots", "Hand warmers", "Lip balm & moisturizer"],
  default: ["Passport & copies", "Travel insurance documents", "Medications", "Phone charger & power bank", "Comfortable walking shoes", "Weather-appropriate layers"],
};

function getPackingClimate(destination: string): string {
  const tropical = ["bali", "bangkok", "cancun", "miami", "dubai", "maldives", "singapore", "phuket"];
  const cold = ["reykjavik", "oslo", "helsinki", "stockholm", "moscow"];
  const d = destination.toLowerCase();
  if (tropical.some(c => d.includes(c))) return "tropical";
  if (cold.some(c => d.includes(c))) return "cold";
  return "european";
}

export function generateReply(intent: Intent, ctx: TravelContext): string {
  const dest = ctx.destination || "your destination";
  const destLower = dest.toLowerCase();

  switch (intent) {
    case "greeting":
      return "Hey! 👋 I'm your AI travel assistant. Tell me where you want to go and I'll help with itineraries, budget tips, packing lists, and more. Where are you dreaming of?";

    case "itinerary": {
      const days = ctx.duration || 3;
      const items: string[] = [];
      for (let d = 1; d <= days; d++) {
        if (d === 1) items.push(`**Day ${d}: Arrival & Orientation** — Check in, explore the neighborhood, enjoy a welcome dinner at a well-reviewed local restaurant.`);
        else if (d === days) items.push(`**Day ${d}: Last Day** — Visit any remaining sights, pick up souvenirs, enjoy a farewell meal.`);
        else items.push(`**Day ${d}: Explore & Discover** — Visit top landmarks, try local street food, find a hidden gem off the tourist trail.`);
      }
      return `## ${days}-Day Itinerary for ${dest}\n\n${items.join("\n\n")}\n\n💡 **Pro tip:** Book accommodations near public transport to maximize your time.`;
    }

    case "budget": {
      const budgetMap = {
        low: { daily: "$30–60", accommodation: "Hostels / budget hotels", food: "Street food & local eateries", transport: "Public transit & walking" },
        mid: { daily: "$80–150", accommodation: "3-star hotels / Airbnb", food: "Mix of local & mid-range restaurants", transport: "Ride-sharing & public transit" },
        high: { daily: "$250–500+", accommodation: "4–5 star hotels", food: "Fine dining & curated experiences", transport: "Private transfers & taxis" },
        flexible: { daily: "$80–200", accommodation: "Mix based on availability", food: "Explore everything from street stalls to nice restaurants", transport: "Whatever's most convenient" },
      };
      const b = budgetMap[ctx.budget || "flexible"];
      return `## Budget Breakdown for ${dest}\n\n💵 **Estimated daily:** ${b.daily}\n🏨 **Stay:** ${b.accommodation}\n🍽️ **Food:** ${b.food}\n🚗 **Transport:** ${b.transport}\n\n💡 Book flights 6–8 weeks ahead and use GoFlyFinder to compare prices across airlines.`;
    }

    case "packing": {
      const climate = getPackingClimate(destLower);
      const list = [...PACKING_LISTS[climate], ...PACKING_LISTS.default];
      const unique = [...new Set(list)];
      return `## Packing List for ${dest}\n\n${unique.map(i => `✅ ${i}`).join("\n")}\n\n💡 Roll your clothes instead of folding to save space and reduce wrinkles.`;
    }

    case "safety":
      return `## Safety Tips for ${dest}\n\n🔒 **General safety:**\n• Keep copies of your passport (digital + physical)\n• Register with your embassy if traveling long-term\n• Use hotel safes for valuables\n\n⚠️ **Common scams to watch for:**\n• Overly friendly strangers offering "free" tours\n• Fake taxi meters — agree on a price or use ride apps\n• Distraction theft in crowded tourist areas\n\n📱 **Stay connected:**\n• Download offline maps before arriving\n• Share your itinerary with someone at home\n• Save local emergency numbers`;

    case "visa":
      return `## Visa & Entry Info for ${dest}\n\n📋 **General guidance:**\n• Check your country's foreign affairs website for ${dest}-specific requirements\n• Many countries offer visa-on-arrival or e-visa options\n• Ensure your passport is valid for 6+ months beyond your travel dates\n\n💡 **Tip:** Some countries require proof of onward travel and sufficient funds. Always check 2-3 months before departure.`;

    case "seasonal":
    case "cheapest_month": {
      const data = SEASONAL_DATA[destLower];
      if (data) {
        return `## Best Time to Visit ${dest}\n\n🌤️ **Best months:** ${data.best}\n🚫 **Avoid:** ${data.avoid}\n💡 **Insider tip:** ${data.tip}\n\n📉 **Cheapest flights:** Usually mid-week departures in shoulder season. Use GoFlyFinder's Explore page to find the best deals.`;
      }
      return `## When to Visit ${dest}\n\n🌤️ Most destinations have a "shoulder season" (just before or after peak) with great weather and lower prices.\n\n💡 **Tips:**\n• Fly mid-week (Tue–Thu) for lower fares\n• Book 6–8 weeks ahead for the best prices\n• Use GoFlyFinder's Explore page to compare prices across months`;
    }

    case "food":
      return `## Food Guide for ${dest}\n\n🍽️ **Tips for eating well:**\n• Ask locals — hotel staff and taxi drivers know the best spots\n• Eat where locals eat, not in tourist-trap areas\n• Try the local market for authentic street food\n• Lunch menus are often 30-50% cheaper than dinner\n\n💡 **Pro tip:** Download a food app before you go. Happy Cow (vegetarian), The Fork (Europe), or Yelp can be lifesavers.`;

    case "nightlife":
      return `## Nightlife in ${dest}\n\n🌙 **General tips:**\n• Ask your hotel or hostel for current hotspot recommendations\n• Weekdays often have better deals and fewer crowds\n• Pre-game at local bars before heading to clubs\n• Keep your phone & wallet secure in crowded venues\n\n💡 **Budget tip:** Many cities have free walking tours that end at local bars — great way to meet fellow travelers!`;

    case "family":
      return `## Family Travel Tips for ${dest}\n\n👨‍👩‍👧‍👦 **Planning ahead:**\n• Book accommodations with kitchenettes to save on meals\n• Pack snacks and entertainment for transit\n• Build in rest days — kids need downtime too\n\n🎯 **Activities:**\n• Look for "skip the line" tickets at popular attractions\n• Parks and playgrounds are free and let kids burn energy\n• Many museums offer free entry for children\n\n💡 **Pro tip:** Travel during shoulder season for fewer crowds and better prices.`;

    default:
      return `I'd love to help you plan your trip to ${dest}! Here are some things I can assist with:\n\n📅 **Itineraries** — Day-by-day plans\n💰 **Budget breakdown** — Costs by category\n🧳 **Packing lists** — Climate-appropriate\n🛡️ **Safety tips** — Scams to avoid\n📋 **Visa info** — Entry requirements\n🌤️ **Best time to visit** — Seasonal advice\n\nJust ask about any of these, or tell me more about your trip!`;
  }
}

/* ─── Context Persistence ─── */

export function loadContext(): TravelContext {
  try {
    const raw = localStorage.getItem(CONTEXT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveContext(ctx: TravelContext) {
  try {
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));
  } catch { /* full */ }
}
