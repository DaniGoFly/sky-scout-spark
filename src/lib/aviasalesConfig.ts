// Aviasales Widget Configuration
// Change these URLs to update widget behavior without modifying component code

export const AVIASALES_CONFIG = {
  // Affiliate marker for tracking
  affiliateMarker: "694224",
  
  // Search widget configuration
  search: {
    // The searchUrl parameter controls where users are redirected after clicking results
    // For White Label: change to your white-label domain (e.g., "flights.yourdomain.com/search")
    // For standard: use "www.aviasales.com/search"
    searchUrl: "www.aviasales.com%2Fsearch",
    
    // Widget customization
    currency: "usd",
    locale: "en",
    showHotels: true,
    poweredBy: true,
    
    // Colors (URL encoded)
    primaryColor: "%2332a8dd",
    buttonColor: "%2332a8dd",
    iconsColor: "%2332a8dd",
    darkColor: "%23262626",
    lightColor: "%23FFFFFF",
    secondaryColor: "%23FFFFFF",
    specialColor: "%23C4C4C4",
    focusedColor: "%2332a8dd",
    
    // Layout
    borderRadius: 0,
    plain: false,
    
    // Campaign tracking
    trs: "485833",
    promoId: "7879",
    campaignId: "100",
  },
  
  // Calendar widget configuration
  calendar: {
    searchUrl: "www.aviasales.com%2Fsearch",
    currency: "usd",
    locale: "en",
    poweredBy: true,
    oneWay: false,
    onlyDirect: false,
    period: "year",
    range: "7%2C14",
    primaryColor: "%230C73FE",
    backgroundColor: "%23ffffff",
    darkColor: "%23262626",
    lightColor: "%23FFFFFF",
    achieveColor: "%2345AD35",
    trs: "485833",
    promoId: "4041",
    campaignId: "100",
  },
  
  // Map widget configuration
  map: {
    searchHost: "www.aviasales.com%2Fsearch",
    currency: "usd",
    locale: "en",
    poweredBy: true,
    lat: "51.51",
    lng: "0.06",
    origin: "LON",
    valueMin: 0,
    valueMax: 1000000,
    roundTrip: true,
    onlyDirect: false,
    radius: 1,
    draggable: true,
    disableZoom: false,
    showLogo: false,
    scrollwheel: false,
    primaryColor: "%230C73FE",
    secondaryColor: "%233FABDB",
    lightColor: "%23FFFFFF",
    width: 800,
    height: 500,
    zoom: 2,
    trs: "485833",
    promoId: "4054",
    campaignId: "100",
  },
};

// Build the search widget URL
export function buildSearchWidgetUrl(): string {
  const c = AVIASALES_CONFIG.search;
  return `https://tpwgts.com/content?currency=${c.currency}&trs=${c.trs}&shmarker=${AVIASALES_CONFIG.affiliateMarker}&show_hotels=${c.showHotels}&powered_by=${c.poweredBy}&locale=${c.locale}&searchUrl=${c.searchUrl}&primary_override=${c.primaryColor}&color_button=${c.buttonColor}&color_icons=${c.iconsColor}&dark=${c.darkColor}&light=${c.lightColor}&secondary=${c.secondaryColor}&special=${c.specialColor}&color_focused=${c.focusedColor}&border_radius=${c.borderRadius}&plain=${c.plain}&promo_id=${c.promoId}&campaign_id=${c.campaignId}`;
}

// Build the calendar widget URL
export function buildCalendarWidgetUrl(): string {
  const c = AVIASALES_CONFIG.calendar;
  return `https://tpwgts.com/content?currency=${c.currency}&trs=${c.trs}&shmarker=${AVIASALES_CONFIG.affiliateMarker}&searchUrl=${c.searchUrl}&locale=${c.locale}&powered_by=${c.poweredBy}&one_way=${c.oneWay}&only_direct=${c.onlyDirect}&period=${c.period}&range=${c.range}&primary=${c.primaryColor}&color_background=${c.backgroundColor}&dark=${c.darkColor}&light=${c.lightColor}&achieve=${c.achieveColor}&promo_id=${c.promoId}&campaign_id=${c.campaignId}`;
}

// Build the map widget URL
export function buildMapWidgetUrl(): string {
  const c = AVIASALES_CONFIG.map;
  return `https://tpwgts.com/content?currency=${c.currency}&trs=${c.trs}&shmarker=${AVIASALES_CONFIG.affiliateMarker}&lat=${c.lat}&lng=${c.lng}&powered_by=${c.poweredBy}&search_host=${c.searchHost}&locale=${c.locale}&origin=${c.origin}&value_min=${c.valueMin}&value_max=${c.valueMax}&round_trip=${c.roundTrip}&only_direct=${c.onlyDirect}&radius=${c.radius}&draggable=${c.draggable}&disable_zoom=${c.disableZoom}&show_logo=${c.showLogo}&scrollwheel=${c.scrollwheel}&primary=${c.primaryColor}&secondary=${c.secondaryColor}&light=${c.lightColor}&width=${c.width}&height=${c.height}&zoom=${c.zoom}&promo_id=${c.promoId}&campaign_id=${c.campaignId}`;
}
