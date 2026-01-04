export interface Hotel {
  id: number;
  name: string;
  city: string;
  country: string;
  pricePerNight: number;
  rating: number;
  reviewCount: number;
  image: string;
  images: string[];
  description: string;
  amenities: string[];
  address: string;
  starRating: number;
  featured: boolean;
}

const HOTEL_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&h=600&fit=crop",
];

const ROOM_IMAGES = [
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop",
];

const HOTEL_NAMES = [
  "Grand Plaza Hotel",
  "The Ritz Carlton",
  "Marriott Suites",
  "Hilton Garden Inn",
  "Four Seasons Resort",
  "Holiday Inn Express",
  "Hyatt Regency",
  "InterContinental",
  "Waldorf Astoria",
  "W Hotel",
  "St. Regis",
  "Mandarin Oriental",
  "The Peninsula",
  "Park Hyatt",
  "Fairmont",
  "Shangri-La",
  "Conrad",
  "JW Marriott",
  "Westin",
  "Sheraton",
];

const AMENITIES = [
  "Free WiFi",
  "Swimming Pool",
  "Fitness Center",
  "Spa & Wellness",
  "Restaurant",
  "Bar & Lounge",
  "Room Service",
  "Parking",
  "Airport Shuttle",
  "Business Center",
  "Concierge",
  "Pet Friendly",
  "Air Conditioning",
  "Breakfast Included",
  "Laundry Service",
];

const DESCRIPTIONS = [
  "Experience luxury at its finest with stunning city views and world-class amenities.",
  "A boutique hotel offering personalized service and elegant accommodations in the heart of downtown.",
  "Modern comfort meets classic elegance in this beautifully designed property.",
  "Relax in spacious rooms with premium bedding and state-of-the-art facilities.",
  "Perfect for business and leisure travelers seeking exceptional hospitality.",
  "Discover tranquility and sophistication in our award-winning establishment.",
  "Contemporary design with thoughtful amenities for the discerning traveler.",
  "Your home away from home with exceptional dining and recreational facilities.",
];

function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export function generateMockHotels(params: {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}): Hotel[] {
  const seed = params.destination.toLowerCase().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) +
               new Date(params.checkIn).getTime() % 10000;
  const random = seededRandom(seed);
  
  const numHotels = 20 + Math.floor(random() * 10);
  const hotels: Hotel[] = [];

  for (let i = 0; i < numHotels; i++) {
    const hotelName = HOTEL_NAMES[i % HOTEL_NAMES.length];
    const starRating = 3 + Math.floor(random() * 3);
    const basePrice = 80 + Math.floor(random() * 300);
    const rating = 3.5 + random() * 1.5;
    
    const numAmenities = 5 + Math.floor(random() * 8);
    const hotelAmenities: string[] = [];
    const shuffledAmenities = [...AMENITIES].sort(() => random() - 0.5);
    for (let j = 0; j < numAmenities; j++) {
      hotelAmenities.push(shuffledAmenities[j]);
    }

    const mainImage = HOTEL_IMAGES[i % HOTEL_IMAGES.length];
    const images = [
      mainImage,
      ...ROOM_IMAGES,
      HOTEL_IMAGES[(i + 1) % HOTEL_IMAGES.length],
    ];

    const hotel: Hotel = {
      id: i + 1,
      name: `${hotelName} ${params.destination}`,
      city: params.destination,
      country: "Various",
      pricePerNight: basePrice * params.rooms,
      rating: parseFloat(rating.toFixed(1)),
      reviewCount: 100 + Math.floor(random() * 2000),
      image: mainImage,
      images,
      description: DESCRIPTIONS[i % DESCRIPTIONS.length],
      amenities: hotelAmenities,
      address: `${100 + Math.floor(random() * 900)} Main Street, ${params.destination}`,
      starRating,
      featured: i < 3 || random() > 0.8,
    };

    hotels.push(hotel);
  }

  return hotels.sort((a, b) => a.pricePerNight - b.pricePerNight);
}

export function sortHotels(hotels: Hotel[], sortBy: "price" | "rating" | "recommended"): Hotel[] {
  const sorted = [...hotels];
  
  switch (sortBy) {
    case "price":
      return sorted.sort((a, b) => a.pricePerNight - b.pricePerNight);
    case "rating":
      return sorted.sort((a, b) => b.rating - a.rating);
    case "recommended":
    default:
      return sorted.sort((a, b) => {
        const aScore = (a.rating * 20) - (a.pricePerNight / 10) + (a.featured ? 50 : 0);
        const bScore = (b.rating * 20) - (b.pricePerNight / 10) + (b.featured ? 50 : 0);
        return bScore - aScore;
      });
  }
}

export function filterHotels(
  hotels: Hotel[],
  filters: {
    priceRange: [number, number];
    minRating: number;
    starRating: number[];
    amenities: string[];
  }
): Hotel[] {
  return hotels.filter((hotel) => {
    if (hotel.pricePerNight < filters.priceRange[0] || hotel.pricePerNight > filters.priceRange[1]) {
      return false;
    }

    if (hotel.rating < filters.minRating) {
      return false;
    }

    if (filters.starRating.length > 0 && !filters.starRating.includes(hotel.starRating)) {
      return false;
    }

    if (filters.amenities.length > 0) {
      const hasAllAmenities = filters.amenities.every(amenity => 
        hotel.amenities.includes(amenity)
      );
      if (!hasAllAmenities) return false;
    }

    return true;
  });
}
