// ============================================================
// API Configuration
// Switches between local and production API endpoints
// ============================================================

const isDevelopment = import.meta.env.DEV

export const API_BASE_URL = isDevelopment
    ? 'http://127.0.0.1:5001'
    : 'https://api.100cr.cloud'

export const API_ENDPOINTS = {
    // AI Chat
    chat: `${API_BASE_URL}/api/ai/chat`,
    voice: `${API_BASE_URL}/api/ai/voice`,
    reset: `${API_BASE_URL}/api/ai/reset`,

    // Places & Scoring
    places: `${API_BASE_URL}/api/places`,
    fetchScoredPlaces: `${API_BASE_URL}/api/fetch-scored-places`,
    rankPlaces: `${API_BASE_URL}/api/rank-places`,
    autocomplete: `${API_BASE_URL}/api/places/autocomplete`,
    placeDetails: `${API_BASE_URL}/api/places/details`,

    // Itinerary
    buildItinerary: `${API_BASE_URL}/api/build-itinerary`,
    saveItinerary: `${API_BASE_URL}/api/save-itinerary`,
    loadItinerary: (user: string, trip: string) => `${API_BASE_URL}/api/load-itinerary/${user}/${trip}`,
    nearbyEateries: `${API_BASE_URL}/api/nearby-eateries`,
    routeMapUrl: `${API_BASE_URL}/api/route-map-url`,

    // Dashboard
    dashboardData: `${API_BASE_URL}/api/dashboard/data`,

    // Fetch new place
    fetch: `${API_BASE_URL}/api/fetch`,

    // Photo proxy
    photo: (ref: string) => `${API_BASE_URL}/api/photo/${ref}`,

    // Warmup
    warmup: `${API_BASE_URL}/api/warmup`,
}
