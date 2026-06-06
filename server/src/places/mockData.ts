import type { Place } from "../itinerary/types";

/**
 * A small curated dataset standing in for the Google Places API. Each place is
 * tagged with city / state / country (used for geofencing), a price level
 * (1 budget .. 4 luxury) and tags (used for simple preference matching).
 *
 * Three destinations are covered so demos can show boundary switching:
 * Kyoto (Japan), Lisbon (Portugal) and Austin (Texas, USA).
 */
export const MOCK_PLACES: Place[] = [
  // --- Kyoto, Japan ---
  { id: "kyoto-h1", name: "Gion Ryokan Sakura", type: "hotel", city: "Kyoto", state: "Kyoto Prefecture", country: "Japan", lat: 35.003, lng: 135.778, priceLevel: 3, rating: 4.7, description: "Traditional ryokan with tatami rooms near Gion.", tags: ["traditional", "central"] },
  { id: "kyoto-h2", name: "Kyoto Budget Pods", type: "hotel", city: "Kyoto", state: "Kyoto Prefecture", country: "Japan", lat: 34.985, lng: 135.758, priceLevel: 1, rating: 4.1, description: "Clean capsule hotel near Kyoto Station.", tags: ["budget", "solo"] },
  { id: "kyoto-r1", name: "Shoraian Tofu Kaiseki", type: "restaurant", city: "Kyoto", state: "Kyoto Prefecture", country: "Japan", lat: 35.013, lng: 135.671, priceLevel: 3, rating: 4.6, description: "Riverside kaiseki specialising in tofu; many vegetarian courses.", tags: ["vegetarian", "fine-dining"] },
  { id: "kyoto-r2", name: "Nishiki Street Eats", type: "restaurant", city: "Kyoto", state: "Kyoto Prefecture", country: "Japan", lat: 35.005, lng: 135.764, priceLevel: 1, rating: 4.3, description: "Casual stalls in Nishiki Market; cheap eats and snacks.", tags: ["budget", "street-food", "vegetarian"] },
  { id: "kyoto-a1", name: "Fushimi Inari Shrine", type: "attraction", city: "Kyoto", state: "Kyoto Prefecture", country: "Japan", lat: 34.967, lng: 135.772, priceLevel: 1, rating: 4.8, description: "Thousands of vermilion torii gates winding up the mountain.", tags: ["temples", "hiking", "free"] },
  { id: "kyoto-a2", name: "Arashiyama Bamboo Grove", type: "attraction", city: "Kyoto", state: "Kyoto Prefecture", country: "Japan", lat: 35.017, lng: 135.671, priceLevel: 1, rating: 4.6, description: "Iconic towering bamboo forest paths.", tags: ["nature", "free"] },
  { id: "kyoto-a3", name: "Kinkaku-ji (Golden Pavilion)", type: "attraction", city: "Kyoto", state: "Kyoto Prefecture", country: "Japan", lat: 35.039, lng: 135.729, priceLevel: 1, rating: 4.7, description: "Zen temple covered in gold leaf beside a reflecting pond.", tags: ["temples", "culture"] },

  // --- Lisbon, Portugal ---
  { id: "lisbon-h1", name: "Alfama Boutique Stay", type: "hotel", city: "Lisbon", state: "Lisbon District", country: "Portugal", lat: 38.712, lng: -9.130, priceLevel: 3, rating: 4.5, description: "Boutique hotel in the historic Alfama quarter.", tags: ["central", "historic"] },
  { id: "lisbon-h2", name: "Baixa Backpackers", type: "hotel", city: "Lisbon", state: "Lisbon District", country: "Portugal", lat: 38.710, lng: -9.139, priceLevel: 1, rating: 4.2, description: "Friendly budget hostel in downtown Baixa.", tags: ["budget", "social"] },
  { id: "lisbon-r1", name: "Time Out Market Lisboa", type: "restaurant", city: "Lisbon", state: "Lisbon District", country: "Portugal", lat: 38.707, lng: -9.146, priceLevel: 2, rating: 4.4, description: "Food hall with dozens of Portuguese stalls, vegetarian options included.", tags: ["budget", "variety", "vegetarian"] },
  { id: "lisbon-r2", name: "Belcanto", type: "restaurant", city: "Lisbon", state: "Lisbon District", country: "Portugal", lat: 38.710, lng: -9.142, priceLevel: 4, rating: 4.8, description: "Two-Michelin-star modern Portuguese tasting menu.", tags: ["fine-dining"] },
  { id: "lisbon-a1", name: "Belem Tower", type: "attraction", city: "Lisbon", state: "Lisbon District", country: "Portugal", lat: 38.692, lng: -9.216, priceLevel: 1, rating: 4.6, description: "16th-century riverside fortification, a UNESCO site.", tags: ["history", "landmark"] },
  { id: "lisbon-a2", name: "Tram 28 Ride", type: "attraction", city: "Lisbon", state: "Lisbon District", country: "Portugal", lat: 38.715, lng: -9.131, priceLevel: 1, rating: 4.3, description: "Vintage tram route through the city's oldest neighbourhoods.", tags: ["sightseeing", "budget"] },

  // --- Austin, Texas, USA ---
  { id: "austin-h1", name: "South Congress Hotel", type: "hotel", city: "Austin", state: "Texas", country: "USA", lat: 30.249, lng: -97.749, priceLevel: 3, rating: 4.5, description: "Trendy hotel on the SoCo strip.", tags: ["central", "trendy"] },
  { id: "austin-r1", name: "Franklin Barbecue", type: "restaurant", city: "Austin", state: "Texas", country: "USA", lat: 30.270, lng: -97.731, priceLevel: 2, rating: 4.8, description: "Legendary Texas brisket; expect a queue.", tags: ["bbq", "iconic"] },
  { id: "austin-a1", name: "Lady Bird Lake Trail", type: "attraction", city: "Austin", state: "Texas", country: "USA", lat: 30.252, lng: -97.745, priceLevel: 1, rating: 4.7, description: "Scenic walking and biking loop around the lake.", tags: ["nature", "free", "outdoors"] },
];